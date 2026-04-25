# ─── staging.tfvars ──────────────────────────────────────────────────────────
# Lighter config — single-task, smallest instances, no deletion protection overrides.

primary_region = "ap-south-1"
domain_name    = "staging.docpanther.com"
spring_profile = "staging"
image_tag      = "latest"

# VPC — separate CIDR blocks to allow VPC peering to prod if ever needed
control_plane_vpc_cidr = "10.10.0.0/16"
india_vpc_cidr         = "10.11.0.0/16"

# ECS — minimal footprint
task_cpu      = 512
task_memory   = 1024
desired_count = 1
min_capacity  = 1
max_capacity  = 3

# Control plane DB — smallest viable
cp_db_instance_class = "db.t3.medium"
cp_multi_az          = false
cp_redis_node_type   = "cache.t3.micro"

# Pod DB
pod_db_instance_class = "db.t3.medium"
pod_redis_node_type   = "cache.t3.micro"
