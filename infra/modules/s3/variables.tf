variable "aws_region" {
  type        = string
  description = "AWS region for bucket name (e.g. ap-south-1)"
}

variable "backend_role_arns" {
  type        = list(string)
  description = "IAM role ARNs of ECS task roles allowed to access this bucket"
}
