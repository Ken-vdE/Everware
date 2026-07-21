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

  # Send X-Goog-User-Project on every call so quota-metered APIs work under user ADC.
  billing_project       = var.project_id
  user_project_override = true
}

variable "project_id" { type = string }
variable "region" {
  type    = string
  default = "europe-west4"
}
variable "alert_email" {
  type        = string
  default     = ""
  description = "Email for runtime alerts. Set in terraform.tfvars (gitignored). Empty = runtime alerts off."
}
