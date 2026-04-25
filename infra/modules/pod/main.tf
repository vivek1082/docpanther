terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# ─── RDS Aurora PostgreSQL ───────────────────────────────────────────────────

resource "aws_db_subnet_group" "pod" {
  name       = "docpanther-pod-${var.pod_id}"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "docpanther-pod-${var.pod_id}" }
}

resource "aws_security_group" "rds" {
  name        = "docpanther-pod-${var.pod_id}-rds"
  description = "Pod ${var.pod_id} RDS — private only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "ECS tasks only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "docpanther-pod-${var.pod_id}-rds-sg" }
}

resource "aws_rds_cluster" "pod" {
  cluster_identifier          = "docpanther-pod-${var.pod_id}"
  engine                      = "aurora-postgresql"
  engine_version              = "15.4"
  database_name               = "docpanther_pod"
  master_username             = "docpanther_pod"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.pod.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  storage_encrypted           = true
  deletion_protection         = true
  backup_retention_period     = 7
  preferred_backup_window     = "02:00-04:00"
  skip_final_snapshot         = false
  final_snapshot_identifier   = "docpanther-pod-${var.pod_id}-final"

  tags = { Name = "docpanther-pod-${var.pod_id}" }
}

resource "aws_rds_cluster_instance" "pod" {
  count              = var.dedicated ? 2 : 1
  identifier         = "docpanther-pod-${var.pod_id}-${count.index}"
  cluster_identifier = aws_rds_cluster.pod.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.pod.engine
  engine_version     = aws_rds_cluster.pod.engine_version

  publicly_accessible  = false
  db_subnet_group_name = aws_db_subnet_group.pod.name

  tags = { Name = "docpanther-pod-${var.pod_id}-${count.index}" }
}

# ─── ElastiCache Redis ───────────────────────────────────────────────────────

resource "aws_security_group" "redis" {
  name        = "docpanther-pod-${var.pod_id}-redis"
  description = "Pod ${var.pod_id} Redis — private only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.app_security_group_id]
    description     = "ECS tasks only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "docpanther-pod-${var.pod_id}-redis-sg" }
}

resource "aws_elasticache_subnet_group" "pod" {
  name       = "docpanther-pod-${var.pod_id}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "pod" {
  replication_group_id       = "docpanther-pod-${var.pod_id}"
  description                = "DocPanther pod ${var.pod_id} Redis"
  node_type                  = var.redis_node_type
  num_cache_clusters         = 1
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.pod.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  automatic_failover_enabled = false

  tags = { Name = "docpanther-pod-${var.pod_id}-redis" }
}

# ─── Secrets Manager — pod DB creds ─────────────────────────────────────────

resource "aws_secretsmanager_secret" "pod_db" {
  name                    = "docpanther/pods/${var.pod_id}/db"
  recovery_window_in_days = 7
  tags                    = { Name = "docpanther-pod-${var.pod_id}-db" }
}

resource "aws_secretsmanager_secret_rotation" "pod_db" {
  count               = var.rotation_lambda_arn != "" ? 1 : 0
  secret_id           = aws_secretsmanager_secret.pod_db.id
  rotation_lambda_arn = var.rotation_lambda_arn
  rotation_rules {
    automatically_after_days = 30
  }
}
