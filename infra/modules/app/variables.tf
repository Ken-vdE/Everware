variable "project_id" { type = string }
variable "region" { type = string }
variable "service_name" { type = string }
variable "environment" { type = string } # "staging" | "production"
variable "site_url" { type = string }
variable "gtm_container_id" {
  type        = string
  default     = ""
  description = "Google Tag Manager container id (e.g. GTM-XXXX). Empty = tag omitted; set on production only."
}
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

# --- Runtime monitoring / alerting ---
variable "alert_email" {
  type        = string
  default     = ""
  description = "Email for Cloud Monitoring runtime alerts. Empty = alerting disabled."
}
variable "uptime_host" {
  type        = string
  default     = ""
  description = "Hostname for the HTTPS uptime check (e.g. everware.nl). Empty = no uptime check."
}
variable "uptime_period" {
  type        = string
  default     = "900s"
  description = "Uptime check interval. Allowed (GCP caps at 15m): 60s | 300s | 600s | 900s."
}
variable "alert_5xx_rate_threshold" {
  type        = number
  default     = 1
  description = "Alert when 5xx responses exceed this rate (req/s, 1m avg) for 5m."
}
variable "alert_latency_p95_ms" {
  type        = number
  default     = 2000
  description = "Alert when p95 request latency exceeds this (ms) for 5m."
}
variable "alert_memory_utilization" {
  type        = number
  default     = 0.9
  description = "Alert when container memory utilization exceeds this fraction (0-1) for 5m."
}
variable "alert_cpu_utilization" {
  type        = number
  default     = 0.9
  description = "Alert when container CPU utilization exceeds this fraction (0-1) for 5m."
}
variable "alert_4xx_rate_threshold" {
  type        = number
  default     = 5
  description = "Alert when 4xx responses exceed this rate (req/s, 1m avg) for 5m. High default to dodge bot/scanner 404 noise."
}
variable "alert_startup_latency_ms" {
  type        = number
  default     = 10000
  description = "Alert when p99 container startup latency exceeds this (ms). Only emitted on cold start."
}
