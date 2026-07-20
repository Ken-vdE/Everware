terraform {
  backend "gcs" {
    prefix = "staging"
    # bucket supplied at init: -backend-config="bucket=<NAME>"
  }
}
