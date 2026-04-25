output "vpc_id" {
  value = aws_vpc.control_plane.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "rds_endpoint" {
  value = aws_rds_cluster.control_plane.endpoint
}

output "rds_reader_endpoint" {
  value = aws_rds_cluster.control_plane.reader_endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.control_plane.primary_endpoint_address
}

output "jwt_secret_arn" {
  value = aws_secretsmanager_secret.jwt_secret.arn
}

output "google_oauth_secret_arn" {
  value = aws_secretsmanager_secret.google_oauth.arn
}
