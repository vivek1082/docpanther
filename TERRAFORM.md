# DocPanther — Terraform Infrastructure Guide

## What This Terraform Builds

This is **production-grade** AWS infrastructure using fully managed services — not a Docker-on-EC2 setup. Every service is serverless, auto-scaling, and zero-maintenance.

```
CloudFront (CDN + WAF)
    ↓
ALB (HTTPS, CloudFront-only access)
    ↓
ECS Fargate (Spring Boot, auto-scales 1→10 tasks)
    ↓  ↓
Aurora PostgreSQL  ElastiCache Redis
(control plane)    (control plane)
    ↓
Aurora PostgreSQL   (per pod — tenant business data)
ElastiCache Redis   (per pod — caching)

S3 (file storage, versioned, lifecycle to Glacier)
SES (email, DKIM/SPF auto-configured)
Route53 (DNS + ACM wildcard SSL)
CloudTrail (all API calls logged)
Secrets Manager (JWT, OAuth, DB creds — auto-rotated)
ECR (Docker image registry)
```

---

## Module Breakdown

| Module | What it creates | Monthly cost (staging) |
|--------|----------------|----------------------|
| `app` | VPC, subnets, NAT, ALB, WAF, CloudFront, ECR, ECS cluster + service + autoscaling | ~$75 |
| `control-plane` | VPC, Aurora PostgreSQL (cluster), ElastiCache Redis, Secrets Manager, CloudTrail | ~$70 |
| `pod` | Per-pod Aurora PostgreSQL, ElastiCache Redis, Secrets Manager with auto-rotation | ~$65 |
| `s3` | S3 bucket, encryption, versioning, lifecycle rules, CORS | ~$1 |
| `ses` | SES domain verification, DKIM, SPF, Route53 records | ~$0 |
| `dns` | Route53 hosted zone, ACM wildcard certs (regional + us-east-1) | ~$1 |

**Staging total: ~$210/month** (vs ~$30 for EC2 approach)  
**Production total: ~$280/month** at launch, scales with usage

> **Recommendation:** Use the EC2 approach (`AWS-STAGING.md`) for early staging to save ~$180/month. Use this Terraform for production or when you get your first paying customer.

---

## Cost Breakdown (Why It's Expensive)

The biggest costs:

| Service | Why expensive | Monthly |
|---------|--------------|---------|
| NAT Gateway | Fixed hourly charge ($0.045/hr) even when idle | ~$33 |
| Aurora PostgreSQL × 2 | Control plane + pod = 2 clusters, db.t3.medium | ~$60 |
| ElastiCache × 2 | Control plane + pod = 2 clusters | ~$26 |
| ALB | Fixed hourly charge | ~$20 |
| ECS Fargate | Per vCPU/memory-hour | ~$8–15 |

---

## Prerequisites

### Install tools

```bash
# Install Terraform
brew install terraform   # macOS
# Or: https://developer.hashicorp.com/terraform/install

# Install AWS CLI
brew install awscli   # macOS
# Or: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Verify
terraform --version   # should be >= 1.6
aws --version
```

### Configure AWS CLI

```bash
aws configure
# Enter:
# AWS Access Key ID:     (your IAM user key from the CSV)
# AWS Secret Access Key: (your IAM user secret)
# Default region:        ap-south-1
# Default output format: json
```

---

## Step 1 — Create the Terraform State Bucket

Terraform stores its state in S3 (the `backend "s3"` block in `main.tf`). This bucket must exist before you can run `terraform init`.

```bash
# Create the state bucket
aws s3api create-bucket \
  --bucket docpanther-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Enable versioning (so you can recover from bad applies)
aws s3api put-bucket-versioning \
  --bucket docpanther-terraform-state \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket docpanther-terraform-state \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket docpanther-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

echo "State bucket created."
```

### Create the DynamoDB lock table

Prevents two people from running `terraform apply` at the same time:

```bash
aws dynamodb create-table \
  --table-name docpanther-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1

echo "Lock table created."
```

---

## Step 2 — Create a Secrets Manager Rotation Lambda

The `rotation_lambda_arn` variable is required by the pod module (for auto-rotating DB passwords). For staging you can use AWS's pre-built one from Serverless Application Repository (SAR):

```bash
# Deploy the SAR rotation function for RDS
aws serverlessrepo create-cloud-formation-change-set \
  --application-id arn:aws:serverlessrepo:us-east-1:297356227824:applications/SecretsManagerRDSPostgreSQLRotationSingleUser \
  --stack-name docpanther-rotation-lambda \
  --parameter-overrides '[{"Name":"endpoint","Value":"https://secretsmanager.ap-south-1.amazonaws.com"}]' \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1
```

Or for staging, just disable rotation by removing the `aws_secretsmanager_secret_rotation` resource from `modules/pod/main.tf` and making `rotation_lambda_arn` optional:

```bash
# Quick fix for staging — comment out rotation in pod module
cd infra/modules/pod
```

Edit `main.tf` and comment out this block:
```hcl
# resource "aws_secretsmanager_secret_rotation" "pod_db" {
#   secret_id           = aws_secretsmanager_secret.pod_db.id
#   rotation_lambda_arn = var.rotation_lambda_arn
#   rotation_rules {
#     automatically_after_days = 30
#   }
# }
```

And in `variables.tf`, make `rotation_lambda_arn` optional:
```hcl
variable "rotation_lambda_arn" {
  type    = string
  default = ""   # add this
}
```

---

## Step 3 — Build and Push Docker Image to ECR

The ECS task pulls the backend image from ECR. You need to push it before Terraform can create the ECS service successfully.

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Create the ECR repo first (before terraform apply)
aws ecr create-repository --repository-name docpanther/backend --region $REGION 2>/dev/null || true

# Authenticate Docker to ECR
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_URL

# Build the backend image
cd /Users/vivekkumar/Documents/vivi-doc-collector/backend
docker build -t docpanther/backend:latest .

# Tag and push
docker tag docpanther/backend:latest $ECR_URL/docpanther/backend:latest
docker push $ECR_URL/docpanther/backend:latest

echo "Image pushed: $ECR_URL/docpanther/backend:latest"
```

---

## Step 4 — Initialize Terraform

```bash
cd /Users/vivekkumar/Documents/vivi-doc-collector/infra

terraform init
```

You should see: `Terraform has been successfully initialized!`

If it asks about the backend bucket not existing — go back to Step 1.

---

## Step 5 — Create a tfvars Secrets File

The sensitive variables (passwords, secrets) must NOT be committed to git. Create a local file:

```bash
cat > /Users/vivekkumar/Documents/vivi-doc-collector/infra/environments/staging.secrets.tfvars << 'EOF'
# NEVER COMMIT THIS FILE — it is in .gitignore

# Generate with: openssl rand -hex 32
jwt_secret = "paste-64-char-hex-string-here"

# Generate with: openssl rand -base64 32
cp_redis_auth_token = "strong-random-password"
pod_india_redis_auth_token = "another-strong-random-password"

# Google OAuth (from Google Cloud Console)
google_oauth_client_id = "your-google-client-id"
google_oauth_client_secret = "your-google-client-secret"

# CloudFront secret — ALB verifies this header to block direct access
# Generate with: openssl rand -hex 20
cloudfront_secret_header = "random-40-char-hex"

# ARN of rotation Lambda (see Step 2)
rotation_lambda_arn = "arn:aws:lambda:ap-south-1:ACCOUNT_ID:function:SecretsManagerRotation"
EOF

echo "Secrets file created. Fill in the values."
```

Generate the random values:
```bash
echo "jwt_secret:"; openssl rand -hex 32
echo "cp_redis_auth_token:"; openssl rand -base64 32
echo "pod_india_redis_auth_token:"; openssl rand -base64 32
echo "cloudfront_secret_header:"; openssl rand -hex 20
```

Make sure `infra/environments/*.secrets.tfvars` is in your `.gitignore` (it already is based on the existing `.gitignore`).

---

## Step 6 — Plan (Preview Changes)

Always run plan before apply — it shows you exactly what will be created:

```bash
cd /Users/vivekkumar/Documents/vivi-doc-collector/infra

terraform plan \
  -var-file="environments/staging.tfvars" \
  -var-file="environments/staging.secrets.tfvars" \
  -out=staging.plan
```

Read through the output. You should see ~60–80 resources to be created. Common things to check:
- VPC CIDRs don't conflict with anything you have
- RDS instance classes match what you want
- Domain name is correct

---

## Step 7 — Apply

```bash
terraform apply staging.plan
```

**This takes 20–35 minutes.** Aurora clusters and NAT gateways are slow to create.

Progress checkpoints:
- ~5 min: VPC, subnets, security groups done
- ~10 min: ECR, CloudWatch, IAM done
- ~15 min: ALB, CloudFront distribution done
- ~20 min: ElastiCache Redis done
- ~30 min: Aurora PostgreSQL done
- ~35 min: ECS service starts, health checks pass

When done you'll see outputs like:
```
nameservers = [
  "ns-123.awsdns-01.com",
  "ns-456.awsdns-02.net",
  ...
]
cloudfront_domain = "d1234abcdef.cloudfront.net"
ecr_repository_url = "123456789.dkr.ecr.ap-south-1.amazonaws.com/docpanther/backend"
```

---

## Step 8 — Point Your Domain to Route53

After apply, update your domain registrar to use the Route53 nameservers:

```bash
# Get the nameservers
terraform output nameservers
```

In your domain registrar (GoDaddy, Namecheap, etc.):
- Replace existing nameservers with the 4 NS records from the output
- DNS propagation: 1–48 hours

---

## Step 9 — Run Flyway Migrations

The first time, the database is empty. Run migrations manually:

```bash
# Get the RDS endpoint (sensitive output)
terraform output -raw control_plane_rds_endpoint

# Connect and run Flyway via the backend JAR (from within the VPC — use SSM Session Manager or a bastion)
# Or run migrations locally pointing at the RDS endpoint:
cd /Users/vivekkumar/Documents/vivi-doc-collector/backend

# Get DB creds from Secrets Manager
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id docpanther-control-plane \
  --query SecretString --output text)
DB_PASS=$(echo $DB_SECRET | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['password'])")
DB_HOST=$(terraform -chdir=../infra output -raw control_plane_rds_endpoint)

mvn flyway:migrate \
  -Dflyway.url=jdbc:postgresql://${DB_HOST}/docpanther_control \
  -Dflyway.user=docpanther_admin \
  -Dflyway.password=$DB_PASS
```

> Note: RDS is in a private subnet (no public access). You'll need to either:
> - Run from a bastion EC2 in the same VPC
> - Use RDS Proxy with IAM auth
> - Temporarily allow your IP in the RDS security group for initial setup

**Easier option for staging:** Add a temporary ingress rule to the RDS security group allowing your IP on port 5432, run migrations, then remove it.

---

## Step 10 — Update ECS Service with Correct Environment Variables

The ECS task definition reads secrets from Secrets Manager. You need to add the DB connection secrets there:

```bash
# Update the ECS task definition with DB connection info
aws ecs update-service \
  --cluster docpanther-ap-south-1 \
  --service docpanther-ap-south-1 \
  --force-new-deployment \
  --region ap-south-1
```

---

## Updating the App (CI/CD Flow)

After making code changes, the deployment flow is:

```bash
# 1. Build new image
docker build -t docpanther/backend:v1.2.3 ./backend

# 2. Push to ECR
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $ECR_URL
docker tag docpanther/backend:v1.2.3 $ECR_URL/docpanther/backend:v1.2.3
docker push $ECR_URL/docpanther/backend:v1.2.3

# 3. Update task definition with new image tag and force new deployment
terraform apply \
  -var-file="environments/staging.tfvars" \
  -var-file="environments/staging.secrets.tfvars" \
  -var="image_tag=v1.2.3"
```

ECS does a rolling deployment — zero downtime if `desired_count >= 2`.

---

## Adding a New Pod (Multi-Region)

When you want to onboard tenants in a new region, add a pod module in `main.tf`:

```hcl
module "pod_us_shared" {
  source = "./modules/pod"

  pod_id                = "us-shared-1"
  vpc_id                = module.app_us.vpc_id           # if you add a US app module
  private_subnet_ids    = module.app_us.private_subnet_ids
  app_security_group_id = module.app_us.ecs_security_group_id
  db_instance_class     = "db.t3.medium"
  dedicated             = false
  redis_node_type       = "cache.t3.micro"
  redis_auth_token      = var.pod_us_redis_auth_token
  rotation_lambda_arn   = var.rotation_lambda_arn
}
```

Then apply, get the new RDS endpoint, and register it in the DocPanther SuperAdmin portal (Pods → Provision Pod) with the db_url from the Terraform output.

---

## Destroying Staging (Save Cost)

When done with a staging session:

```bash
cd infra

# Preview what will be destroyed
terraform plan -destroy \
  -var-file="environments/staging.tfvars" \
  -var-file="environments/staging.secrets.tfvars"

# Destroy everything
terraform destroy \
  -var-file="environments/staging.tfvars" \
  -var-file="environments/staging.secrets.tfvars"
```

> ⚠️ This deletes all databases. Take a manual RDS snapshot first if you have real data:
> ```bash
> aws rds create-db-cluster-snapshot \
>   --db-cluster-identifier docpanther-control-plane \
>   --db-cluster-snapshot-identifier staging-backup-$(date +%Y%m%d)
> ```

---

## Terraform State Commands (Useful for Recovery)

```bash
# See all resources Terraform manages
terraform state list

# Show details of one resource
terraform state show module.control_plane.aws_rds_cluster.control_plane

# Remove a resource from state without deleting it (if you want to stop managing it)
terraform state rm module.app_india.aws_ecs_service.app

# Import an existing resource into Terraform state
terraform import module.s3_india.aws_s3_bucket.documents docpanther-ap-south-1
```

---

## Recommended Path: EC2 First, Then Terraform

| Stage | Infrastructure | Monthly Cost |
|-------|---------------|-------------|
| Now (building/testing) | EC2 t3.medium + Docker Compose (`AWS-STAGING.md`) | ~$30 |
| First 10 customers | Same EC2, upgrade to t3.large if needed | ~$60 |
| First paying enterprise customer | Terraform staging → test full infra | ~$210 |
| Production | Terraform prod | ~$280+ |

The Terraform is ready to use when you need it. The EC2 approach shares the same app code and database schema — migrating later is just: take RDS snapshot → restore into Aurora, push image to ECR, run `terraform apply`.
