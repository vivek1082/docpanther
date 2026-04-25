output "zone_id" {
  value = aws_route53_zone.main.zone_id
}

output "name_servers" {
  value = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn_us_east_1" {
  value = aws_acm_certificate_validation.wildcard_us.certificate_arn
}

output "acm_certificate_arn_regional" {
  value = aws_acm_certificate_validation.wildcard_regional.certificate_arn
}
