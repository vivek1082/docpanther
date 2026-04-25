variable "pod_id" {
  type        = string
  description = "Unique identifier for this pod (e.g. india-shared-1)"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "app_security_group_id" {
  type        = string
  description = "Security group of ECS tasks"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "dedicated" {
  type        = bool
  default     = false
  description = "true = 2 instances (dedicated pod); false = 1 instance (shared pod)"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}

variable "rotation_lambda_arn" {
  type        = string
  default     = ""
  description = "ARN of the Secrets Manager rotation Lambda. Empty string disables auto-rotation."
}
