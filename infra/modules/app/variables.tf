variable "project_id" { type = string }
variable "region" { type = string }
variable "service_name" { type = string }
variable "environment" { type = string } # "staging" | "production"
variable "site_url" { type = string }
variable "contact_to" { type = string }
variable "secret_id" { type = string }              # Secret Manager secret id (Resend API key)
variable "contact_from_secret_id" { type = string } # Secret Manager secret id (CONTACT_FROM value)
variable "domains" { type = list(string) }
variable "min_instances" { type = number }
variable "max_instances" { type = number }

variable "image" {
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
  description = "Initial image; CI replaces it on deploy (drift ignored)."
}
