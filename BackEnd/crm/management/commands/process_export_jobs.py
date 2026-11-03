import time
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from crm.models import ExportJob, Notification
from crm.services import audit
from crm.views import _render_export_file

class Command(BaseCommand):
    help = "Process queued CRM export jobs. Use --loop to keep polling in the background."
    def add_arguments(self, parser): parser.add_argument("--loop", action="store_true")
    def handle(self, *args, **options):
        while True:
            job = ExportJob.objects.filter(status=ExportJob.Status.QUEUED).order_by("created_at").first()
            if not job:
                if options["loop"]: time.sleep(2); continue
                self.stdout.write("No queued export jobs."); return
            job.status = ExportJob.Status.PROCESSING; job.save(update_fields=["status"])
            try:
                start = job.filters.get("start_date", ""); end = job.filters.get("end_date", "")
                period = (start, end) if start and end else ("", "")
                title = {"pipeline-conversion": "Pipeline Conversion", "salesperson-performance": "Salesperson Performance", "leads": "Leads", "contacts": "Contacts", "deals": "Deals", "tasks": "Tasks"}.get(job.report_key, job.report_key.title())
                path, filename = _render_export_file(title, job.file_format, job.columns, job.rows, job.filters, period)
                job.file_path = path; job.status = ExportJob.Status.READY; job.completed_at = timezone.now(); job.save(update_fields=["file_path", "status", "completed_at"])
                Notification.objects.create(user=job.requested_by, event_type="export.ready", message=f"Your {title} export is ready ({job.row_count} rows). Download: /api/exports/{job.id}/download/")
                audit(job.requested_by, "export.completed", job, after={"report": title, "format": job.file_format, "filters": job.filters, "row_count": job.row_count, "filename": filename})
                self.stdout.write(self.style.SUCCESS(f"Completed export {job.id}"))
            except Exception as exc:
                job.status = ExportJob.Status.FAILED; job.error_message = str(exc)[:2000]; job.completed_at = timezone.now(); job.save(update_fields=["status", "error_message", "completed_at"])
                Notification.objects.create(user=job.requested_by, event_type="export.failed", message="Your export could not be generated. Please try again or contact an administrator.")
            if not options["loop"]: return
