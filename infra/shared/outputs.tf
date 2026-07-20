output "artifact_registry_repo" {
  value = google_artifact_registry_repository.everware.repository_id
}

output "region" {
  value = var.region
}
