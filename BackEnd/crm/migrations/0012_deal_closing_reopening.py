from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0011_salesperson_activity_correction_permission"),
    ]

    operations = [
        migrations.AddField(
            model_name="deal",
            name="loss_reason_detail",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="contract_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="close_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="deal",
            name="reopened_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
