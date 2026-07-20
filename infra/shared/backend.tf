terraform {
  backend "gcs" {
    prefix = "shared"
    # bucket supplied at init: terraform init -backend-config="bucket=<NAME>"
  }
}
