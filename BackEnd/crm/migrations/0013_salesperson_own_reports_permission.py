from django.db import migrations


def grant_own_reports(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    role = Role.objects.filter(key="salesperson").first()
    if not role:
        return
    permissions = list(role.permissions or [])
    if "view_own_reports" not in permissions:
        permissions.append("view_own_reports")
        role.permissions = permissions
        role.save(update_fields=["permissions"])


def revoke_own_reports(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    role = Role.objects.filter(key="salesperson").first()
    if not role:
        return
    role.permissions = [p for p in (role.permissions or []) if p != "view_own_reports"]
    role.save(update_fields=["permissions"])


class Migration(migrations.Migration):
    dependencies = [("crm", "0012_deal_closing_reopening")]

    operations = [migrations.RunPython(grant_own_reports, revoke_own_reports)]
