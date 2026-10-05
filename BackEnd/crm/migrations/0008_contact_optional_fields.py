from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("crm", "0007_importbatch")]

    operations = [
        migrations.AlterField(model_name="contact", name="company", field=models.CharField(max_length=200, null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="email", field=models.EmailField(max_length=254, null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="phone", field=models.CharField(max_length=50, null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="source", field=models.ForeignKey(to="crm.source", on_delete=django.db.models.deletion.PROTECT, null=True, blank=True)),
        migrations.AddField(model_name="contact", name="product", field=models.ForeignKey(to="crm.product", on_delete=django.db.models.deletion.PROTECT, related_name="contacts", null=True, blank=True)),
        migrations.AddField(model_name="contact", name="learning_mode", field=models.ForeignKey(to="crm.learningmode", on_delete=django.db.models.deletion.PROTECT, related_name="contacts", null=True, blank=True)),
        migrations.AddField(model_name="contact", name="course_duration", field=models.ForeignKey(to="crm.courseduration", on_delete=django.db.models.deletion.PROTECT, related_name="contacts", null=True, blank=True)),
        migrations.AddField(model_name="contact", name="town_city", field=models.CharField(max_length=150, null=True, blank=True)),
        migrations.AddField(model_name="contact", name="status", field=models.CharField(max_length=20, choices=[("qualified", "Qualified"), ("not_qualified", "Not qualified")], null=True, blank=True)),
        migrations.AddField(model_name="contact", name="disqualification_reason", field=models.CharField(max_length=100, null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="notes", field=models.TextField(null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="industry", field=models.CharField(max_length=100, null=True, blank=True)),
        migrations.AlterField(model_name="contact", name="location", field=models.CharField(max_length=200, null=True, blank=True)),
    ]
