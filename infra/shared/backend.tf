terraform {
  backend "gcs" {
    prefix = "shared"
    bucket = "our-cursor-502919-j1-tfstate"
  }
}
