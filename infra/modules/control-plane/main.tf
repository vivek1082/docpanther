terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# ─── VPC ────────────────────────────────────────────────────────────────────

resource "aws_vpc" "control_plane" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "docpanther-control-plane" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.control_plane.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "docpanther-cp-private-${count.index}" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.control_plane.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false
  tags = { Name = "docpanther-cp-public-${count.index}" }
}

data "aws_availability_zones" "available" { state = "available" }

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.control_plane.id
  tags   = { Name = "docpanther-cp-igw" }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "docpanther-cp-nat" }
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.control_plane.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
  tags = { Name = "docpanther-cp-private-rt" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.control_plane.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "docpanther-cp-public-rt" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_flow_log" "vpc" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.control_plane.id
}

resource "aws_cloudwatch_log_group" "flow_log" {
  name              = "/aws/vpc/docpanther-control-plane"
  retention_in_days = 30
}

resource "aws_iam_role" "flow_log" {
  name = "docpanther-cp-flow-log-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "flow_log" {
  role = aws_iam_role.flow_log.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup", "logs:CreateLogStream",
        "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"
      ]
      Resource = "*"
    }]
  })
}

# ─── Security Groups ─────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "docpanther-cp-rds"
  description = "Control plane RDS — no public access"
  vpc_id      = aws_vpc.control_plane.id

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

  tags = { Name = "docpanther-cp-rds-sg" }
}

resource "aws_security_group" "redis" {
  name        = "docpanther-cp-redis"
  description = "Control plane Redis — no public access"
  vpc_id      = aws_vpc.control_plane.id

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

  tags = { Name = "docpanther-cp-redis-sg" }
}

# ─── RDS Aurora PostgreSQL ───────────────────────────────────────────────────

resource "aws_db_subnet_group" "control_plane" {
  name       = "docpanther-control-plane"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "docpanther-cp-db-subnet-group" }
}

resource "aws_rds_cluster" "control_plane" {
  cluster_identifier      = "docpanther-control-plane"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "docpanther_control"
  master_username         = "docpanther_admin"
  manage_master_user_password = true
  db_subnet_group_name    = aws_db_subnet_group.control_plane.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  storage_encrypted       = true
  deletion_protection     = true
  backup_retention_period = 7
  preferred_backup_window = "02:00-04:00"
  skip_final_snapshot     = false
  final_snapshot_identifier = "docpanther-cp-final-snapshot"

  tags = { Name = "docpanther-control-plane" }
}

resource "aws_rds_cluster_instance" "control_plane" {
  count              = var.multi_az ? 2 : 1
  identifier         = "docpanther-cp-${count.index}"
  cluster_identifier = aws_rds_cluster.control_plane.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.control_plane.engine
  engine_version     = aws_rds_cluster.control_plane.engine_version

  publicly_accessible  = false
  db_subnet_group_name = aws_db_subnet_group.control_plane.name

  tags = { Name = "docpanther-cp-${count.index}" }
}

# ─── ElastiCache Redis ───────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "control_plane" {
  name       = "docpanther-control-plane"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "control_plane" {
  replication_group_id = "docpanther-cp-redis"
  description          = "DocPanther control plane Redis"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.control_plane.name
  security_group_ids   = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  automatic_failover_enabled = false

  tags = { Name = "docpanther-cp-redis" }
}

# ─── Secrets Manager ─────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "docpanther/jwt-secret"
  recovery_window_in_days = 7
  tags                    = { Name = "docpanther-jwt-secret" }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = jsonencode({ secret = var.jwt_secret })
}

resource "aws_secretsmanager_secret" "google_oauth" {
  name                    = "docpanther/google-oauth"
  recovery_window_in_days = 7
  tags                    = { Name = "docpanther-google-oauth" }
}

resource "aws_secretsmanager_secret_version" "google_oauth" {
  secret_id = aws_secretsmanager_secret.google_oauth.id
  secret_string = jsonencode({
    client_id     = var.google_oauth_client_id
    client_secret = var.google_oauth_client_secret
  })
}

# ─── CloudTrail ──────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "docpanther-cloudtrail-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
  tags          = { Name = "docpanther-cloudtrail" }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket                  = aws_s3_bucket.cloudtrail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id
  policy = data.aws_iam_policy_document.cloudtrail_bucket.json
}

data "aws_iam_policy_document" "cloudtrail_bucket" {
  statement {
    sid    = "AWSCloudTrailAclCheck"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions   = ["s3:GetBucketAcl"]
    resources = [aws_s3_bucket.cloudtrail.arn]
  }
  statement {
    sid    = "AWSCloudTrailWrite"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.cloudtrail.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"]
    condition {
      test     = "StringEquals"
      variable = "s3:x-amz-acl"
      values   = ["bucket-owner-full-control"]
    }
  }
}

resource "aws_cloudtrail" "main" {
  name                          = "docpanther-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  tags                          = { Name = "docpanther-cloudtrail" }
}

data "aws_caller_identity" "current" {}
