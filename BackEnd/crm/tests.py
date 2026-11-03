from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Contact, CrmSession, Deal, HistoryEvent, Notification, Product, Role, Source, User


@override_settings(DATABASE_URL="", EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthenticationSprintTests(TestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(key="auth-test-admin", name="Admin", permissions=["manage_users", "manage_catalogue", "view_leads", "capture_lead"])
        self.sales_role = Role.objects.create(key="auth-test-salesperson", name="Salesperson", permissions=["view_leads"])
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
        self.assertEqual(response.status_code, 423)

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
        self.admin_role = Role.objects.create(key="lead-test-admin", name="Admin", permissions=[p.value for p in __import__('crm.models', fromlist=['Permission']).Permission])
        self.sales_role = Role.objects.create(key="lead-test-salesperson", name="Salesperson", permissions=["view_leads", "capture_lead", "edit_lead", "set_lead_status", "view_history", "view_activity"])
        self.manager_role = Role.objects.create(key="lead-test-manager", name="Sales Manager", permissions=["view_leads", "capture_lead", "edit_lead", "set_lead_status", "reassign_lead", "delete_lead", "view_history", "view_activity"])
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

    def test_assignment_and_qualification_notifications_are_recipient_scoped(self):
        response = self.client.post(
            "/api/leads/",
            {"name": "Assigned Lead", "company": "Acme", "email": "assigned@example.com", "source": self.source.id, "owner": self.sales.id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        lead_id = response.data["id"]
        self.assertTrue(Notification.objects.filter(user=self.sales, event_type="record.assigned", target_id=str(lead_id)).exists())
        self.assertFalse(Notification.objects.filter(user=self.manager, event_type="record.assigned", target_id=str(lead_id)).exists())

        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/leads/{lead_id}/qualify/", {"status": "qualified"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Notification.objects.filter(user=self.sales, event_type="lead.qualified", target_id=str(lead_id)).exists())

        self.client.force_authenticate(self.sales)
        response = self.client.get("/api/notifications/?search=qualified")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["event_type"] == "lead.qualified" for item in response.data))
        qualified = next(item for item in response.data if item["event_type"] == "lead.qualified")
        self.assertEqual(qualified["target_url"], f"/leads?lead={lead_id}")
        response = self.client.post(f"/api/notifications/{qualified['id']}/read/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.data["read_at"])


class HistoryEpicTests(TestCase):
    def setUp(self):
        permissions = __import__("crm.models", fromlist=["Permission"]).Permission
        all_permissions = [p.value for p in permissions]
        self.admin_role, _ = Role.objects.get_or_create(key="admin-history", defaults={"name": "Admin", "permissions": all_permissions})
        self.manager_role = Role.objects.create(
            key="manager-history",
            name="Sales Manager",
            permissions=[
                "view_leads", "capture_lead", "edit_lead", "set_lead_status",
                "move_to_contact", "view_contacts", "edit_contact", "create_contact",
                "create_deal", "view_deals", "edit_deal", "edit_deal_value",
                "move_deal", "close_won", "close_lost", "delete_deal",
                "reassign_lead", "delete_lead", "reassign_contact",
                "view_activity", "log_activity",
            ],
        )
        self.reader_role = Role.objects.create(
            key="reader-history",
            name="Reader",
            permissions=["view_leads", "view_contacts", "view_deals", "view_workspace_records"],
        )
        self.manager = User.objects.create_user(
            username="history-manager@litecrm.local",
            email="history-manager@litecrm.local",
            password="Manager!234",
            role=self.manager_role,
        )
        self.reader = User.objects.create_user(
            username="history-reader@litecrm.local",
            email="history-reader@litecrm.local",
            password="Reader!234",
            role=self.reader_role,
        )
        self.source = Source.objects.create(name="History Website")
        self.product = Product.objects.create(name="History Product", default_value_minor=100000)
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

    def create_lead(self):
        response = self.client.post(
            "/api/leads/",
            {
                "name": "History Lead",
                "company": "History Co",
                "email": "history@example.com",
                "phone": "+919876543210",
                "source": self.source.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data["id"], response.data["record_id"]

    def test_history_is_system_only_append_only_and_readable_without_history_permission(self):
        lead_id, record_id = self.create_lead()
        events = HistoryEvent.objects.filter(record_id=record_id)
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().action, "lead_captured")

        self.client.force_authenticate(self.reader)
        response = self.client.get(f"/api/records/{record_id}/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["action"], "lead_captured")
        self.assertIn("action_label", response.data[0])
        self.assertIn("detail_text", response.data[0])

        for method in ("post", "put", "patch", "delete"):
            request = getattr(self.client, method)
            response = request(f"/api/records/{record_id}/history/", {}, format="json")
            self.assertEqual(response.status_code, 405)

        self.assertEqual(HistoryEvent.objects.filter(record_id=record_id).count(), 1)

    def test_history_runs_across_lead_contact_and_deal_lifecycle(self):
        lead_id, record_id = self.create_lead()

        response = self.client.post(f"/api/leads/{lead_id}/qualify/", {"status": "qualified"}, format="json")
        self.assertEqual(response.status_code, 200)

        response = self.client.post(f"/api/leads/{lead_id}/convert/", {}, format="json")
        self.assertEqual(response.status_code, 201)
        contact_id = response.data["contact"]["id"]

        response = self.client.post(
            f"/api/contacts/{contact_id}/deals/",
            {
                "product": self.product.id,
                "value_minor": 125000,
                "expected_close_date": "2026-12-31",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        deal_id = response.data["id"]

        response = self.client.patch(f"/api/deals/{deal_id}/", {"value_minor": 150000}, format="json")
        self.assertEqual(response.status_code, 200)

        response = self.client.post(f"/api/deals/{deal_id}/move/", {"stage": "won"}, format="json")
        self.assertEqual(response.status_code, 200)

        actions = list(HistoryEvent.objects.filter(record_id=record_id).values_list("action", flat=True))
        self.assertIn("lead_captured", actions)
        self.assertIn("qualified", actions)
        self.assertIn("moved_to_contacts", actions)
        self.assertIn("deal_created", actions)
        self.assertIn("deal_value_updated", actions)
        self.assertIn("deal_stage_changed", actions)
        self.assertIn("deal_won", actions)

    def test_history_deleted_event_is_recorded_only_after_successful_delete(self):
        lead_id, record_id = self.create_lead()
        response = self.client.delete(f"/api/leads/{lead_id}/")
        self.assertEqual(response.status_code, 204)
        actions = list(HistoryEvent.objects.filter(record_id=record_id).values_list("action", flat=True))
        self.assertEqual(actions[0], "deleted")
        self.assertIn("lead_captured", actions)


class WorkspaceAuditTests(TestCase):
    def setUp(self):
        # The migrations seed the production "admin" role. Reuse it instead
        # of creating another row with the same unique key.
        from .models import Permission as CrmPermission

        all_permissions = [permission.value for permission in CrmPermission]
        audit_permissions = [
            "view_audit",
            "manage_users",
            "manage_permissions",
            "export_audit",
        ]
        self.admin_role, _ = Role.objects.get_or_create(
            key="admin",
            defaults={
                "name": "Admin",
                "permissions": sorted(set(all_permissions + audit_permissions)),
            },
        )

        # Ensure the test admin has the audit capabilities even if the seeded
        # role's permission list differs between migration versions.
        current_permissions = set(self.admin_role.permissions or [])
        self.admin_role.permissions = sorted(
            current_permissions.union(all_permissions, audit_permissions)
        )
        self.admin_role.save(update_fields=["permissions"])

        self.reader_role = Role.objects.create(
            key="audit-test-reader",
            name="Reader",
            permissions=["view_leads"],
        )
        self.admin = User.objects.create_user(
            username="audit-admin@example.com",
            email="audit-admin@example.com",
            password="Admin!234",
            role=self.admin_role,
        )
        self.reader = User.objects.create_user(
            username="audit-reader@example.com",
            email="audit-reader@example.com",
            password="Reader!234",
            role=self.reader_role,
        )
        self.client = APIClient()

    def test_audit_list_requires_own_permission_and_records_view(self):
        self.client.force_authenticate(self.reader)
        denied = self.client.get("/api/audit/")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/audit/", HTTP_USER_AGENT="Audit Test Browser", REMOTE_ADDR="192.0.2.10")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["action"] == "audit.viewed" for item in response.data["results"]))

    def test_audit_events_are_immutable_through_model_api(self):
        from .models import AuditEvent
        event = AuditEvent.objects.create(actor=self.admin, action="test.created", target_type="Test", target_id="1")
        with self.assertRaises(ValueError):
            AuditEvent.objects.filter(pk=event.pk).update(action="tampered")
        with self.assertRaises(ValueError):
            event.delete()
        self.assertEqual(AuditEvent.objects.get(pk=event.pk).action, "test.created")

    def test_admin_can_export_audit_for_required_date_range(self):
      self.client.force_authenticate(self.admin)
      today = timezone.localdate().isoformat()

      response = self.client.get(
          f"/api/audit/?export=csv&date_from={today}&date_to={today}"
                      )

      self.assertEqual(response.status_code, 200)
      self.assertIn("text/csv", response["Content-Type"])

      csv_content = response.content.decode("utf-8")
      self.assertIn("Correlation ID", csv_content)

    def test_admin_can_export_all_audit_events_without_date_filters(self):
        from .models import AuditEvent

        AuditEvent.objects.create(
            actor=self.admin,
            action="test.export_without_dates",
            target_type="Test",
            target_id="all-records",
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/audit/?export=csv")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn(
            "test.export_without_dates",
            response.content.decode("utf-8"),
        )
        self.assertIn(
            "litecrm-audit-all-records.csv",
            response["Content-Disposition"],
        )

