import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("crm", "0013_salesperson_own_reports_permission"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [migrations.CreateModel(name="ExportJob", fields=[("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)), ("report_key", models.CharField(max_length=80)), ("file_format", models.CharField(max_length=10)), ("filters", models.JSONField(default=dict)), ("columns", models.JSONField(default=list)), ("rows", models.JSONField(default=list)), ("row_count", models.PositiveIntegerField(default=0)), ("status", models.CharField(max_length=20, choices=[("queued", "Queued"), ("processing", "Processing"), ("ready", "Ready"), ("failed", "Failed")], default="queued")), ("file_path", models.CharField(max_length=500, blank=True)), ("error_message", models.TextField(blank=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("completed_at", models.DateTimeField(null=True, blank=True)), ("requested_by", models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT, related_name="export_jobs"))], options={"ordering": ["created_at"]})]
