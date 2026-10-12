from django.db import migrations


def add_salesperson_correction_permission(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    role = Role.objects.filter(key="salesperson").first()
    if not role:
        return

    permissions = list(role.permissions or [])
    if "correct_activity" not in permissions:
        permissions.append("correct_activity")
        role.permissions = permissions
        role.save(update_fields=["permissions"])


def remove_salesperson_correction_permission(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    role = Role.objects.filter(key="salesperson").first()
    if not role:
        return

    role.permissions = [
        permission
        for permission in (role.permissions or [])
        if permission != "correct_activity"
    ]
    role.save(update_fields=["permissions"])


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0010_activity_corrections"),
    ]

    operations = [
        migrations.RunPython(
            add_salesperson_correction_permission,
            remove_salesperson_correction_permission,
        ),
    ]
