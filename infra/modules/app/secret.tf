# Container only — the value is added out-of-band with:
#   gcloud secrets versions add <secret_id> --data-file=-
resource "google_secret_manager_secret" "resend" {
  secret_id = var.secret_id
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  secret_id = google_secret_manager_secret.resend.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}
