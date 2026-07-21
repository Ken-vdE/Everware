# Project-wide monthly billing budget with email alerts at 50/90/100%.
# Guards against a traffic spike or loop blowing past the free tier.
# Guarded: no billing_account => no budget. Requires billingbudgets.googleapis.com
# and that whoever applies this has billing.budgets permissions on the account.

locals {
  budget_enabled  = var.billing_account != "" ? 1 : 0
  budget_channels = [for c in google_monitoring_notification_channel.budget_email : c.id]
}

# data.google_project.this is declared in artifact_registry.tf — reused here for .number.

resource "google_monitoring_notification_channel" "budget_email" {
  count        = (var.billing_account != "" && var.alert_email != "") ? 1 : 0
  display_name = "everware budget alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

resource "google_billing_budget" "monthly" {
  count           = local.budget_enabled
  billing_account = var.billing_account
  display_name    = "everware monthly budget"

  budget_filter {
    projects = ["projects/${data.google_project.this.number}"]
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = tostring(var.monthly_budget)
    }
  }

  threshold_rules { threshold_percent = 0.5 }
  threshold_rules { threshold_percent = 0.9 }
  threshold_rules { threshold_percent = 1.0 }

  all_updates_rule {
    monitoring_notification_channels = local.budget_channels
    disable_default_iam_recipients   = false
  }
}
