resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "${var.service_name} runtime"
}

resource "google_cloud_run_v2_service" "app" {
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "SITE_URL"
        value = var.site_url
      }
      env {
        name  = "CONTACT_TO"
        value = var.contact_to
      }
      env {
        name = "CONTACT_FROM"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.contact_from.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "RESEND_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.resend.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # CI manages the deployed image; don't revert it on the next terraform apply.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [
    google_secret_manager_secret_iam_member.runtime_access,
    google_secret_manager_secret_iam_member.contact_from_access,
  ]
}
