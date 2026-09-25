from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0004_alter_crmsession_last_seen_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="LearningMode",
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
                    "name",
                    models.CharField(
                        max_length=100,
                        unique=True,
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        default=True,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),

        migrations.CreateModel(
            name="CourseDuration",
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
                    "name",
                    models.CharField(
                        max_length=100,
                        unique=True,
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        default=True,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
                (
                    "updated_at",
                    models.DateTimeField(
                        auto_now=True,
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
            },
        ),

        migrations.AddField(
            model_name="lead",
            name="product",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="leads",
                to="crm.product",
            ),
        ),

        migrations.AddField(
            model_name="lead",
            name="learning_mode",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="leads",
                to="crm.learningmode",
            ),
        ),

        migrations.AddField(
            model_name="lead",
            name="course_duration",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="leads",
                to="crm.courseduration",
            ),
        ),

        migrations.AddField(
            model_name="lead",
            name="town_city",
            field=models.CharField(
                blank=True,
                max_length=150,
            ),
        ),
    ]