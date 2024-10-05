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
    bucket = "yo-api-state-${var.environment}" # This will be changed as part of terraform init
    key    = "default/terraform.tfstate" # This will be changed as part of terraform init
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

/* ------------------------- */
/* Lambda Role               */
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
    environment = var.environment
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
    environment = var.environment
    service     = "yo-api"
  }
}

# resource "aws_lambda_function_url" "yo-api-lambda-function-url" {
#   function_name      = aws_lambda_function.yo-api-lambda.id
#   authorization_type = "NONE"
#   cors {
#     allow_origins = ["*"]
#   }
# }

/* ------------------------- */
/* CloudWatch Log Group      */
/* ------------------------- */

resource "aws_cloudwatch_log_group" "yo-api-loggroup" {
  name              = "/aws/lambda/${aws_lambda_function.yo-api-lambda.function_name}"
  retention_in_days = 3

  tags = {
    environment = var.environment
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
/* API Gateway Rest API      */
/* ------------------------- */

resource "aws_api_gateway_rest_api" "yo-api" {
  name        = "yo-api-${var.environment}"
  description = "API Gateway for yo-api-${var.environment}"
}

/* ------------------------- */
/* API Gateway Catch-All     */
/* ------------------------- */

# resource "aws_api_gateway_resource" "yo-api-resource" {
#   rest_api_id = aws_api_gateway_rest_api.yo-api.id
#   parent_id   = aws_api_gateway_rest_api.yo-api.root_resource_id
#   path_part   = "{proxy+}"
# }

/* ------------------------- */
/* API Gateway Method        */
/* ------------------------- */

resource "aws_api_gateway_method" "root_method" {
  rest_api_id   = aws_api_gateway_rest_api.yo-api.id
  resource_id   = aws_api_gateway_rest_api.yo-api.root_resource_id  # This refers to the root "/"
  http_method   = "ANY"
  authorization = "NONE"
}

# resource "aws_api_gateway_method" "yo-api-any-method" {
#   rest_api_id   = aws_api_gateway_rest_api.yo-api.id
#   resource_id   = aws_api_gateway_resource.yo-api-resource.id
#   http_method   = "ANY"
#   authorization = "NONE"
# }

/* ------------------------- */
/* API Gateway Integration   */
/* ------------------------- */

resource "aws_api_gateway_integration" "yo-api-root-integration" {
  rest_api_id             = aws_api_gateway_rest_api.yo-api.id
  resource_id             = aws_api_gateway_rest_api.yo-api.root_resource_id
  http_method             = aws_api_gateway_method.root_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.yo-api-lambda.invoke_arn
}

# resource "aws_api_gateway_integration" "yo-api-lambda-integration" {
#   rest_api_id = aws_api_gateway_rest_api.yo-api.id
#   resource_id = aws_api_gateway_resource.yo-api-resource.id
#   http_method = aws_api_gateway_method.yo-api-any-method.http_method
#   integration_http_method = "POST"
#   type = "AWS_PROXY"
#   uri  = aws_lambda_function.yo-api-lambda.invoke_arn
# }

/* ------------------------- */
/* API Gateway Deployment    */
/* ------------------------- */

resource "aws_api_gateway_deployment" "yo-api-deployment" {
  rest_api_id = aws_api_gateway_rest_api.yo-api.id
  stage_name  = var.environment

  depends_on = [
    aws_api_gateway_integration.yo-api-root-integration
  ]
}

/* ------------------------- */
/* API Gateway Domain Name   */
/* ------------------------- */

resource "aws_api_gateway_domain_name" "yo-api-domain" {
  domain_name = "yo-api.${var.root_domain}"
  certificate_arn = data.aws_acm_certificate.issued.arn
}

/* ------------------------- */
/* API Gateway Base Path     */
/* ------------------------- */

resource "aws_api_gateway_base_path_mapping" "yo-api-base-path" {
  domain_name = aws_api_gateway_domain_name.yo-api-domain.domain_name
  api_id = aws_api_gateway_rest_api.yo-api.id
  stage_name  = aws_api_gateway_deployment.yo-api-deployment.stage_name
  base_path = "" # Blank base path sets path as /
}

/* ------------------------------ */
/* API Gateway Lambda Permissions */
/* ------------------------------ */

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.yo-api-lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # This is the source ARN for the API Gateway
  source_arn = "${aws_api_gateway_rest_api.yo-api.execution_arn}/*/*"
}

/* ------------------------- */
/* Route 53 API Gateway CNAME */
/* ------------------------- */

resource "aws_route53_zone" "existing_zone" {
  name = var.root_domain
}

resource "aws_route53_record" "yo-api-cname" {
  zone_id = aws_route53_zone.existing_zone.zone_id
  name    = "yo-api.${var.root_domain}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_api_gateway_domain_name.yo-api-domain.cloudfront_domain_name]
}