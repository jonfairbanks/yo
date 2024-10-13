/* ------------------------- */
/* Terraform Providers       */
/* ------------------------- */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
  default_tags {
    tags = {
      environment = var.environment
      service     = "yo-api"
    }
  }
}

/* ------------------------- */
/* Lambda Role               */
/* ------------------------- */

resource "aws_iam_role" "yo_api_lambda_role" {
  name = "yo_api_lambda_role_${var.environment}"
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
}

/* ------------------------- */
/* Lambda Function           */
/* ------------------------- */

resource "aws_lambda_function" "yo_api_lambda" {
  filename      = "../server/dist/yo-api-${var.lambdasVersion}.zip"
  function_name = "yo_api_lambda_${var.environment}"
  role          = aws_iam_role.yo_api_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 128
  timeout       = 300

  description = "yo-api:${var.environment}"

  layers = [
    aws_lambda_layer_version.yo_api_node_modules_layer.arn
  ] 

  environment {
    variables = {
      SAMPLE_ENV = "test123"
    }
  }
}

resource "aws_lambda_layer_version" "yo_api_node_modules_layer" {
  filename         = "../server/yo-node-modules-${var.lambdasVersion}.zip"
  layer_name       = "yo_api_node_modules"
  compatible_runtimes = ["nodejs18.x"]
  compatible_architectures = ["x86_64", "arm64"]
  description      = "Yo API dependencies"
}

# resource "aws_lambda_function_url" "yo_api_lambda_function_url" {
#   function_name      = aws_lambda_function.yo_api_lambda.id
#   authorization_type = "NONE"
#   cors {
#     allow_origins = ["*"]
#   }
# }

/* ------------------------- */
/* CloudWatch Log Group      */
/* ------------------------- */

resource "aws_cloudwatch_log_group" "yo_api_loggroup" {
  name              = "/aws/lambda/${aws_lambda_function.yo_api_lambda.function_name}"
  retention_in_days = 3
}

data "aws_iam_policy_document" "yo_api_lambda_policy" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      aws_cloudwatch_log_group.yo_api_loggroup.arn,
      "${aws_cloudwatch_log_group.yo_api_loggroup.arn}:*"
    ]
  }
}

resource "aws_iam_role_policy" "yo_api_lambda_role_policy" {
  policy = data.aws_iam_policy_document.yo_api_lambda_policy.json
  role   = aws_iam_role.yo_api_lambda_role.id
  name   = "yo_api_lambda_policy"
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

resource "aws_api_gateway_rest_api" "yo_api" {
  name        = "yo-api-${var.environment}"
  description = "API Gateway for yo-api-${var.environment}"
}

/* ------------------------- */
/* API Gateway Catch-All     */
/* ------------------------- */

resource "aws_api_gateway_resource" "yo_api_catch_all" {
  rest_api_id = aws_api_gateway_rest_api.yo_api.id
  parent_id   = aws_api_gateway_rest_api.yo_api.root_resource_id
  path_part   = "{proxy+}"
}

/* ------------------------- */
/* API Gateway Methods       */
/* ------------------------- */

resource "aws_api_gateway_method" "yo_api_root_method" {
  rest_api_id   = aws_api_gateway_rest_api.yo_api.id
  resource_id   = aws_api_gateway_rest_api.yo_api.root_resource_id  # This refers to the root "/"
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "yo_api_catch_all_method" {
  rest_api_id   = aws_api_gateway_rest_api.yo_api.id
  resource_id   = aws_api_gateway_resource.yo_api_catch_all.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "yo_api_catch_all_method_response" {
  rest_api_id = aws_api_gateway_rest_api.yo_api.id
  resource_id = aws_api_gateway_resource.yo_api_catch_all.id
  http_method = aws_api_gateway_method.yo_api_catch_all_method.http_method
  status_code = "404"
}

/* ------------------------- */
/* API Gateway Integrations  */
/* ------------------------- */

resource "aws_api_gateway_integration" "yo_api_root_integration" {
  rest_api_id             = aws_api_gateway_rest_api.yo_api.id
  resource_id             = aws_api_gateway_rest_api.yo_api.root_resource_id
  http_method             = aws_api_gateway_method.yo_api_root_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.yo_api_lambda.invoke_arn
}

resource "aws_api_gateway_integration" "yo_api_catch_all_integration" {
  rest_api_id             = aws_api_gateway_rest_api.yo_api.id
  resource_id             = aws_api_gateway_resource.yo_api_catch_all.id
  http_method             = aws_api_gateway_method.yo_api_catch_all_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.yo_api_lambda.invoke_arn
}

resource "aws_api_gateway_integration_response" "yo_api_catch_all_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.yo_api.id
  resource_id = aws_api_gateway_resource.yo_api_catch_all.id
  http_method = aws_api_gateway_method.yo_api_catch_all_method.http_method
  status_code = "200"
}

/* ------------------------- */
/* API Gateway Deployment    */
/* ------------------------- */

resource "aws_api_gateway_deployment" "yo_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.yo_api.id
  depends_on = [
    aws_api_gateway_integration.yo_api_root_integration,
    aws_api_gateway_integration.yo_api_catch_all_integration,
    aws_api_gateway_integration_response.yo_api_catch_all_integration_response
  ]
}

/* ---------------------------------- */
/* API Gateway Logging Configuration  */
/* ---------------------------------- */

resource "aws_api_gateway_stage" "yo_api_stage" {
  rest_api_id  = aws_api_gateway_rest_api.yo_api.id
  deployment_id = aws_api_gateway_deployment.yo_api_deployment.id
  stage_name   = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.yo_api_gw_logs.arn
    format          = jsonencode({
      requestId       = "$context.requestId"
      ip              = "$context.identity.sourceIp"
      caller          = "$context.identity.caller"
      user            = "$context.identity.user"
      requestTime     = "$context.requestTime"
      httpMethod      = "$context.httpMethod"
      resourcePath    = "$context.resourcePath"
      status          = "$context.status"
      protocol        = "$context.protocol"
      responseLength  = "$context.responseLength"
    })
  }

  xray_tracing_enabled = true

  depends_on = [
    aws_api_gateway_deployment.yo_api_deployment
  ]
}

resource "aws_api_gateway_method_settings" "yo_api_settings" {
  rest_api_id = aws_api_gateway_rest_api.yo_api.id
  stage_name  = aws_api_gateway_stage.yo_api_stage.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}

resource "aws_cloudwatch_log_group" "yo_api_gw_logs" {
  name              = "/aws/apigateway/${aws_api_gateway_rest_api.yo_api.id}/${var.environment}"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "yo_api_gw_loggroup" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.yo_api.id}/${aws_api_gateway_stage.yo_api_stage.stage_name}"
  retention_in_days = 3
}

data "aws_iam_policy_document" "yo_api_gw_logging_policy" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "yo_api_gw_logging_role_policy" {
  role   = aws_iam_role.yo_api_lambda_role.id
  policy = data.aws_iam_policy_document.yo_api_gw_logging_policy.json
}

resource "aws_iam_role" "api_gateway_logging_role" {
  name = "api_gateway_logging_role_${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_logging_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.api_gateway_logging_role.name
}

/* ------------------------- */
/* API Gateway Domain Name   */
/* ------------------------- */

resource "aws_api_gateway_domain_name" "yo_api_domain" {
  domain_name = "yo-api.${var.root_domain}"
  certificate_arn = data.aws_acm_certificate.issued.arn
}

/* ------------------------- */
/* API Gateway Base Path     */
/* ------------------------- */

resource "aws_api_gateway_base_path_mapping" "yo_api_base_path" {
  domain_name = aws_api_gateway_domain_name.yo_api_domain.domain_name
  api_id = aws_api_gateway_rest_api.yo_api.id
  stage_name  = aws_api_gateway_stage.yo_api_stage.stage_name
  base_path = "" # Blank base path sets path as /
}

/* ------------------------------ */
/* API Gateway Lambda Permissions */
/* ------------------------------ */

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.yo_api_lambda.function_name
  principal     = "apigateway.amazonaws.com"

  # This is the source ARN for the API Gateway
  source_arn = "${aws_api_gateway_rest_api.yo_api.execution_arn}/*/*"
}

/* ------------------------- */
/* Route 53 API Gateway CNAME */
/* ------------------------- */

resource "aws_route53_zone" "existing_zone" {
  name = var.root_domain
}

resource "aws_route53_record" "yo_api_cname" {
  zone_id = aws_route53_zone.existing_zone.zone_id
  name    = "yo-api.${var.root_domain}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_api_gateway_domain_name.yo_api_domain.cloudfront_domain_name]
}

/* ------------------------- */
/* Output Variables          */
/* ------------------------- */

output "api_gateway_url" {
  description = "The URL of the API Gateway"
  value       = "${aws_api_gateway_deployment.yo_api_deployment.invoke_url}"
}

output "lambda_function_arn" {
  description = "The ARN of the Lambda function"
  value       = "${aws_lambda_function.yo_api_lambda.arn}"
}

output "cloudwatch_log_group" {
  description = "The CloudWatch log group name"
  value       = aws_cloudwatch_log_group.yo_api_loggroup.name
}

output "route53_record" {
  description = "The Route 53 DNS record"
  value       = "https://${aws_route53_record.yo_api_cname.fqdn}"
}