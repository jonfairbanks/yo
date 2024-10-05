/* ------------------------- */
/* Terraform Providers       */
/* ------------------------- */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.47.0"
    }
  }
  backend "s3" {
    bucket = "yo-api-state-${var.environment}"              # This will be changed as part of terraform init
    key    = "default/terraform.tfstate" # This will be changed as part of terraform init
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

/* ------------------------- */
/* Lambda Role           */
/* ------------------------- */

resource "aws_iam_role" "yo-api-lambda-role" {
  name = "yo-api-lambda-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    environment = "${var.environment}"
    service     = "yo-api"
  }
}

/* ------------------------- */
/* Lambda Function           */
/* ------------------------- */

resource "aws_lambda_function" "yo-api-lambda" {
  filename      = "../server/dist/yo-api-${var.lambdasVersion}.zip"
  function_name = "yo-api-lambda-${var.environment}"
  role          = aws_iam_role.yo-api-lambda-role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 128
  timeout       = 300

  description = "yo-api:${var.environment}"

  tags = {
    environment = "${var.environment}"
    service     = "yo-api"
  }
}

resource "aws_lambda_function_url" "yo-api-lambda-function-url" {
  function_name      = aws_lambda_function.yo-api-lambda.id
  authorization_type = "NONE"
  cors {
    allow_origins = ["*"]
  }
}

/* ------------------------- */
/* CloudWatch Log Group      */
/* ------------------------- */

resource "aws_cloudwatch_log_group" "yo-api-loggroup" {
  name              = "/aws/lambda/${aws_lambda_function.yo-api-lambda.function_name}"
  retention_in_days = 3
  tags = {
    environment = "${var.environment}"
    service     = "yo-api"
  }
}

data "aws_iam_policy_document" "yo-api-lambda-policy" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      aws_cloudwatch_log_group.yo-api-loggroup.arn,
      "${aws_cloudwatch_log_group.yo-api-loggroup.arn}:*"
    ]
  }
}

resource "aws_iam_role_policy" "yo-api-lambda-role-policy" {
  policy = data.aws_iam_policy_document.yo-api-lambda-policy.json
  role   = aws_iam_role.yo-api-lambda-role.id
  name   = "yo-api-lambda-policy"
}

/* ------------------------- */
/* ACM Certificate           */
/* ------------------------- */

data "aws_acm_certificate" "issued" {
  domain      = "*.${var.root_domain}"
  statuses    = ["ISSUED"]
  most_recent = true
}

/* ------------------------- */
/* VPC                       */
/* ------------------------- */

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

/* ------------------------- */
/* Subnets                   */
/* ------------------------- */

resource "aws_subnet" "public_subnet_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  map_public_ip_on_launch = true
}

/* ------------------------- */
/* Security Group          */
/* ------------------------- */

resource "aws_security_group" "allow_https" {
  name        = "allow_https"
  description = "Allow HTTPS traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks  = ["0.0.0.0/0"] // Adjust this as necessary for your security requirements
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" // Allow all outbound traffic
    cidr_blocks  = ["0.0.0.0/0"]
  }
}

/* ------------------------- */
/* Application Load Balancer  */
/* ------------------------- */

resource "aws_lb" "yo-api-lb" {
  name               = "yo-api-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.allow_https.id]
  subnets            = [
    aws_subnet.public_subnet_a.id, 
    aws_subnet.public_subnet_b.id
  ]
}

resource "aws_lb_target_group" "yo-api-tg" {
  name        = "yo-api-lambda-tg"
  target_type = "lambda"
  vpc_id      = aws_vpc.main.id
  health_check {
    enabled             = true
    interval            = 30
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group_attachment" "yo-api-tga" {
  target_group_arn = aws_lb_target_group.yo-api-tg.arn
  target_id        = aws_lambda_function.yo-api-lambda.arn
}

/* ------------------------- */
/* HTTPS Listener           */
/* ------------------------- */

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.yo-api-lb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.issued.arn

  default_action {
    type = "forward"
    target_group_arn = aws_lb_target_group.yo-api-tg.arn
  }
}

/* ------------------------- */
/* Route 53 CNAME Record     */
/* ------------------------- */

resource "aws_route53_zone" "existing_zone" {
  name = var.root_domain
}

resource "aws_route53_record" "test-cname" {
  zone_id  = aws_route53_zone.existing_zone.zone_id
  name     = "test"
  type     = "CNAME"
  ttl      = 300
  records  = [aws_lambda_function_url.yo-api-lambda-function-url.function_url] # Points direct to function url
}

resource "aws_route53_record" "yo-api-cname" {
  zone_id  = aws_route53_zone.existing_zone.zone_id
  name     = "yo-api"
  type     = "CNAME"
  ttl      = 300
  records  = [aws_lb.yo-api-lb.dns_name] # Points to ALB instance
}