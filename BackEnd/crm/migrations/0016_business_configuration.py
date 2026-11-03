from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("crm", "0015_notification_targets"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="WorkspaceConfiguration", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("name", models.CharField(default="LiteCRM", max_length=150)),
            ("currency", models.CharField(default="INR", max_length=3)),
            ("timezone", models.CharField(default="Asia/Kolkata", max_length=64)),
            ("date_format", models.CharField(default="DD-MM-YYYY", max_length=20)),
            ("rules", models.JSONField(default=dict)), ("stage_names", models.JSONField(default=dict)),
            ("updated_at", models.DateTimeField(auto_now=True)),
            ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="BusinessListItem", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("list_type", models.CharField(choices=[("disqualification_reason", "Disqualification reason"), ("loss_reason", "Loss reason"), ("task_type", "Task type"), ("industry", "Industry")], max_length=40)),
            ("name", models.CharField(max_length=120)), ("active", models.BooleanField(default=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
        ], options={"ordering": ["list_type", "name"]}),
        migrations.AddConstraint(model_name="businesslistitem", constraint=models.UniqueConstraint(fields=("list_type", "name"), name="uniq_business_list_item_name")),
    ]
