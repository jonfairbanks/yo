function deploy {
  # Capture the tfvars file from the argument
  ENVIRONMENT=$1

  # Generate a version number based on a date timestamp so that it's unique
  TIMESTAMP=$(date +%Y%m%d%H%M%S)

  # Set the appropriate bucket based on environment
  if [ "$ENVIRONMENT" = "development" ]; then
    S3_BUCKET="yo-api-state-development"
  elif [ "$ENVIRONMENT" = "production" ]; then
    S3_BUCKET="yo-api-state-production"
  fi

  # Initialize terraform with backend config specific to the environment's bucket
  terraform init \
    -backend-config="bucket=${S3_BUCKET}" \
    -backend-config="key=yo-api/${ENVIRONMENT}/terraform.tfstate" \
    -backend-config="region=us-east-1" && \

  # Import the pre-existing Route 53 hosted zone
  # terraform import -var-file="$ENVIRONMENT.tfvars" -var lambdasVersion="$TIMESTAMP" aws_route53_zone.existing_zone Z01722783FY79QJ88LI8B && \

  # Run the npm commands to transpile the TypeScript to JavaScript
  cd ../server/ && \
  npm i && \
  npm run build && \
  npm prune --omit=dev && \

  # Create a zip of node_modules
  find . -name "*.zip" -type f -delete && \
  mkdir -p layer/nodejs
  cp -r node_modules layer/nodejs/
  zip -r ./yo-node-modules-"$TIMESTAMP".zip -j layer/nodejs/
  rm -rf layer

  # Create a dist folder and copy only the js files to dist.
  mkdir -p dist/ && \
  rsync -av --prune-empty-dirs --exclude='node_modules' --exclude='chart' --include='*/' --include='*.js' --exclude='*' ./ dist/ && \
  cd dist && \

  # Zip everything in the dist folder
  find . -name "*.zip" -type f -delete && \
  zip -r ./yo-api-"$TIMESTAMP".zip . --exclude "./.DS_Store" && \
  cd ../../.tf && \

  # Run Terraform
  terraform plan -input=false -var-file="$ENVIRONMENT.tfvars" -var lambdasVersion="$TIMESTAMP" -out=./tfplan && \
  terraform apply -input=false ./tfplan
}

deploy "$@"