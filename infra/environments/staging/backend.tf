terraform {
  backend "gcs" {
    prefix = "staging"
    # bucket supplied at init via the symlinked backend.hcl: -backend-config=backend.hcl
  }
}
