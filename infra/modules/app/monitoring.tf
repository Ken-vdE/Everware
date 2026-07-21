# Runtime alerting (Cloud Monitoring) for the Cloud Run service.
# Passive metric alerts (5xx / latency / memory) add no traffic and cost nothing.
# The uptime check DOES probe the public URL every `uptime_period`, waking the
# scale-to-zero container each probe (negligible cost — 15m is GCP's max interval).
#
# All resources are guarded: no alert_email => no alerting; no uptime_host => no
# uptime check. Requires monitoring.googleapis.com (enabled in infra/shared).

locals {
  alerting_enabled = var.alert_email != "" ? 1 : 0
  uptime_enabled   = (var.alert_email != "" && var.uptime_host != "") ? 1 : 0
  run_filter       = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${var.service_name}\""
  channel_ids      = [for c in google_monitoring_notification_channel.email : c.id]
}

resource "google_monitoring_notification_channel" "email" {
  count        = local.alerting_enabled
  display_name = "${var.service_name} alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

resource "google_monitoring_alert_policy" "error_5xx" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — 5xx error rate"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "5xx > ${var.alert_5xx_rate_threshold}/s for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_5xx_rate_threshold
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "5xx responses on ${var.service_name} exceeded ${var.alert_5xx_rate_threshold}/s for 5 minutes. Check Cloud Run logs."
  }
}

resource "google_monitoring_alert_policy" "latency_p95" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — p95 latency"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "p95 latency > ${var.alert_latency_p95_ms}ms for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_latency_p95_ms
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "p95 request latency on ${var.service_name} exceeded ${var.alert_latency_p95_ms}ms for 5 minutes. Note: cold starts (min_instances=0) can spike this at low traffic — raise the threshold if noisy."
  }
}

resource "google_monitoring_alert_policy" "memory" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — memory utilization"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "memory > ${var.alert_memory_utilization} for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/container/memory/utilizations\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_memory_utilization
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "Container memory utilization on ${var.service_name} exceeded ${var.alert_memory_utilization} of its limit for 5 minutes — OOM / restart risk."
  }
}

resource "google_monitoring_uptime_check_config" "https" {
  count        = local.uptime_enabled
  display_name = "${var.service_name} — uptime"
  timeout      = "10s"
  period       = var.uptime_period

  http_check {
    path         = "/"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.uptime_host
    }
  }
}

resource "google_monitoring_alert_policy" "uptime" {
  count                 = local.uptime_enabled
  display_name          = "${var.service_name} — uptime failure"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "uptime check failing from >1 location"
    condition_threshold {
      filter          = "metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type = \"uptime_url\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.https[0].uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "0s"
      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "1800s" }

  documentation {
    content = "Uptime check for ${var.uptime_host} failed from more than one location. Site may be down, unreachable, or SSL invalid/expired."
  }
}

resource "google_monitoring_alert_policy" "max_instances" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — max instances reached"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "active instances at ceiling (${var.max_instances}) for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/container/instance_count\" AND metric.labels.state = \"active\""
      comparison      = "COMPARISON_GTE"
      threshold_value = var.max_instances
      duration        = "300s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MAX"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "1800s" }

  documentation {
    content = "${var.service_name} is running at its max_instances ceiling (${var.max_instances}) — traffic is being queued/throttled. Investigate the spike or raise max_instances."
  }
}

resource "google_monitoring_alert_policy" "cpu" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — CPU utilization"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "CPU > ${var.alert_cpu_utilization} for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/container/cpu/utilizations\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_cpu_utilization
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "Container CPU utilization on ${var.service_name} exceeded ${var.alert_cpu_utilization} of its limit for 5 minutes."
  }
}

resource "google_monitoring_alert_policy" "error_4xx" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — 4xx error rate"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "4xx > ${var.alert_4xx_rate_threshold}/s for 5m"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"4xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_4xx_rate_threshold
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "4xx responses on ${var.service_name} exceeded ${var.alert_4xx_rate_threshold}/s for 5 minutes — possible broken links, bad deploy, or scanning. Expect some bot noise."
  }
}

resource "google_monitoring_alert_policy" "startup_latency" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — slow container startup"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "p99 startup > ${var.alert_startup_latency_ms}ms"
    condition_threshold {
      filter          = "${local.run_filter} AND metric.type = \"run.googleapis.com/container/startup_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_startup_latency_ms
      duration        = "0s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_PERCENTILE_99"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "3600s" }

  documentation {
    content = "Container startup on ${var.service_name} took over ${var.alert_startup_latency_ms}ms (p99). Slow/failing boot — check the image and startup path. Only sampled on cold starts."
  }
}

# --- Log-based alerts (text filters: Cloud Run tags all stderr as ERROR, so
# severity is unreliable here — match on the app's own log strings instead). ---

resource "google_logging_metric" "contact_failures" {
  count       = local.alerting_enabled
  name        = "${var.service_name}-contact-failures"
  description = "Contact-form submissions that failed to send (Resend error or misconfig)."
  filter      = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${var.service_name}\" (textPayload=~\"lost submission\" OR textPayload=~\"RESEND_API_KEY is not set\")"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "contact_failures" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — contact form failure"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "contact-form send failed"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${var.service_name}\" AND metric.type = \"logging.googleapis.com/user/${google_logging_metric.contact_failures[0].name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_DELTA"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "1800s" }

  documentation {
    content = "A contact-form submission failed to send on ${var.service_name} (Resend error or missing key). A lead was likely lost — check logs and the Resend dashboard immediately."
  }
}

resource "google_logging_metric" "unhandled_exceptions" {
  count       = local.alerting_enabled
  name        = "${var.service_name}-unhandled-exceptions"
  description = "Unhandled exceptions surfaced by the app's catch-all handler."
  filter      = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${var.service_name}\" textPayload=~\"unhandled exception\""
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "unhandled_exceptions" {
  count                 = local.alerting_enabled
  display_name          = "${var.service_name} — unhandled exceptions"
  combiner              = "OR"
  notification_channels = local.channel_ids

  conditions {
    display_name = "unhandled exception logged (5m)"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${var.service_name}\" AND metric.type = \"logging.googleapis.com/user/${google_logging_metric.unhandled_exceptions[0].name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_DELTA"
      }
      trigger { count = 1 }
    }
  }

  alert_strategy { auto_close = "1800s" }

  documentation {
    content = "The app raised an unhandled exception on ${var.service_name} (returned 500). Check Cloud Run logs for the stack trace."
  }
}
