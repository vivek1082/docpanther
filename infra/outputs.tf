output "nameservers" {
  description = "Point your registrar at these NS records"
  value       = module.dns.name_servers
}

output "cloudfront_domain" {
  value = module.app_india.cloudfront_domain_name
}

output "alb_dns_india" {
  value = module.app_india.alb_dns_name
}

output "ecr_repository_url" {
  value = module.app_india.ecr_repository_url
}

output "control_plane_rds_endpoint" {
  value     = module.control_plane.rds_endpoint
  sensitive = true
}

output "pod_india_rds_endpoint" {
  value     = module.pod_india_shared.rds_endpoint
  sensitive = true
}

output "pod_india_redis_endpoint" {
  value     = module.pod_india_shared.redis_endpoint
  sensitive = true
}
