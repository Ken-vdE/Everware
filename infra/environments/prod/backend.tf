terraform {
  backend "gcs" {
    prefix = "prod"
    # bucket supplied at init via the symlinked backend.hcl: -backend-config=backend.hcl
  }
}
