/* ------------------------- */
/* Terraform State S3 Bucket */
/* ------------------------- */

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "yo-api-state-${var.environment}"

  # Prevent accidental deletion of this S3 bucket
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    environment = "${var.environment}"
    service     = "yo-api"
  }
}

variable "environment" {
  type        = string
  description = "The environment name (development, production)"
}
