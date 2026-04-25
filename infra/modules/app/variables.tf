variable "region_name" {
  type        = string
  description = "Short region name used in resource names (e.g. ap-south-1)"
}

variable "aws_region" {
  type        = string
  description = "AWS region code"
}

variable "vpc_cidr" {
  type    = string
  default = "10.1.0.0/16"
}

variable "domain_name" {
  type    = string
  default = "docpanther.com"
}

variable "acm_certificate_arn" {
  type        = string
  description = "Regional ACM cert ARN for ALB"
}

variable "acm_certificate_arn_us_east_1" {
  type        = string
  description = "us-east-1 ACM cert ARN for CloudFront"
}

variable "cloudfront_secret_header" {
  type      = string
  sensitive = true
  description = "Shared secret between CloudFront and ALB to prevent direct ALB access"
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "spring_profile" {
  type    = string
  default = "prod"
}

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

variable "jwt_secret_arn" {
  type      = string
  sensitive = true
}

variable "cp_db_secret_arn" {
  type      = string
  sensitive = true
}

variable "secret_arns" {
  type        = list(string)
  description = "All Secrets Manager ARNs the task needs to read"
}
