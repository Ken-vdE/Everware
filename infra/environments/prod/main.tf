module "app" {
  source = "../../modules/app"

  project_id             = var.project_id
  region                 = var.region
  service_name           = "everware-prod"
  environment            = "production"
  site_url               = "https://everware.nl"
  contact_to             = "hallo@everware.nl"
  secret_id              = "resend-api-key-prod"
  contact_from_secret_id = "contact-from-prod"
  domains                = ["everware.nl", "www.everware.nl"]
  min_instances          = 0
  max_instances          = 4
}

output "service_uri" {
  value = module.app.service_uri
}
