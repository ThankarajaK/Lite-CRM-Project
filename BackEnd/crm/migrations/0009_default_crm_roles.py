from django.db import migrations


ALL_PERMISSIONS = [
    "view_leads",
    "capture_lead",
    "edit_lead",
    "set_lead_status",
    "move_to_contact",
    "view_contacts",
    "edit_contact",
    "create_deal",
    "view_deals",
    "edit_deal",
    "edit_deal_value",
    "move_deal",
    "close_won",
    "close_lost",
    "reopen_deal",
    "log_activity",
    "create_task",
    "complete_others_task",
    "view_history",
    "manage_users",
    "manage_permissions",
    "manage_catalogue",
    "view_reports",
    "delete_lead",
    "reassign_lead",
    "import_leads",
    "create_contact",
    "delete_contact",
    "reassign_contact",
    "reassign_deal",
    "delete_deal",
    "correct_activity",
    "view_activity",
    "view_own_reports",
    "view_team_reports",
    "export_records",
    "manage_configuration",
    "view_audit",
    "view_workspace_records",
]

MANAGER_PERMISSIONS = [
    permission
    for permission in ALL_PERMISSIONS
    if permission
    not in {
        "manage_users",
        "manage_permissions",
        "manage_catalogue",
        "manage_configuration",
        "view_audit",
    }
]

SALESPERSON_PERMISSIONS = [
    "view_leads",
    "capture_lead",
    "edit_lead",
    "set_lead_status",
    "move_to_contact",
    "view_contacts",
    "edit_contact",
    "create_deal",
    "view_deals",
    "edit_deal",
    "edit_deal_value",
    "move_deal",
    "log_activity",
    "view_activity",
    "view_history",
    "create_task",
    "close_won",
    "close_lost",
    "correct_activity",
]


ROLE_DEFINITIONS = (
    ("admin", "Admin", ALL_PERMISSIONS),
    ("sales_manager", "Sales Manager", MANAGER_PERMISSIONS),
    ("salesperson", "Salesperson", SALESPERSON_PERMISSIONS),
)


def create_default_roles(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    User = apps.get_model("crm", "User")

    for key, name, permissions in ROLE_DEFINITIONS:
        Role.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
                "permissions": permissions,
            },
        )

    admin_role = Role.objects.get(key="admin")
    User.objects.filter(is_superuser=True, role__isnull=True).update(role=admin_role)


def remove_default_roles(apps, schema_editor):
    Role = apps.get_model("crm", "Role")
    Role.objects.filter(
        key__in=["admin", "sales_manager", "salesperson"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("crm", "0008_contact_optional_fields")]

    operations = [
        migrations.RunPython(create_default_roles, remove_default_roles),
    ]
