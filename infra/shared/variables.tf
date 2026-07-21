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

# --- Billing budget alert ---
variable "billing_account" {
  type        = string
  default     = ""
  description = "Billing account ID (XXXXXX-XXXXXX-XXXXXX) for the budget alert. Empty = no budget created."
}
variable "alert_email" {
  type        = string
  default     = ""
  description = "Alert email (budget + runtime). Set in terraform.tfvars (gitignored). Empty = billing default recipients / runtime alerts off."
}
variable "monthly_budget" {
  type        = number
  default     = 10
  description = "Monthly budget amount that triggers alerts at 50/90/100%."
}
variable "budget_currency" {
  type        = string
  default     = "EUR"
  description = "ISO 4217 currency code for the budget amount."
}
