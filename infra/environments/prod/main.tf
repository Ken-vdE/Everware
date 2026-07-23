module "app" {
  source = "../../modules/app"

  project_id             = var.project_id
  region                 = var.region
  service_name           = "everware-prod"
  environment            = "production"
  site_url               = "https://everware.nl"
  gtm_container_id       = "GTM-PVW78JG8"
  contact_to             = "hallo@everware.nl"
  secret_id              = "resend-api-key-prod"
  contact_from_secret_id = "contact-from-prod"
  domains                = ["everware.nl", "www.everware.nl"]
  min_instances          = 0
  max_instances          = 4
  alert_email            = var.alert_email
  # uptime_host disabled for now — empty host turns off the HTTPS uptime check
  # and its alert policy while keeping all other metric/log alerts active.
  # uptime_host            = "everware.nl"
}

output "service_uri" {
  value = module.app.service_uri
}
