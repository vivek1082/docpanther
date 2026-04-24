# CLAUDE.md — infra-agent (Terraform)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Terraform (HCL)
- AWS provider
- Targets: ECS Fargate, RDS Aurora PostgreSQL, ElastiCache Redis, S3, CloudFront, WAF, ALB, Route53, ACM, SES, Secrets Manager

## Run
```bash
terraform init
terraform plan  -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Directory layout
```
infra/
├── modules/
│   ├── control-plane/   → control plane RDS Aurora + Redis (India, always)
│   ├── pod/             → reusable pod module (RDS + Redis per region)
│   ├── app/             → ECS Fargate, ALB, CloudFront, WAF (per region)
│   ├── s3/              → S3 bucket + bucket policy per region
│   ├── ses/             → SES domain verification, DKIM
│   └── dns/             → Route53 wildcard record + ACM cert
├── environments/
│   ├── prod.tfvars
│   └── staging.tfvars
└── main.tf
```

## Resources to create

### Global (us-east-1 for CloudFront, ap-south-1 for control plane)
- Route53 hosted zone for `docpanther.com`
- ACM wildcard cert `*.docpanther.com` (must be in us-east-1 for CloudFront)
- CloudFront distribution with WAF WebACL attached
- WAF WebACL: rate limit (2000 req/5min per IP), AWS managed rules (SQLi, XSS)

### Control plane (ap-south-1)
- RDS Aurora PostgreSQL (db.t3.medium, single-AZ initially, Multi-AZ for prod)
- ElastiCache Redis (cache.t3.micro initially)
- Secrets Manager secrets: DB creds, JWT secret, Google OAuth creds

### Per pod (parameterised module)
- RDS Aurora PostgreSQL
- ElastiCache Redis
- Secrets Manager secret for pod DB creds

### Per region app
- VPC with private subnets (backend + DB) and public subnet (ALB)
- ALB with security group: only accept CloudFront IPs
- ECS Fargate cluster + task definition (Spring Boot image from ECR)
- ECR repository for the backend Docker image
- ECS service with auto-scaling (CPU > 70% → scale out)

### S3 (per region)
- Bucket: `docpanther-{region}`
- Bucket policy: only accessible from backend IAM role (no public access)
- CORS: allow PUT from browser (for presigned uploads)
- Lifecycle: move objects > 1 year to S3-IA, > 3 years to Glacier

## Security requirements
- ALB security group ONLY accepts traffic from CloudFront managed prefix list
- All RDS and Redis in private subnets — no public endpoint
- S3 bucket: `BlockPublicAcls = true`, `BlockPublicPolicy = true`
- Secrets Manager rotation enabled for DB passwords
- CloudTrail enabled for all regions
- VPC Flow Logs enabled

## Do NOT
- Create any public S3 buckets
- Open port 22 (SSH) on any security group
- Hardcode credentials — use Secrets Manager references
- Skip encryption: RDS `storage_encrypted = true`, S3 `server_side_encryption_configuration`
