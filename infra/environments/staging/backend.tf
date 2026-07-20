terraform {
  backend "gcs" {
    prefix = "staging"
    bucket = "our-cursor-502919-j1-tfstate"
  }
}
