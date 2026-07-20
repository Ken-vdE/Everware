#!/usr/bin/env bash
# One-time: create the versioned GCS bucket that holds Terraform state.
# Usage: ./infra/bootstrap.sh <PROJECT_ID> [BUCKET_NAME]
set -euo pipefail

PROJECT_ID="${1:?usage: bootstrap.sh <PROJECT_ID> [BUCKET_NAME]}"
BUCKET="${2:-${PROJECT_ID}-tfstate}"
REGION="europe-west4"

gcloud config set project "$PROJECT_ID"
gcloud storage buckets create "gs://${BUCKET}" \
  --location="$REGION" \
  --uniform-bucket-level-access
gcloud storage buckets update "gs://${BUCKET}" --versioning

echo
echo "State bucket ready: gs://${BUCKET}"
echo "Init each config with: terraform init -backend-config=\"bucket=${BUCKET}\""
