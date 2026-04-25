output "rds_endpoint" {
  value = aws_rds_cluster.pod.endpoint
}

output "rds_reader_endpoint" {
  value = aws_rds_cluster.pod.reader_endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.pod.primary_endpoint_address
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.pod_db.arn
}
