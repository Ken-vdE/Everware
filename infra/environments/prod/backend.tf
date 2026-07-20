terraform {
  backend "gcs" {
    prefix = "prod"
    # bucket supplied at init: -backend-config="bucket=<NAME>"
  }
}
