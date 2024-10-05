ENVIRONMENT=$1

terraform init
terraform plan -var-file=../$ENVIRONMENT.tfvars
terraform apply -var-file=../$ENVIRONMENT.tfvars