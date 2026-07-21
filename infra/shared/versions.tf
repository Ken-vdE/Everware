terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Some APIs (e.g. billingbudgets) bill quota to a project and reject user ADC
  # that has no quota project. Send X-Goog-User-Project = this project on every call.
  billing_project       = var.project_id
  user_project_override = true
}
