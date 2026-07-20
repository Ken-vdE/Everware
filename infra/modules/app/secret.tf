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

# Container only — the value is added out-of-band with:
#   gcloud secrets versions add <contact_from_secret_id> --data-file=-
resource "google_secret_manager_secret" "contact_from" {
  secret_id = var.contact_from_secret_id
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "contact_from_access" {
  secret_id = google_secret_manager_secret.contact_from.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}
