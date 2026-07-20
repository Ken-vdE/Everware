module "app" {
  source = "../../modules/app"

  project_id    = var.project_id
  region        = var.region
  service_name  = "everware-staging"
  environment   = "staging"
  site_url      = "https://staging.everware.nl"
  contact_to    = "hallo@everware.nl"
  contact_from  = "onboarding@resend.dev"
  secret_id     = "resend-api-key-staging"
  domains       = ["staging.everware.nl"]
  min_instances = 0
  max_instances = 2
}

output "service_uri" {
  value = module.app.service_uri
}
