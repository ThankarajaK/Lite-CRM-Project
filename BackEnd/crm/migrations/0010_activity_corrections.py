from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0009_default_crm_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="activity",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="activity",
            name="original_description",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="activity",
            name="original_subject",
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        migrations.AddField(
            model_name="activity",
            name="void_reason",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="activity",
            name="voided_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="activity",
            name="voided_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="voided_activities",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
