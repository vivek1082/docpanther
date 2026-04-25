# ─── prod.tfvars ─────────────────────────────────────────────────────────────
# All sensitive values (redis_auth_token, jwt_secret, oauth creds) are injected
# at apply time via env vars:  TF_VAR_jwt_secret, TF_VAR_google_oauth_client_id, etc.
# Do NOT commit secrets to this file.

primary_region = "ap-south-1"
domain_name    = "docpanther.com"
spring_profile = "prod"
image_tag      = "latest"

# VPC
control_plane_vpc_cidr = "10.0.0.0/16"
india_vpc_cidr         = "10.1.0.0/16"

# ECS
task_cpu      = 1024
task_memory   = 2048
desired_count = 2
min_capacity  = 1
max_capacity  = 10

# Control plane DB
cp_db_instance_class = "db.t3.medium"
cp_multi_az          = false          # set true when first enterprise customer signs
cp_redis_node_type   = "cache.t3.micro"

# Pod DB
pod_db_instance_class = "db.t3.medium"
pod_redis_node_type   = "cache.t3.micro"

# Rotation Lambda — deploy this separately via SAR or custom Lambda
# rotation_lambda_arn = "arn:aws:lambda:ap-south-1:ACCOUNT_ID:function:SecretsManagerRotation"
