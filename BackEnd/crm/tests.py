from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import CrmSession, Lead, Role, User


@override_settings(DATABASE_URL="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthenticationSprintTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(key="admin", name="Admin", permissions=["manage_users", "manage_catalogue", "view_leads", "capture_lead"])
        self.sales_role = Role.objects.create(key="salesperson", name="Salesperson", permissions=["view_leads"])
        self.admin = User.objects.create_user(username="Admin@LiteCRM.Local", email="Admin@LiteCRM.Local", password="Admin!234", role=self.admin_role)
        self.sales = User.objects.create_user(username="sales@litecrm.local", email="sales@litecrm.local", password="Sales!234", role=self.sales_role)
        self.client = APIClient(enforce_csrf_checks=True)

    def login(self, identifier="Admin@LiteCRM.Local", password="Admin!234"):
        self.client.get("/api/auth/csrf/")
        token = self.client.cookies["csrftoken"].value
        return self.client.post("/api/auth/login/", {"username": identifier, "password": password}, HTTP_X_CSRFTOKEN=token)

    def test_email_login_is_case_insensitive_and_returns_permission_data(self):
        response = self.login("admin@litecrm.local")
        self.assertEqual(response.status_code, 200)
        self.assertIn("manage_users", response.data["permissions"])
        self.assertEqual(response.data["role"], "Admin")

    def test_mobile_login(self):
        self.admin.mobile = "+919876543210"
        self.admin.save(update_fields=["mobile"])
        response = self.login("+91 9876543210")
        self.assertEqual(response.status_code, 200)

    def test_invalid_and_unknown_account_have_same_response(self):
        bad_password = self.login("admin@litecrm.local", "Wrong!234")
        unknown = self.login("nobody@litecrm.local", "Wrong!234")
        self.assertEqual(bad_password.status_code, unknown.status_code)
        self.assertEqual(bad_password.data, unknown.data)

    def test_five_failures_lock_account_and_correct_password_is_refused(self):
        for _ in range(5):
            response = self.login("admin@litecrm.local", "Wrong!234")
            self.assertEqual(response.status_code, 401)
        self.admin.refresh_from_db()
        self.assertIsNotNone(self.admin.locked_until)
        response = self.login("admin@litecrm.local", "Admin!234")
        self.assertEqual(response.status_code, 401)

    def test_permission_denied_is_server_side(self):
        self.client.force_authenticate(user=self.sales)
        response = self.client.get("/api/leads/")
        self.assertEqual(response.status_code, 200)
        response = self.client.post("/api/leads/", {})
        self.assertEqual(response.status_code, 403)

    def test_password_change_revokes_other_sessions(self):
        self.assertEqual(self.login().status_code, 200)
        current_key = self.client.session.session_key
        other = CrmSession.objects.create(session_key="other-session-key", user=self.admin)
        response = self.client.post("/api/auth/password/change/", {"current_password": "Admin!234", "new_password": "NewAdmin!234"}, format="json", HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CrmSession.objects.filter(pk=other.pk, revoked_at__isnull=True).exists())
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password("NewAdmin!234"))
        self.assertTrue(CrmSession.objects.filter(user=self.admin, revoked_at__isnull=True).exists())

    @patch("crm.views.send_mail")
    def test_password_reset_is_single_use_and_expires(self, send_mail):
        response = self.client.post("/api/auth/password/reset/request/", {"identifier": "ADMIN@LITECRM.LOCAL"}, format="json")
        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()
        code = send_mail.call_args.args[1].split(" is ")[1].split(".")[0]
        response = self.client.post("/api/auth/password/reset/confirm/", {"identifier": "admin@litecrm.local", "code": code, "new_password": "ResetAdmin!234"}, format="json")
        self.assertEqual(response.status_code, 200)
        response = self.client.post("/api/auth/password/reset/confirm/", {"identifier": "admin@litecrm.local", "code": code, "new_password": "ResetAdmin!234"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_sessions_can_be_listed_and_revoked_everywhere(self):
        self.assertEqual(self.login().status_code, 200)
        response = self.client.get("/api/auth/sessions/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data[0]["current"])
        response = self.client.post("/api/auth/sessions/revoke-all/", {}, format="json", HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value)
        self.assertEqual(response.status_code, 204)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_inactivity_ends_session(self):
        self.assertEqual(self.login().status_code, 200)
        session = CrmSession.objects.get(user=self.admin)
        session.last_seen_at = timezone.now() - timedelta(minutes=61)
        session.save(update_fields=["last_seen_at"])
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

class LeadSprintTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(key="admin", name="Admin", permissions=[p.value for p in __import__('crm.models', fromlist=['Permission']).Permission])
        self.sales_role = Role.objects.create(key="salesperson", name="Salesperson", permissions=["view_leads", "capture_lead", "edit_lead", "set_lead_status", "view_history", "view_activity"])
        self.manager_role = Role.objects.create(key="manager", name="Sales Manager", permissions=["view_leads", "capture_lead", "edit_lead", "set_lead_status", "reassign_lead", "delete_lead", "view_history", "view_activity"])
        self.admin = User.objects.create_user(username="admin@litecrm.local", email="admin@litecrm.local", password="Admin!234", role=self.admin_role)
        self.manager = User.objects.create_user(username="manager@litecrm.local", email="manager@litecrm.local", password="Manager!234", role=self.manager_role)
        self.sales = User.objects.create_user(username="sales@litecrm.local", email="sales@litecrm.local", password="Sales!234", role=self.sales_role)
        self.source = __import__('crm.models', fromlist=['Source']).Source.objects.create(name="Website")
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

    def test_create_normalizes_phone_and_owner_is_logged_in_user(self):
        response = self.client.post("/api/leads/", {"name": "Test", "company": "Acme", "email": "TEST@EXAMPLE.COM", "phone": "+91 9876543210", "source": self.source.id}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["phone"], "+919876543210")
        self.assertEqual(response.data["owner_id"], self.manager.id)

    def test_reassign_requires_permission_and_changes_scope(self):
        response = self.client.post("/api/leads/", {"name": "Test", "company": "Acme", "email": "reassign@example.com", "source": self.source.id}, format="json")
        lead_id = response.data["id"]
        response = self.client.post(f"/api/leads/{lead_id}/reassign/", {"owner": self.sales.id}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["owner_id"], self.sales.id)
        self.client.force_authenticate(self.sales)
        self.assertEqual(self.client.get("/api/leads/").data["count"], 1)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get("/api/leads/").data["count"], 0)

    def test_delete_is_soft_and_hidden_from_list(self):
        response = self.client.post("/api/leads/", {"name": "Test", "company": "Acme", "email": "delete@example.com", "source": self.source.id}, format="json")
        lead_id = response.data["id"]
        response = self.client.delete(f"/api/leads/{lead_id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/leads/").data["count"], 0)

@override_settings(DATABASE_URL="", PASSWORD_HASHERS=["django.contrib.auth.hashers.PBKDF2PasswordHasher"])
class LeadContactUniquenessTests(TestCase):
    def setUp(self):
        from crm.models import Permission, Source

        self.admin_role = Role.objects.create(
            key="admin",
            name="Admin",
            permissions=[p.value for p in Permission],
        )
        self.admin = User.objects.create_user(
            username="admin-unique@litecrm.local",
            email="admin-unique@litecrm.local",
            password="Admin!234",
            role=self.admin_role,
        )
        self.source = Source.objects.create(name="Website")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def create_lead(self, **overrides):
        payload = {
            "name": "Lead One",
            "email": "person@example.com",
            "phone": "+919876543210",
            "source": self.source.id,
        }
        payload.update(overrides)
        return self.client.post("/api/leads/", payload, format="json")

    def create_contact(self, **overrides):
        payload = {
            "name": "Contact One",
            "email": "contact@example.com",
            "phone": "+919812345678",
            "source": self.source.id,
        }
        payload.update(overrides)
        return self.client.post("/api/contacts/", payload, format="json")

    def test_lead_rejects_duplicate_email_across_leads(self):
        self.assertEqual(self.create_lead().status_code, 201)
        response = self.create_lead(name="Lead Two", phone="+919811112222")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_lead_rejects_duplicate_phone_across_contacts(self):
        self.assertEqual(self.create_contact().status_code, 201)
        response = self.create_lead(email="new@example.com", phone="+919812345678")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)

    def test_contact_rejects_duplicate_email_across_leads(self):
        self.assertEqual(self.create_lead().status_code, 201)
        response = self.create_contact(email="person@example.com", phone="+919899999999")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_contact_rejects_duplicate_phone_across_contacts(self):
        self.assertEqual(self.create_contact().status_code, 201)
        response = self.create_contact(name="Contact Two", email="other@example.com")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)

    def test_same_record_can_be_updated_without_false_duplicate_error(self):
        created = self.create_lead()
        self.assertEqual(created.status_code, 201)
        lead_id = created.data["id"]
        response = self.client.patch(
            f"/api/leads/{lead_id}/",
            {"name": "Lead One Updated"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "person@example.com")

    def test_lead_conversion_keeps_its_own_email_and_phone(self):
        created = self.create_lead()
        self.assertEqual(created.status_code, 201)
        lead_id = created.data["id"]
        self.assertEqual(
            self.client.post(
                f"/api/leads/{lead_id}/qualify/",
                {"status": "qualified"},
                format="json",
            ).status_code,
            200,
        )
        response = self.client.post(f"/api/leads/{lead_id}/convert/", format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["contact"]["email"], "person@example.com")
        self.assertEqual(response.data["contact"]["phone"], "+919876543210")

    def test_lead_cannot_convert_if_another_contact_uses_the_same_identity(self):
        from crm.models import Contact, Record

        # Simulate an older/legacy record that already has the mobile number.
        Contact.objects.create(
            record=Record.objects.create(owner=self.admin),
            name="Existing Contact",
            email="other@example.com",
            phone="+919876543210",
        )
        lead = Lead.objects.create(
            record=Record.objects.create(owner=self.admin),
            name="Qualified Lead",
            email="lead@example.com",
            phone="+919876543210",
            source=self.source,
            status=Lead.Status.QUALIFIED,
        )

        response = self.client.post(f"/api/leads/{lead.id}/convert/", format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)
