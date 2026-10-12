from django.core.management.base import BaseCommand
from crm.models import Permission, Product, Role, Source, User


ALL_PERMISSIONS = [value for value, _ in Permission.choices]

ADMIN_PERMISSIONS = ALL_PERMISSIONS
MANAGER_PERMISSIONS = [p for p in ALL_PERMISSIONS if p not in {
    "manage_users", "manage_permissions", "manage_catalogue", "manage_configuration", "view_audit"
}]
SALESPERSON_PERMISSIONS = [
    "view_leads", "capture_lead", "edit_lead", "set_lead_status", "move_to_contact",
    "view_contacts", "edit_contact", "create_deal", "view_deals", "edit_deal",
    "edit_deal_value", "move_deal", "log_activity", "view_activity", "view_history",
    "create_task","close_won", "close_lost", "correct_activity",
]


class Command(BaseCommand):
    help = "Creates the three baseline roles, catalogue, sources and local test users."

    def handle(self, *args, **options):
        roles = {
            "admin": ("Admin", ADMIN_PERMISSIONS),
            "sales_manager": ("Sales Manager", MANAGER_PERMISSIONS),
            "salesperson": ("Salesperson", SALESPERSON_PERMISSIONS),
        }
        created_roles = {}
        for key, (name, permissions) in roles.items():
            created_roles[key], _ = Role.objects.update_or_create(key=key, defaults={"name": name, "permissions": permissions})
        for name in ("Website", "LinkedIn", "Referral", "Facebook", "Other"):
            Source.objects.get_or_create(name=name)
        for name in ("CRM Licence", "Implementation", "Website Development", "Data Migration", "Training & Onboarding", "Support Retainer"):
            Product.objects.get_or_create(name=name)

        users = [
            ("admin@litecrm.local", "Admin", "User", "admin", "Admin!234", True),
            ("manager@litecrm.local", "Sales", "Manager", "sales_manager", "Manager!234", False),
            ("sales@litecrm.local", "Sales", "Person", "salesperson", "Sales!234", False),
        ]
        for username, first, last, role_key, password, staff in users:
            user, created = User.objects.get_or_create(username=username, defaults={"email": username, "first_name": first, "last_name": last})
            user.email = username
            user.first_name = first
            user.last_name = last
            user.role = created_roles[role_key]
            user.is_active = True
            user.is_staff = False
            user.is_superuser = False
            user.failed_login_attempts = 0
            user.locked_until = None
            if created:
                user.set_password(password)
            user.save()
        self.stdout.write(self.style.SUCCESS("LiteCRM authentication and permission baseline is ready."))
