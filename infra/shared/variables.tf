variable "project_id" {
  type        = string
  description = "GCP project ID hosting the Everware site."
}

variable "region" {
  type    = string
  default = "europe-west4"
}

variable "github_repository" {
  type        = string
  default     = "Ken-vdE/Everware"
  description = "owner/name of the GitHub repo allowed to deploy."
}
