# Cloud Run domain mapping (v1 resource). DNS records + domain verification
# are a manual one-time step (see the plan's bootstrap notes).
resource "google_cloud_run_domain_mapping" "map" {
  for_each = toset(var.domains)
  location = var.region
  name     = each.value

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app.name
  }
}
