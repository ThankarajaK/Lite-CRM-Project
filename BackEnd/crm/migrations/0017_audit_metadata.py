from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("crm", "0016_business_configuration")]

    operations = [
        migrations.AddField(
            model_name="auditevent",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="browser",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
