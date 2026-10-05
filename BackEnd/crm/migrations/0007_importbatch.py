from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0006_alter_lead_options_alter_lead_company_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ImportBatch",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "batch_id",
                    models.CharField(
                        max_length=32,
                        unique=True,
                    ),
                ),
                (
                    "file_name",
                    models.CharField(
                        max_length=255,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
                (
                    "total_rows",
                    models.PositiveIntegerField(
                        default=0,
                    ),
                ),
                (
                    "created_count",
                    models.PositiveIntegerField(
                        default=0,
                    ),
                ),
                (
                    "updated_count",
                    models.PositiveIntegerField(
                        default=0,
                    ),
                ),
                (
                    "skipped_count",
                    models.PositiveIntegerField(
                        default=0,
                    ),
                ),
                (
                    "failed_count",
                    models.PositiveIntegerField(
                        default=0,
                    ),
                ),
                (
                    "reversed_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                    ),
                ),
                (
                    "imported_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="lead_import_batches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]