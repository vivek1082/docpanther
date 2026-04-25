terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

# ─── Route53 Hosted Zone ─────────────────────────────────────────────────────

resource "aws_route53_zone" "main" {
  name = var.domain_name
  tags = { Name = "docpanther-zone" }
}

# ─── ACM wildcard cert in us-east-1 (required for CloudFront) ───────────────

resource "aws_acm_certificate" "wildcard_us" {
  provider          = aws.us_east_1
  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.domain_name,
    "*.${var.domain_name}",
  ]

  lifecycle { create_before_destroy = true }
  tags = { Name = "docpanther-wildcard-us-east-1" }
}

resource "aws_route53_record" "cert_validation_us" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard_us.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "wildcard_us" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.wildcard_us.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation_us : record.fqdn]
}

# ─── ACM wildcard cert in primary region (for ALB) ───────────────────────────

resource "aws_acm_certificate" "wildcard_regional" {
  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"

  subject_alternative_names = [
    var.domain_name,
    "*.${var.domain_name}",
  ]

  lifecycle { create_before_destroy = true }
  tags = { Name = "docpanther-wildcard-regional" }
}

resource "aws_route53_record" "cert_validation_regional" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard_regional.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "wildcard_regional" {
  certificate_arn         = aws_acm_certificate.wildcard_regional.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation_regional : record.fqdn]
}

# ─── Wildcard DNS → CloudFront ───────────────────────────────────────────────

resource "aws_route53_record" "wildcard" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
