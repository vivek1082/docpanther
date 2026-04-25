# ─── Global ──────────────────────────────────────────────────────────────────

variable "primary_region" {
  type    = string
  default = "ap-south-1"
}

variable "domain_name" {
  type    = string
  default = "docpanther.com"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "spring_profile" {
  type    = string
  default = "prod"
}

# ─── Networking ──────────────────────────────────────────────────────────────

variable "control_plane_vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "india_vpc_cidr" {
  type    = string
  default = "10.1.0.0/16"
}

# ─── ECS Fargate ─────────────────────────────────────────────────────────────

variable "task_cpu" {
  type    = number
  default = 1024
}

variable "task_memory" {
  type    = number
  default = 2048
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "min_capacity" {
  type    = number
  default = 1
}

variable "max_capacity" {
  type    = number
  default = 10
}

# ─── Control Plane DB ────────────────────────────────────────────────────────

variable "cp_db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "cp_multi_az" {
  type    = bool
  default = false
}

variable "cp_redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

# ─── Pod DB ──────────────────────────────────────────────────────────────────

variable "pod_db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "pod_redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

# ─── Secrets (never hardcoded — set in tfvars or env vars, never committed) ──

variable "cp_redis_auth_token" {
  type      = string
  sensitive = true
}

variable "pod_india_redis_auth_token" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "google_oauth_client_id" {
  type      = string
  sensitive = true
}

variable "google_oauth_client_secret" {
  type      = string
  sensitive = true
}

variable "cloudfront_secret_header" {
  type      = string
  sensitive = true
  description = "Shared secret injected by CloudFront; ALB verifies this header to block direct access"
}

variable "rotation_lambda_arn" {
  type        = string
  description = "ARN of Secrets Manager rotation Lambda for pod DB passwords"
}
