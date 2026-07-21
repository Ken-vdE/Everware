terraform {
  backend "gcs" {
    prefix = "shared"
    # bucket supplied at init via the symlinked backend.hcl: -backend-config=backend.hcl
  }
}
