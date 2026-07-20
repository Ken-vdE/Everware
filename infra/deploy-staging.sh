#!/usr/bin/env bash
# Phased staging deploy helper (run each phase via: bash infra/deploy-staging.sh <phase>)
#   init   — configure backend + init the staging config
#   secret — create the Secret Manager container only (targeted apply)
#   full   — full apply (service + public access), then print the run.app URL
# Between 'secret' and 'full', seed the secret values with:
#   gcloud secrets versions add resend-api-key-staging --data-file=<file-with-key>
#   printf '%s' 'onboarding@resend.dev' | gcloud secrets versions add contact-from-staging --data-file=-
set -euo pipefail

cd "$(dirname "$0")/environments/staging"

case "${1:-}" in
  init)
    terraform init -reconfigure -input=false
    ;;
  secret)
    terraform apply -auto-approve -input=false \
      -target=module.app.google_secret_manager_secret.resend \
      -target=module.app.google_secret_manager_secret.contact_from
    ;;
  full)
    terraform apply -auto-approve -input=false
    echo
    echo "Staging URL: $(terraform output -raw service_uri)"
    ;;
  *)
    echo "usage: deploy-staging.sh init|secret|full" >&2
    exit 2
    ;;
esac
