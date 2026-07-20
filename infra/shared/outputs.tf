output "artifact_registry_repo" {
  value = google_artifact_registry_repository.everware.repository_id
}

output "region" {
  value = var.region
}

output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "deploy_service_account" {
  value = google_service_account.deployer.email
}
