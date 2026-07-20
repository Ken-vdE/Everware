resource "google_artifact_registry_repository" "everware" {
  location      = var.region
  repository_id = "everware"
  format        = "DOCKER"
  description   = "Everware site container images."
  depends_on    = [google_project_service.enabled]
}

# The Cloud Run service agent pulls images from this repo at deploy time.
data "google_project" "this" {}

resource "google_artifact_registry_repository_iam_member" "run_agent_reader" {
  location   = google_artifact_registry_repository.everware.location
  repository = google_artifact_registry_repository.everware.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:service-${data.google_project.this.number}@serverless-robot-prod.iam.gserviceaccount.com"
}
