variable "domain_name" {
  type    = string
  default = "docpanther.com"
}

variable "cloudfront_domain_name" {
  type        = string
  description = "CloudFront distribution domain name"
}

variable "cloudfront_hosted_zone_id" {
  type        = string
  description = "CloudFront hosted zone ID (always Z2FDTNDATAQYW2)"
  default     = "Z2FDTNDATAQYW2"
}
