from datetime import timedelta
import csv
import io
import json
import hashlib
import secrets
from django.contrib.auth import login, logout
from django.contrib.sessions.models import Session
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models.deletion import ProtectedError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Activity, Contact, CrmSession, Deal, Lead, Notification, PasswordResetToken, Permission, Product, Record, Role, Source, Task, User, LearningMode, CourseDuration
from .serializers import ActivitySerializer, ContactSerializer, DealSerializer, HistorySerializer, LeadSerializer, ProductSerializer, RoleSerializer, SourceSerializer, TaskSerializer, UserSummarySerializer, LearningModeSerializer, CourseDurationSerializer
from .services import assert_visible, audit, convert_lead, history, record_is_visible
from .authentication import find_user, normalize_identifier


def visible_records(user):
    query = Record.objects.all()
    return query if user.has_crm_permission("view_workspace_records") else query.filter(owner=user)


def require_permission(request, key):
    if not request.user.has_crm_permission(key):
        raise PermissionDenied("You do not have permission to perform this action.")


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_key = "view_leads"

    def get_queryset(self):
        query = Lead.objects.filter(
            record__in=visible_records(self.request.user),
            deleted_at__isnull=True,
        ).select_related("record__owner", "source", "product", "learning_mode", "course_duration")
        search = self.request.query_params.get("search", "").strip()
        if search:
            query = query.filter(Q(name__icontains=search) | Q(company__icontains=search) | Q(email__icontains=search))
        status_value = self.request.query_params.get("status")
        if status_value:
            query = query.filter(status=status_value)
        source_value = self.request.query_params.get("source")
        if source_value:
            query = query.filter(source_id=source_value)
        owner_value = self.request.query_params.get("owner")
        if owner_value:
            query = query.filter(record__owner_id=owner_value)
        return query.order_by("-created_at", "-id")

    def list(self, request, *args, **kwargs):
        require_permission(request, "view_leads")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        require_permission(request, "view_leads")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        require_permission(request, "capture_lead")
        payload = request.data.copy()
        owner_id = payload.pop("owner", None) or request.user.id
        try:
            owner_id = int(owner_id)
        except (TypeError, ValueError):
            return Response({"owner": "Invalid owner."}, status=400)
        owner = User.objects.filter(pk=owner_id, is_active=True).first()
        if not owner:
            return Response({"owner": "Owner must be an active user."}, status=400)
        if owner.id != request.user.id and not request.user.has_crm_permission("reassign_lead"):
            return Response({"detail": "You do not have permission to assign this lead to another user."}, status=403)
        if payload.get("status") == Lead.Status.QUALIFIED and not request.user.has_crm_permission("set_lead_status"):
            return Response(status=403)
        if not payload.get("source"):
            fallback_source = Source.objects.filter(name="Other", active=True).first()
            if fallback_source:
                payload["source"] = fallback_source.id
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        email = (serializer.validated_data.get("email") or "").strip()
        duplicate_warning = (
            Lead.objects.filter(email__iexact=email, deleted_at__isnull=True).exists()
            if email
            else False
        )
        lead = serializer.save(record=Record.objects.create(owner=owner))
        history(
            lead.record,
            request.user,
            "lead_captured",
            {"source": lead.source.name if lead.source else None, "owner_id": owner.id},
        )
        audit(request.user, "lead.created", lead, after=serializer.data)
        response_data = self.get_serializer(lead).data
        response_data["duplicate_warning"] = duplicate_warning
        return Response(response_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        require_permission(request, "edit_lead")
        return self._update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        require_permission(request, "edit_lead")
        return self._update(request, *args, partial=True, **kwargs)

    def _update(self, request, *args, partial=False, **kwargs):
        lead = self.get_object()
        payload = request.data.copy()
        has_owner_change = "owner" in payload
        owner_value = payload.pop("owner", None) if has_owner_change else None
        if owner_value is not None:
            try:
                owner_id = int(owner_value)
            except (TypeError, ValueError):
                return Response({"owner": "Invalid owner."}, status=400)
            if not request.user.has_crm_permission("reassign_lead") and owner_id != lead.record.owner_id:
                return Response(status=403)
            owner = User.objects.filter(pk=owner_id, is_active=True).first()
            if not owner:
                return Response({"owner": "Owner must be an active user."}, status=400)
        if "status" in payload and payload.get("status") != lead.status:
            if not request.user.has_crm_permission("set_lead_status"):
                return Response(status=403)
            if payload.get("status") not in Lead.Status.values:
                return Response({"status": "Invalid lead status."}, status=400)
            # Disqualification reason is optional. Validate it only when supplied.
            if payload.get("status") == Lead.Status.NOT_QUALIFIED and payload.get("disqualification_reason"):
                reason = str(payload.get("disqualification_reason") or "").strip()
                allowed = {"no budget", "no need", "too small", "wrong fit", "went elsewhere", "no response", "other"}
                if reason not in allowed:
                    return Response({"disqualification_reason": "Choose a valid disqualification reason."}, status=400)
                if reason == "other" and payload.get("notes") and len((payload.get("notes") or "").strip()) < 5:
                    return Response({"notes": "Please provide a sentence explaining the reason."}, status=400)
        before = self.get_serializer(lead).data
        serializer = self.get_serializer(lead, data=payload, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        if has_owner_change:
            old_owner = lead.record.owner_id
            new_owner = int(owner_value)
            if old_owner != new_owner:
                lead.record.owner_id = new_owner
                lead.record.save(update_fields=["owner"])
                history(lead.record, request.user, "lead_reassigned", {"from_owner_id": old_owner, "to_owner_id": new_owner})
                audit(request.user, "lead.reassigned", lead, before={"owner_id": old_owner}, after={"owner_id": new_owner})
        if "status" in payload and payload.get("status") != before.get("status"):
            history(lead.record, request.user, "lead_status_changed", {"from": before.get("status"), "to": updated.status, "reason": updated.disqualification_reason})
        if any(field in payload for field in ("name", "company", "email", "phone", "source", "product", "learning_mode", "course_duration", "town_city", "notes")):
            audit(request.user, "lead.updated", updated, before=before, after=self.get_serializer(updated).data)
            history(lead.record, request.user, "lead_updated", {"changed_fields": list(payload.keys())})
        return Response(self.get_serializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        require_permission(request, "delete_lead")
        lead = self.get_object()
        lead.deleted_at = timezone.now()
        lead.save(update_fields=["deleted_at"])
        history(lead.record, request.user, "lead_deleted", {"name": lead.name, "company": lead.company})
        audit(request.user, "lead.deleted", lead, after={"deleted_at": lead.deleted_at.isoformat()})
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def qualify(self, request, pk=None):
        require_permission(request, "set_lead_status")
        lead = self.get_object()
        new_status = request.data.get("status")
        reason = (request.data.get("reason") or "").strip()
        if new_status not in Lead.Status.values:
            return Response({"status": "Invalid lead status."}, status=400)
        if new_status == Lead.Status.NOT_QUALIFIED and reason:
            allowed = {"no budget", "no need", "too small", "wrong fit", "went elsewhere", "no response", "other"}
            if reason not in allowed:
                return Response({"reason": "Choose a valid disqualification reason."}, status=400)
            if reason == "other" and request.data.get("details") and len((request.data.get("details") or "").strip()) < 5:
                return Response({"details": "Please provide a sentence explaining the reason."}, status=400)
        old = lead.status
        lead.status = new_status
        lead.disqualification_reason = reason if new_status == Lead.Status.NOT_QUALIFIED else ""
        lead.save(update_fields=["status", "disqualification_reason"])
        history(lead.record, request.user, "lead_status_changed", {"from": old, "to": new_status, "reason": lead.disqualification_reason})
        audit(request.user, "lead.status_changed", lead, before={"status": old}, after={"status": new_status, "reason": lead.disqualification_reason})
        return Response(self.get_serializer(lead).data)

    @action(detail=True, methods=["post"])
    def reassign(self, request, pk=None):
        require_permission(request, "reassign_lead")
        lead = self.get_object()
        owner = User.objects.filter(pk=request.data.get("owner"), is_active=True).first()
        if not owner:
            return Response({"owner": "Owner must be an active user."}, status=400)
        old_owner = lead.record.owner_id
        if old_owner == owner.id:
            return Response(self.get_serializer(lead).data)
        lead.record.owner = owner
        lead.record.save(update_fields=["owner"])
        history(lead.record, request.user, "lead_reassigned", {"from_owner_id": old_owner, "to_owner_id": owner.id})
        audit(request.user, "lead.reassigned", lead, before={"owner_id": old_owner}, after={"owner_id": owner.id})
        return Response(self.get_serializer(lead).data)

    @action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        require_permission(request, "move_to_contact")
        lead = self.get_object()
        contact, activity_count = convert_lead(lead, request.user)
        return Response({"contact": ContactSerializer(contact).data, "activity_count": activity_count}, status=201)

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        require_permission(request, "import_leads")
        response = Response("name,company,email,phone,product,learning_mode,course_duration,town_city,source,status,notes\n", content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="litecrm-leads-template.csv"'
        return response

    @action(detail=False, methods=["post"], url_path="import")
    def import_leads(self, request):
        require_permission(request, "import_leads")
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a CSV or XLSX file."}, status=400)
        try:
            if upload.name.lower().endswith(".xlsx"):
                from openpyxl import load_workbook
                workbook = load_workbook(upload, read_only=True, data_only=True)
                sheet = workbook.active
                rows = list(sheet.iter_rows(values_only=True))
                if not rows:
                    return Response({"detail": "The file is empty."}, status=400)
                headers = [str(value or "").strip() for value in rows[0]]
                data_rows = [dict(zip(headers, row)) for row in rows[1:]]
            elif upload.name.lower().endswith(".csv"):
                text = upload.read().decode("utf-8-sig")
                reader = csv.DictReader(io.StringIO(text))
                headers = reader.fieldnames or []
                data_rows = list(reader)
            else:
                return Response({"detail": "Only CSV and XLSX files are supported."}, status=400)
        except Exception:
            return Response({"detail": "The file could not be read safely."}, status=400)
        normalized = {h.strip().lower(): h for h in headers}
        required = {"name", "company", "email"}
        missing = sorted(required - set(normalized))
        if missing:
            return Response({"headers": headers, "missing": missing, "rows": []}, status=400)
        preview_rows = []
        errors = []
        existing = set(Lead.objects.filter(deleted_at__isnull=True).values_list("email", flat=True))
        duplicate_action = request.data.get("duplicate_action", "skip")
        for index, raw in enumerate(data_rows, start=2):
            row = {key.lower().strip(): (value if value is not None else "") for key, value in raw.items()}
            email = str(row.get("email", "")).strip().lower()
            row_errors = []
            if not row.get("name"): row_errors.append("Name is required")
            if not row.get("company"): row_errors.append("Company is required")
            if "@" not in email: row_errors.append("Invalid email")
            source_name = str(row.get("source", "")).strip()
            product_name = str(row.get("product", row.get("course interested", ""))).strip()
            learning_mode_name = str(row.get("learning_mode", row.get("preferred learning mode", ""))).strip()
            course_duration_name = str(row.get("course_duration", row.get("preferred course duration", ""))).strip()
            if source_name and not Source.objects.filter(name__iexact=source_name, active=True).exists(): row_errors.append("Invalid source")
            if product_name and not Product.objects.filter(name__iexact=product_name, active=True).exists(): row_errors.append("Invalid product")
            if learning_mode_name and not LearningMode.objects.filter(name__iexact=learning_mode_name, active=True).exists(): row_errors.append("Invalid learning mode")
            if course_duration_name and not CourseDuration.objects.filter(name__iexact=course_duration_name, active=True).exists(): row_errors.append("Invalid course duration")
            if email in existing and duplicate_action == "skip": row_errors.append("Duplicate email")
            if row_errors: errors.append({"row": index, "errors": row_errors})
            if len(preview_rows) < 25:
                preview_rows.append({"row": index, "data": row, "errors": row_errors})
        if request.data.get("mode", "preview") != "import":
            return Response({"headers": headers, "preview": preview_rows, "errors": errors, "total_rows": len(data_rows)})
        imported = 0
        skipped = 0
        batch_id = secrets.token_hex(8)
        for index, raw in enumerate(data_rows, start=2):
            row = {key.lower().strip(): (value if value is not None else "") for key, value in raw.items()}
            email = str(row.get("email", "")).strip().lower()
            row_errors = []
            if not row.get("name"): row_errors.append("Name is required")
            if not row.get("company"): row_errors.append("Company is required")
            if "@" not in email: row_errors.append("Invalid email")
            source_name = str(row.get("source", "")).strip()
            product_name = str(row.get("product", row.get("course interested", ""))).strip()
            learning_mode_name = str(row.get("learning_mode", row.get("preferred learning mode", ""))).strip()
            course_duration_name = str(row.get("course_duration", row.get("preferred course duration", ""))).strip()
            if source_name and not Source.objects.filter(name__iexact=source_name, active=True).exists(): row_errors.append("Invalid source")
            if product_name and not Product.objects.filter(name__iexact=product_name, active=True).exists(): row_errors.append("Invalid product")
            if learning_mode_name and not LearningMode.objects.filter(name__iexact=learning_mode_name, active=True).exists(): row_errors.append("Invalid learning mode")
            if course_duration_name and not CourseDuration.objects.filter(name__iexact=course_duration_name, active=True).exists(): row_errors.append("Invalid course duration")
            is_duplicate = email in existing
            if is_duplicate and duplicate_action == "skip": row_errors.append("Duplicate email")
            if row_errors and not (duplicate_action == "import_anyway" and row_errors == ["Duplicate email"]):
                skipped += 1
                continue
            source = Source.objects.filter(name__iexact=source_name, active=True).first() or Source.objects.filter(name="Other", active=True).first()
            if not source:
                skipped += 1
                continue
            if duplicate_action == "update" and is_duplicate:
                lead = Lead.objects.filter(email=email, deleted_at__isnull=True).first()
                if lead:
                    lead.name = str(row.get("name", lead.name)).strip()
                    lead.company = str(row.get("company", lead.company)).strip()
                    lead.phone = str(row.get("phone", lead.phone)).strip()
                    product_name = str(row.get("product", row.get("course interested", ""))).strip()
                    learning_mode_name = str(row.get("learning_mode", row.get("preferred learning mode", ""))).strip()
                    course_duration_name = str(row.get("course_duration", row.get("preferred course duration", ""))).strip()
                    lead.product = Product.objects.filter(name__iexact=product_name, active=True).first() if product_name else None
                    lead.learning_mode = LearningMode.objects.filter(name__iexact=learning_mode_name, active=True).first() if learning_mode_name else None
                    lead.course_duration = CourseDuration.objects.filter(name__iexact=course_duration_name, active=True).first() if course_duration_name else None
                    lead.town_city = str(row.get("town_city", row.get("town/city", ""))).strip()
                    lead.notes = str(row.get("notes", row.get("lead feedback", lead.notes)))
                    lead.save(update_fields=["name", "company", "phone", "product", "learning_mode", "course_duration", "town_city", "notes"])
                    history(lead.record, request.user, "lead_imported", {"batch_id": batch_id, "mode": "update", "row": index})
                    imported += 1
                    continue
            lead = Lead.objects.create(
                record=Record.objects.create(owner=request.user),
                name=str(row.get("name", "")).strip(),
                company=str(row.get("company", "")).strip(),
                email=email,
                phone=str(row.get("phone", "")).strip(),
                source=source,
                product=Product.objects.filter(name__iexact=str(row.get("product", row.get("course interested", ""))).strip(), active=True).first() or None,
                learning_mode=LearningMode.objects.filter(name__iexact=str(row.get("learning_mode", row.get("preferred learning mode", ""))).strip(), active=True).first() or None,
                course_duration=CourseDuration.objects.filter(name__iexact=str(row.get("course_duration", row.get("preferred course duration", ""))).strip(), active=True).first() or None,
                town_city=str(row.get("town_city", row.get("town/city", ""))).strip(),
                status=Lead.Status.QUALIFIED if str(row.get("status", "")).strip().lower() == "qualified" else Lead.Status.NOT_QUALIFIED,
                notes=str(row.get("notes", row.get("lead feedback", ""))),
            )
            history(lead.record, request.user, "lead_imported", {"batch_id": batch_id, "row": index})
            imported += 1
            existing.add(email)
        return Response({"batch_id": batch_id, "imported": imported, "skipped": skipped, "errors": errors, "total_rows": len(data_rows)})


class RoleViewSet(viewsets.ViewSet):
    """Admin-only API for viewing and managing CRM roles and permissions."""

    ROLE_KEYS = {"admin", "sales_manager", "salesperson"}

    def _require_permission(self, request):
        require_permission(request, "manage_permissions")

    def list(self, request):
        self._require_permission(request)
        roles = Role.objects.all().order_by("id")
        return Response(RoleSerializer(roles, many=True).data)

    def retrieve(self, request, pk=None):
        self._require_permission(request)
        role = Role.objects.filter(pk=pk).first()
        if not role:
            return Response({"detail": "Role not found."}, status=404)
        return Response(RoleSerializer(role).data)

    def create(self, request):
        self._require_permission(request)
        key = str(request.data.get("key", "")).strip().lower()
        name = str(request.data.get("name", "")).strip()
        permissions = request.data.get("permissions", [])

        if not key:
            return Response({"key": "Role key is required."}, status=400)
        if key not in self.ROLE_KEYS:
            return Response({"key": "Choose admin, sales_manager, or salesperson."}, status=400)
        if not name:
            return Response({"name": "Role name is required."}, status=400)
        if not isinstance(permissions, list):
            return Response({"permissions": "Permissions must be a list."}, status=400)

        valid_permissions = {value for value, _ in Permission.choices}
        invalid = sorted(set(permissions) - valid_permissions)
        if invalid:
            return Response({"permissions": f"Invalid permissions: {', '.join(invalid)}."}, status=400)
        if Role.objects.filter(key=key).exists():
            return Response({"key": "A role with this key already exists."}, status=400)

        role = Role.objects.create(key=key, name=name, permissions=permissions)
        audit(request.user, "role.created", role, after=RoleSerializer(role).data)
        return Response(RoleSerializer(role).data, status=201)

    def update(self, request, pk=None):
        return self._update(request, pk, partial=False)

    def partial_update(self, request, pk=None):
        return self._update(request, pk, partial=True)

    def _update(self, request, pk=None, partial=False):
        self._require_permission(request)
        role = Role.objects.filter(pk=pk).first()
        if not role:
            return Response({"detail": "Role not found."}, status=404)

        data = request.data
        if "key" in data:
            key = str(data.get("key", "")).strip().lower()
            if key not in self.ROLE_KEYS:
                return Response({"key": "Choose admin, sales_manager, or salesperson."}, status=400)
            if Role.objects.filter(key=key).exclude(pk=role.pk).exists():
                return Response({"key": "A role with this key already exists."}, status=400)
            role.key = key
        elif not partial:
            return Response({"key": "Role key is required."}, status=400)

        if "name" in data:
            name = str(data.get("name", "")).strip()
            if not name:
                return Response({"name": "Role name is required."}, status=400)
            role.name = name
        elif not partial:
            return Response({"name": "Role name is required."}, status=400)

        if "permissions" in data:
            permissions = data.get("permissions")
            if not isinstance(permissions, list):
                return Response({"permissions": "Permissions must be a list."}, status=400)
            valid_permissions = {value for value, _ in Permission.choices}
            invalid = sorted(set(permissions) - valid_permissions)
            if invalid:
                return Response({"permissions": f"Invalid permissions: {', '.join(invalid)}."}, status=400)
            role.permissions = permissions

        role.save()
        audit(request.user, "role.updated", role, after=RoleSerializer(role).data)
        return Response(RoleSerializer(role).data)


class UserViewSet(viewsets.ViewSet):
    """Admin user-management API plus active-user lookup for CRM assignments."""

    ROLE_KEYS = {"admin", "sales_manager", "salesperson"}

    def _require_admin(self, request):
        if not request.user.has_crm_permission("manage_users"):
            raise PermissionDenied("Only Admin users can manage users.")

    @staticmethod
    def _serialize_user(user):
        return {
            "id": user.id,
            "username": user.username,
            "display_name": user.get_full_name() or user.username or user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "mobile": user.mobile,
            "role": user.role.key if user.role else None,
            "role_name": user.role.name if user.role else None,
            "is_active": user.is_active,
            "must_change_password": user.must_change_password,
        }

    def list(self, request):
        # Admins need the complete user list for User Management.
        # Sales Managers / Salespersons only need the active-user subset when
        # they have permission to reassign leads. This keeps the user-management
        # API protected while still allowing the Lead Owner dropdown to hydrate.
        if request.user.has_crm_permission("manage_users"):
            users = User.objects.select_related("role").order_by(
                "first_name", "last_name", "email"
            )
        elif request.user.has_crm_permission("reassign_lead"):
            users = User.objects.select_related("role").filter(
                is_active=True
            ).order_by("first_name", "last_name", "email")
        else:
            raise PermissionDenied(
                "You do not have permission to view users for lead assignment."
            )

        return Response([self._serialize_user(user) for user in users])

    def retrieve(self, request, pk=None):
        self._require_admin(request)
        user = User.objects.select_related("role").filter(pk=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        return Response(self._serialize_user(user))

    def create(self, request):
        self._require_admin(request)
        data = request.data
        email = str(data.get("email", "")).strip().lower()
        username = str(data.get("username") or email).strip()
        first_name = str(data.get("first_name", "")).strip()
        last_name = str(data.get("last_name", "")).strip()
        mobile = str(data.get("mobile") or "").strip()
        role_key = str(data.get("role", "")).strip()
        password = str(data.get("password", ""))

        if not email:
            return Response({"email": "Email is required."}, status=400)
        if not first_name:
            return Response({"first_name": "First name is required."}, status=400)
        if not role_key:
            return Response({"role": "Role is required."}, status=400)
        if role_key not in self.ROLE_KEYS:
            return Response({"role": "Choose Admin, Sales Manager, or Salesperson."}, status=400)
        if not password:
            return Response({"password": "Password is required."}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return Response({"username": "A user with this username already exists."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": "A user with this email already exists."}, status=400)
        if mobile and User.objects.filter(mobile=mobile).exists():
            return Response({"mobile": "A user with this mobile number already exists."}, status=400)

        try:
            validate_password(password)
        except Exception as exc:
            return Response({"password": "; ".join(exc.messages)}, status=400)
        if not any(c.isupper() for c in password) or not any(not c.isalnum() for c in password):
            return Response({"password": "Password must contain an uppercase letter and a special character."}, status=400)

        role = Role.objects.filter(key=role_key).first()
        if not role:
            return Response({"role": "The selected role has not been configured."}, status=400)

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            mobile=mobile or None,
            role=role,
            is_active=bool(data.get("is_active", True)),
            must_change_password=True,
        )
        user.set_password(password)
        user.save()

        audit(request.user, "user.created", user, after={"username": user.username, "email": user.email, "role": role.key, "is_active": user.is_active})
        return Response(self._serialize_user(user), status=201)

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk, partial=True)

    def update(self, request, pk=None):
        return self._update_user(request, pk, partial=False)

    def _update_user(self, request, pk, partial=False):
        self._require_admin(request)
        user = User.objects.select_related("role").filter(pk=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)

        data = request.data
        if not partial or "first_name" in data:
            user.first_name = str(data.get("first_name", "")).strip()
        if not partial or "last_name" in data:
            user.last_name = str(data.get("last_name", "")).strip()
        if "email" in data:
            email = str(data.get("email", "")).strip().lower()
            if not email:
                return Response({"email": "Email is required."}, status=400)
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response({"email": "A user with this email already exists."}, status=400)
            user.email = email
        if "username" in data:
            username = str(data.get("username", "")).strip()
            if not username:
                return Response({"username": "Username is required."}, status=400)
            if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
                return Response({"username": "A user with this username already exists."}, status=400)
            user.username = username
        if "mobile" in data:
            mobile = str(data.get("mobile") or "").strip()
            if mobile and User.objects.filter(mobile=mobile).exclude(pk=user.pk).exists():
                return Response({"mobile": "A user with this mobile number already exists."}, status=400)
            user.mobile = mobile or None
        if "role" in data:
            role_key = str(data.get("role", "")).strip()
            if role_key not in self.ROLE_KEYS:
                return Response({"role": "Choose Admin, Sales Manager, or Salesperson."}, status=400)
            if user.id == request.user.id and role_key != (user.role.key if user.role else None):
                return Response({"role": "You cannot change your own role."}, status=400)
            role = Role.objects.filter(key=role_key).first()
            if not role:
                return Response({"role": "The selected role has not been configured."}, status=400)
            user.role = role
        if "is_active" in data:
            new_active = bool(data.get("is_active"))
            if user.id == request.user.id and not new_active:
                return Response({"is_active": "You cannot deactivate your own account."}, status=400)
            user.is_active = new_active
        user.save()

        if not user.is_active:
            _revoke_sessions(user)

        audit(request.user, "user.updated", user)
        return Response(self._serialize_user(user))

    @action(detail=True, methods=["post"], url_path="password")
    def change_password(self, request, pk=None):
        self._require_admin(request)
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        if user.id == request.user.id:
            return Response({"detail": "Use your own Change Password option."}, status=400)

        new_password = str(request.data.get("new_password", ""))
        if not new_password:
            return Response({"new_password": "New password is required."}, status=400)
        try:
            validate_password(new_password, user)
        except Exception as exc:
            return Response({"new_password": "; ".join(exc.messages)}, status=400)
        if not any(c.isupper() for c in new_password) or not any(not c.isalnum() for c in new_password):
            return Response({"new_password": "Password must contain an uppercase letter and a special character."}, status=400)

        user.set_password(new_password)
        user.must_change_password = True
        user.save(update_fields=["password", "must_change_password"])
        _revoke_sessions(user)
        audit(request.user, "auth.password.admin_reset", user)
        return Response({"detail": "Password changed. The user must change it at next sign-in."})

    @action(detail=True, methods=["patch"], url_path="status")
    def change_status(self, request, pk=None):
        self._require_admin(request)
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        if "is_active" not in request.data:
            return Response({"is_active": "is_active is required."}, status=400)
        active = bool(request.data.get("is_active"))
        if user.id == request.user.id and not active:
            return Response({"is_active": "You cannot deactivate your own account."}, status=400)
        user.is_active = active
        user.save(update_fields=["is_active"])
        if not active:
            _revoke_sessions(user)
        audit(request.user, "user.status_changed", user, after={"is_active": active})
        return Response(self._serialize_user(user))

    @action(detail=True, methods=["patch"], url_path="role")
    def change_role(self, request, pk=None):
        self._require_admin(request)
        user = User.objects.select_related("role").filter(pk=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=404)
        if user.id == request.user.id:
            return Response({"detail": "You cannot change your own role."}, status=400)
        role_key = str(request.data.get("role", "")).strip()
        if role_key not in self.ROLE_KEYS:
            return Response({"role": "Choose Admin, Sales Manager, or Salesperson."}, status=400)
        role = Role.objects.filter(key=role_key).first()
        if not role:
            return Response({"role": "The selected role has not been configured."}, status=400)
        old_role = user.role.key if user.role else None
        user.role = role
        user.save(update_fields=["role"])
        audit(request.user, "user.role_changed", user, before={"role": old_role}, after={"role": role.key})
        return Response(self._serialize_user(user))


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    def retrieve(self, request, *args, **kwargs): require_permission(request, "view_contacts"); return super().retrieve(request, *args, **kwargs)
    def update(self, request, *args, **kwargs): require_permission(request, "edit_contact"); return super().update(request, *args, **kwargs)
    def partial_update(self, request, *args, **kwargs): require_permission(request, "edit_contact"); return super().partial_update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs): require_permission(request, "delete_contact"); return super().destroy(request, *args, **kwargs)
    def get_queryset(self):
        return Contact.objects.filter(record__in=visible_records(self.request.user), deleted_at__isnull=True).select_related("record__owner", "source")
    def list(self, request, *args, **kwargs):
        if not request.user.has_crm_permission("view_contacts"): return Response(status=403)
        return super().list(request, *args, **kwargs)
    def create(self, request, *args, **kwargs):
        if not request.user.has_crm_permission("create_contact"): return Response(status=403)
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        contact = serializer.save(record=Record.objects.create(owner=request.user))
        history(contact.record, request.user, "contact_created_directly")
        audit(request.user, "contact.created", contact, after=serializer.data)
        return Response(self.get_serializer(contact).data, status=201)
    @action(detail=True, methods=["get", "post"])
    def activities(self, request, pk=None):
        contact = self.get_object(); assert_visible(request.user, contact.record)
        if request.method == "GET":
            require_permission(request, "view_activity")
            return Response(ActivitySerializer(contact.record.activities.order_by("-happened_at"), many=True).data)
        if not request.user.has_crm_permission("log_activity"): return Response(status=403)
        serializer = ActivitySerializer(data=request.data); serializer.is_valid(raise_exception=True)
        activity = serializer.save(record=contact.record, author=request.user)
        if not contact.record.last_contact_at or activity.happened_at > contact.record.last_contact_at:
            contact.record.last_contact_at = activity.happened_at; contact.record.save(update_fields=["last_contact_at"])
        return Response(ActivitySerializer(activity).data, status=201)
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        require_permission(request, "view_history")
        contact = self.get_object(); assert_visible(request.user, contact.record)
        return Response(HistorySerializer(contact.record.history.all(), many=True).data)
    @action(detail=True, methods=["post"])
    def deals(self, request, pk=None):
        if not request.user.has_crm_permission("create_deal"): return Response(status=403)
        contact = self.get_object(); assert_visible(request.user, contact.record)
        serializer = DealSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        deal = serializer.save(record=contact.record, stage=Deal.Stage.PROPOSAL)
        history(contact.record, request.user, "deal_created", {"product": deal.product.name, "value_minor": deal.value_minor, "stage": deal.stage})
        return Response(DealSerializer(deal).data, status=201)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    def create(self, request, *args, **kwargs): return Response({"detail": "Deals can only be created from a contact."}, status=405)
    def retrieve(self, request, *args, **kwargs): require_permission(request, "view_deals"); return super().retrieve(request, *args, **kwargs)
    def update(self, request, *args, **kwargs): require_permission(request, "edit_deal"); return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs): require_permission(request, "delete_deal"); return super().destroy(request, *args, **kwargs)
    def get_queryset(self): return Deal.objects.filter(record__in=visible_records(self.request.user)).select_related("record__owner", "product")
    def list(self, request, *args, **kwargs):
        if not request.user.has_crm_permission("view_deals"): return Response(status=403)
        return super().list(request, *args, **kwargs)
    def partial_update(self, request, *args, **kwargs):
        deal = self.get_object()
        if not request.user.has_crm_permission("edit_deal"): return Response(status=403)
        if "value_minor" in request.data:
            if deal.stage in (Deal.Stage.WON, Deal.Stage.LOST): return Response({"detail": "The value is locked because this deal is closed."}, status=400)
            if not request.user.has_crm_permission("edit_deal_value"): return Response(status=403)
            old_value = deal.value_minor
            response = super().partial_update(request, *args, **kwargs)
            history(deal.record, request.user, "deal_value_updated", {"from": old_value, "to": int(request.data["value_minor"]), "stage": deal.stage})
            return response
        return super().partial_update(request, *args, **kwargs)
    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        deal = self.get_object(); stage = request.data.get("stage")
        closed = {Deal.Stage.WON, Deal.Stage.LOST}
        needed = "close_won" if stage == Deal.Stage.WON else "close_lost" if stage == Deal.Stage.LOST else "move_deal"
        if not request.user.has_crm_permission(needed): return Response(status=403)
        if stage not in Deal.Stage.values: return Response({"stage": "Invalid pipeline stage."}, status=400)
        if stage == Deal.Stage.LOST and not request.data.get("loss_reason"): return Response({"loss_reason": "A loss reason is required."}, status=400)
        old = deal.stage; deal.stage = stage; deal.loss_reason = request.data.get("loss_reason", deal.loss_reason)
        deal.closed_at = timezone.now() if stage in closed else None; deal.save()
        history(deal.record, request.user, "deal_stage_changed", {"from": old, "to": stage, "value_minor": deal.value_minor})
        return Response(DealSerializer(deal).data)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by("name")
    serializer_class = ProductSerializer

    def _can_manage_catalogue(self):
        return self.request.user.has_crm_permission("manage_catalogue")

    def get_queryset(self):
        # Admin/catalogue managers can see all products. Lead users only need
        # active products so the Course Interested dropdown works for them.
        if self._can_manage_catalogue():
            return Product.objects.all().order_by("name")

        if self.request.user.has_crm_permission("view_leads"):
            return Product.objects.filter(active=True).order_by("name")

        raise PermissionDenied(
            "You do not have permission to view the product catalogue."
        )

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def perform_create(self, serializer):
        if not self._can_manage_catalogue():
            raise PermissionDenied("You do not have permission to manage the product catalogue.")
        serializer.save()

    def perform_update(self, serializer):
        if not self._can_manage_catalogue():
            raise PermissionDenied("You do not have permission to manage the product catalogue.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._can_manage_catalogue():
            raise PermissionDenied("You do not have permission to manage the product catalogue.")
        instance.delete()


class LearningModeViewSet(viewsets.ModelViewSet):
    serializer_class = LearningModeSerializer

    def get_queryset(self):
        if self.request.user.has_crm_permission("manage_catalogue"):
            return LearningMode.objects.all().order_by("name")
        if not self.request.user.has_crm_permission("view_leads"):
            raise PermissionDenied("You do not have permission to view learning modes.")
        return LearningMode.objects.filter(active=True).order_by("name")

    def perform_create(self, serializer):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage learning modes.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage learning modes.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage learning modes.")
        instance.delete()


class CourseDurationViewSet(viewsets.ModelViewSet):
    serializer_class = CourseDurationSerializer

    def get_queryset(self):
        if self.request.user.has_crm_permission("manage_catalogue"):
            return CourseDuration.objects.all().order_by("name")
        if not self.request.user.has_crm_permission("view_leads"):
            raise PermissionDenied("You do not have permission to view course durations.")
        return CourseDuration.objects.filter(active=True).order_by("name")

    def perform_create(self, serializer):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage course durations.")
        serializer.save()

    def perform_update(self, serializer):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage course durations.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.has_crm_permission("manage_catalogue"):
            raise PermissionDenied("You do not have permission to manage course durations.")
        instance.delete()


class SourceViewSet(viewsets.ModelViewSet):
    serializer_class = SourceSerializer

    def get_queryset(self):
        return Source.objects.filter(
            active=True
        ).order_by("name")

    def _can_manage_catalogue(self):
        return self.request.user.has_crm_permission(
            "manage_catalogue"
        )

    def create(self, request, *args, **kwargs):
        if not self._can_manage_catalogue():
            return Response(status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not self._can_manage_catalogue():
            return Response(status=403)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._can_manage_catalogue():
            return Response(status=403)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not self._can_manage_catalogue():
            return Response(status=403)

        instance = self.get_object()

        try:
            instance.delete()
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "This lead source is already used by existing Leads "
                        "and cannot be deleted."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class RecordViewSet(viewsets.ViewSet):
    """Read/write the one shared timeline for a lead, contact, or deal."""
    def get_record(self, request, pk):
        record = Record.objects.get(pk=pk); assert_visible(request.user, record); return record
    @action(detail=True, methods=["get", "post"])
    def activities(self, request, pk=None):
        record = self.get_record(request, pk)
        if request.method == "GET":
            require_permission(request, "view_activity")
            return Response(ActivitySerializer(record.activities.order_by("-happened_at"), many=True).data)
        if not request.user.has_crm_permission("log_activity"): return Response(status=403)
        serializer = ActivitySerializer(data=request.data); serializer.is_valid(raise_exception=True)
        deal_id = request.data.get("deal")
        if deal_id and not record.deals.filter(id=deal_id).exists(): return Response({"deal": "This deal does not belong to the record."}, status=400)
        activity = serializer.save(record=record, author=request.user)
        if not record.last_contact_at or activity.happened_at > record.last_contact_at:
            record.last_contact_at = activity.happened_at; record.save(update_fields=["last_contact_at"])
        audit(request.user, "activity.created", activity, after={"type": activity.type, "subject": activity.subject})
        return Response(ActivitySerializer(activity).data, status=201)
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        require_permission(request, "view_history")
        record = self.get_record(request, pk)
        return Response(HistorySerializer(record.history.all(), many=True).data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    def get_queryset(self):
        query = Task.objects.filter(Q(assignee=self.request.user) | Q(record__in=visible_records(self.request.user))).select_related("assignee", "creator", "record", "deal")
        view = self.request.query_params.get("view")
        now = timezone.now()
        if view == "completed": query = query.filter(completed_at__isnull=False)
        elif view == "today": query = query.filter(completed_at__isnull=True, due_at__date=now.date())
        elif view == "overdue": query = query.filter(completed_at__isnull=True, due_at__lt=now)
        elif view == "upcoming": query = query.filter(completed_at__isnull=True, due_at__gt=now)
        return query
    def create(self, request, *args, **kwargs):
        if not request.user.has_crm_permission("create_task"): return Response(status=403)
        serializer = self.get_serializer(data=request.data); serializer.is_valid(raise_exception=True)
        record = serializer.validated_data.get("record")
        if record: assert_visible(request.user, record)
        task = serializer.save(creator=request.user, assignee=serializer.validated_data.get("assignee") or request.user)
        if task.record: history(task.record, request.user, "task_created", {"title": task.title, "due_at": task.due_at.isoformat()})
        audit(request.user, "task.created", task, after={"title": task.title})
        return Response(self.get_serializer(task).data, status=201)
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.assignee_id != request.user.id and not request.user.has_crm_permission("complete_others_task"): return Response(status=403)
        task.completed_at = None if task.completed_at else timezone.now(); task.completed_by = request.user if task.completed_at else None; task.save(update_fields=["completed_at", "completed_by"])
        if task.record: history(task.record, request.user, "task_completed" if task.completed_at else "task_reopened", {"title": task.title})
        audit(request.user, "task.completed" if task.completed_at else "task.reopened", task)
        return Response(self.get_serializer(task).data)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")


def _auth_response(user, request):
    return {
        "id": user.id,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role.name if user.role else None,
        "permissions": user.role.permissions if user.role else [],
        "must_change_password": user.must_change_password,
    }


def _revoke_sessions(user, keep_key=None):
    qs = CrmSession.objects.filter(user=user, revoked_at__isnull=True)
    if keep_key:
        qs = qs.exclude(session_key=keep_key)
    keys = list(qs.values_list("session_key", flat=True))
    qs.update(revoked_at=timezone.now())
    if keys:
        Session.objects.filter(session_key__in=keys).delete()


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    identifier = normalize_identifier(request.data.get("username", ""))
    password = request.data.get("password", "")
    user = find_user(identifier)
    now = timezone.now()
    lockout_minutes = settings.LOGIN_LOCKOUT_MINUTES
    valid = bool(user and user.check_password(password))

    
    
    if user and user.locked_until and user.locked_until > now:
            audit(None,"auth.login.failed",user,after={"reason": "account_locked","ip": _client_ip(request),"browser": request.META.get("HTTP_USER_AGENT", "", ),  },) 
            return Response(
        {
            "detail": "Your account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes."
        },
        status=423,
    )
            
    if not valid or not user.is_active:
        if user and user.is_active:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.failed_login_attempts = 0
                user.locked_until = now + timedelta(minutes=lockout_minutes)
                user.save(update_fields=["failed_login_attempts", "locked_until"])
                for admin_user in User.objects.select_related("role").filter(is_active=True):
                    if admin_user.has_crm_permission("manage_users"):
                        Notification.objects.create(user=admin_user, event_type="security.account_locked", message=f"Account locked after repeated sign-in failures: {user.email or user.username}.")
                audit(user, "auth.account_locked", user, after={"locked_until": user.locked_until.isoformat(), "ip": _client_ip(request), "browser": request.META.get("HTTP_USER_AGENT", "")})
            else:
                user.save(update_fields=["failed_login_attempts"])
        audit(user, "auth.login.failed", user, after={"reason": "invalid_credentials", "ip": _client_ip(request), "browser": request.META.get("HTTP_USER_AGENT", "")})
        return Response({"detail": "Your email/mobile number or password is incorrect."}, status=401)

    if user.locked_until and user.locked_until <= now:
        user.locked_until = None
    user.failed_login_attempts = 0
    user.save(update_fields=["failed_login_attempts", "locked_until"])
    login(request, user)
    CrmSession.objects.update_or_create(
        session_key=request.session.session_key,
        defaults={"user": user, "ip_address": _client_ip(request), "browser": request.META.get("HTTP_USER_AGENT", ""), "revoked_at": None},
    )
    audit(user, "auth.login.success", user, after={"ip": _client_ip(request), "browser": request.META.get("HTTP_USER_AGENT", "")})
    return Response(_auth_response(user, request))


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    return Response(status=204)


@api_view(["POST"])
def logout_view(request):
    if request.session.session_key:
        CrmSession.objects.filter(session_key=request.session.session_key).update(revoked_at=timezone.now())
    audit(request.user, "auth.logout", request.user)
    logout(request)
    return Response(status=204)


@api_view(["GET"])
@permission_classes([AllowAny])
def me_view(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Authentication required."}, status=401)
    session = CrmSession.objects.filter(session_key=request.session.session_key, user=request.user, revoked_at__isnull=True).first()
    now = timezone.now()
    if session and now - session.last_seen_at >= timedelta(minutes=60):
        session.revoked_at = now
        session.save(update_fields=["revoked_at"])
        logout(request)
        return Response({"detail": "Authentication required."}, status=401)
    if not session or now - session.created_at >= timedelta(hours=8):
        if session:
            session.revoked_at = now
            session.save(update_fields=["revoked_at"])
        logout(request)
        return Response({"detail": "Authentication required."}, status=401)
    return Response(_auth_response(request.user, request))


@api_view(["POST"])
def password_change_view(request):
    current = request.data.get("current_password", "")
    new_password = request.data.get("new_password", "")
    if not request.user.check_password(current):
        return Response({"detail": "The current password is incorrect."}, status=400)
    try:
        validate_password(new_password, request.user)
    except Exception as exc:
        return Response({"detail": "; ".join(exc.messages)}, status=400)
    if not any(c.isupper() for c in new_password) or not any(not c.isalnum() for c in new_password):
        return Response({"detail": "Password must contain an uppercase letter and a special character."}, status=400)
    request.user.set_password(new_password)
    request.user.must_change_password = False
    request.user.save(update_fields=["password", "must_change_password"])
    current_key = request.session.session_key
    _revoke_sessions(request.user, keep_key=current_key)
    request.session.cycle_key()
    CrmSession.objects.filter(session_key=current_key).update(session_key=request.session.session_key, last_seen_at=timezone.now())
    audit(request.user, "auth.password.changed", request.user)
    return Response({"detail": "Password changed successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    # Forgot Password accepts EMAIL ONLY.
    # Login continues to support both email and mobile through find_user().
    email = str(request.data.get("identifier", "")).strip().lower()
    generic = {"detail": "If an account matches, a one-time code has been sent."}

    # Do not accept mobile numbers or other identifiers for password reset.
    if not email or "@" not in email:
        return Response(generic)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response(generic)

    PasswordResetToken.objects.filter(
        user=user,
        used_at__isnull=True,
    ).update(used_at=timezone.now())

    code = f"{secrets.randbelow(1_000_000):06d}"
    PasswordResetToken.objects.create(
        user=user,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=10),
    )

    send_mail(
        "LiteCRM password reset code",
        f"Your LiteCRM password reset code is {code}. It expires in 10 minutes.",
        None,
        [user.email],
        fail_silently=True,
    )
    audit(user, "auth.password.reset_requested", user)
    return Response(generic)

@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_verify_view(request):
    identifier = normalize_identifier(
        request.data.get("identifier", "")
    )
    code = str(request.data.get("code", "")).strip()

    user = find_user(identifier)

    if not user or not user.is_active:
        return Response(
            {"detail": "Invalid OTP."},
            status=400,
        )

    token = (
        user.password_reset_tokens
        .filter(
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )

    if not token:
        return Response(
            {"detail": "Invalid OTP or OTP has expired."},
            status=400,
        )

    if not secrets.compare_digest(
        token.code_hash,
        hashlib.sha256(code.encode()).hexdigest(),
    ):
        return Response(
            {"detail": "Invalid OTP."},
            status=400,
        )

    return Response(
        {"detail": "OTP verified successfully."},
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    # Password reset confirmation also accepts EMAIL ONLY.
    email = str(request.data.get("identifier", "")).strip().lower()
    code = request.data.get("code", "")
    new_password = request.data.get("new_password", "")

    if not email or "@" not in email:
        return Response({"detail": "The code is invalid or expired."}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response({"detail": "The code is invalid or expired."}, status=400)
    token = user.password_reset_tokens.filter(used_at__isnull=True, expires_at__gt=timezone.now()).order_by("-created_at").first()
    if not token or not secrets.compare_digest(token.code_hash, hashlib.sha256(code.encode()).hexdigest()):
        return Response({"detail": "The code is invalid or expired."}, status=400)
    try:
        validate_password(new_password, user)
    except Exception as exc:
        return Response({"detail": "; ".join(exc.messages)}, status=400)
    if not any(c.isupper() for c in new_password) or not any(not c.isalnum() for c in new_password):
        return Response({"detail": "Password must contain an uppercase letter and a special character."}, status=400)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])
    token.used_at = timezone.now(); token.save(update_fields=["used_at"])
    _revoke_sessions(user)
    audit(user, "auth.password.reset_completed", user)
    return Response({"detail": "Password reset successfully."})


@api_view(["GET"])
def sessions_view(request):
    current = request.session.session_key
    rows = CrmSession.objects.filter(user=request.user, revoked_at__isnull=True).order_by("-last_seen_at")
    return Response([{"id": row.id, "browser": row.browser, "ip_address": row.ip_address, "created_at": row.created_at, "last_seen_at": row.last_seen_at, "current": row.session_key == current} for row in rows])


@api_view(["POST"])
def sessions_revoke_all_view(request):
    audit(request.user, "auth.sessions.revoked_all", request.user)
    _revoke_sessions(request.user)
    logout(request)
    return Response(status=204)


@api_view(["POST"])
def admin_revoke_user_sessions_view(request, user_id):
    if not request.user.has_crm_permission("manage_users"):
        return Response(status=403)
    target = User.objects.filter(pk=user_id).first()
    if not target:
        return Response(status=404)
    _revoke_sessions(target)
    audit(request.user, "auth.sessions.admin_revoked", target)
    return Response({"detail": "User sessions ended."})


@api_view(["POST"])
def admin_reset_password_view(request, user_id):
    if not request.user.has_crm_permission("manage_users"):
        return Response(status=403)
    target = User.objects.filter(pk=user_id).first()
    if not target:
        return Response(status=404)
    new_password = request.data.get("new_password", "")
    try:
        validate_password(new_password, target)
    except Exception as exc:
        return Response({"detail": "; ".join(exc.messages)}, status=400)
    if not any(c.isupper() for c in new_password) or not any(not c.isalnum() for c in new_password):
        return Response({"detail": "Password must contain an uppercase letter and a special character."}, status=400)
    target.set_password(new_password); target.must_change_password = True; target.save(update_fields=["password", "must_change_password"])
    _revoke_sessions(target)
    audit(request.user, "auth.password.admin_reset", target)
    return Response({"detail": "Password reset. The user must change it at next sign-in."})