variable "lambdasVersion" {
  description = "Version of the Lambda zip on S3"
  type        = string
}

variable "environment" {
  description = "The environment for the deployment (e.g., development, production)"
  type        = string
  default     = "development"
}

variable "root_domains" {
  description = "A list of root domain names used for creating custom subdomains and API Gateway domain names."
  type        = list(string)
  default     = []
}