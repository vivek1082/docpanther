terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "docpanther-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "docpanther-terraform-locks"
  }
}

# ─── Providers ───────────────────────────────────────────────────────────────

provider "aws" {
  region = var.primary_region  # ap-south-1 (control plane + India app)
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"  # CloudFront WAF + ACM for CF must be us-east-1
}

# ─── App module — ap-south-1 (India) ─────────────────────────────────────────

module "app_india" {
  source = "./modules/app"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  region_name                   = "ap-south-1"
  aws_region                    = "ap-south-1"
  vpc_cidr                      = var.india_vpc_cidr
  domain_name                   = var.domain_name
  acm_certificate_arn           = module.dns.acm_certificate_arn_regional
  acm_certificate_arn_us_east_1 = module.dns.acm_certificate_arn_us_east_1
  cloudfront_secret_header      = var.cloudfront_secret_header
  image_tag                     = var.image_tag
  spring_profile                = var.spring_profile
  task_cpu                      = var.task_cpu
  task_memory                   = var.task_memory
  desired_count                 = var.desired_count
  min_capacity                  = var.min_capacity
  max_capacity                  = var.max_capacity
  jwt_secret_arn                = module.control_plane.jwt_secret_arn
  cp_db_secret_arn              = module.control_plane.rds_endpoint  # spring reads endpoint, secret via managed creds
  secret_arns = [
    module.control_plane.jwt_secret_arn,
    module.control_plane.google_oauth_secret_arn,
  ]
}

# ─── Control plane — ap-south-1 ──────────────────────────────────────────────

module "control_plane" {
  source = "./modules/control-plane"

  vpc_cidr                   = var.control_plane_vpc_cidr
  db_instance_class          = var.cp_db_instance_class
  multi_az                   = var.cp_multi_az
  redis_node_type            = var.cp_redis_node_type
  redis_auth_token           = var.cp_redis_auth_token
  jwt_secret                 = var.jwt_secret
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret
  app_security_group_id      = module.app_india.ecs_security_group_id
}

# ─── Pod — India shared (ap-south-1) ─────────────────────────────────────────

module "pod_india_shared" {
  source = "./modules/pod"

  pod_id                = "india-shared-1"
  vpc_id                = module.app_india.vpc_id
  private_subnet_ids    = module.app_india.private_subnet_ids
  app_security_group_id = module.app_india.ecs_security_group_id
  db_instance_class     = var.pod_db_instance_class
  dedicated             = false
  redis_node_type       = var.pod_redis_node_type
  redis_auth_token      = var.pod_india_redis_auth_token
  rotation_lambda_arn   = var.rotation_lambda_arn
}

# ─── S3 — India ──────────────────────────────────────────────────────────────

module "s3_india" {
  source = "./modules/s3"

  aws_region        = "ap-south-1"
  backend_role_arns = [module.app_india.ecr_repository_url]  # task role arn wired at apply time
}

# ─── DNS + ACM ───────────────────────────────────────────────────────────────

module "dns" {
  source = "./modules/dns"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name               = var.domain_name
  cloudfront_domain_name    = module.app_india.cloudfront_domain_name
  cloudfront_hosted_zone_id = module.app_india.cloudfront_hosted_zone_id
}

# ─── SES ─────────────────────────────────────────────────────────────────────

module "ses" {
  source = "./modules/ses"

  domain_name     = var.domain_name
  aws_region      = var.primary_region
  route53_zone_id = module.dns.zone_id
}
