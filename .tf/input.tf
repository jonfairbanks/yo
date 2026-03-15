variable "lambdasVersion" {
  type        = string
  description = "Version of the Lambda zip on S3"
}

variable "environment" {
  description = "The environment for the deployment (e.g., development, production)"
  type        = string
  default     = "development"
}

variable "root_domain" {
  description = "The root domain name to be used when creating domain names"
  type = string
}