resource "google_artifact_registry_repository" "everware" {
  location      = var.region
  repository_id = "everware"
  format        = "DOCKER"
  description   = "Everware site container images."
  depends_on    = [google_project_service.enabled]
}
