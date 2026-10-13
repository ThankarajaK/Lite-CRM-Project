from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers

from .models import (
    Activity,
    Contact,
    CourseDuration,
    Deal,
    HistoryEvent,
    Lead,
    LearningMode,
    Notification,
    Product,
    Role,
    Source,
    Task,
    User,
)


# ============================================================
# SOURCE
# ============================================================

class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = [
            "id",
            "name",
            "active",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Lead source name is required."
            )

        queryset = Source.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A lead source with this name already exists."
            )

        return value


# ============================================================
# LEARNING MODE
# ============================================================

class LearningModeSerializer(serializers.ModelSerializer):
    """
    Admin-managed Lead master data.

    Examples:
        Online
        Offline
        Hybrid
    """

    class Meta:
        model = LearningMode

        fields = [
            "id",
            "name",
            "active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Learning mode name is required."
            )

        queryset = LearningMode.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A learning mode with this name already exists."
            )

        return value


# ============================================================
# COURSE DURATION
# ============================================================

class CourseDurationSerializer(serializers.ModelSerializer):
    """
    Admin-managed Lead master data.

    Examples:
        3 Months
        6 Months
        1 Year
    """

    class Meta:
        model = CourseDuration

        fields = [
            "id",
            "name",
            "active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Course duration name is required."
            )

        queryset = CourseDuration.objects.filter(
            name__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A course duration with this name already exists."
            )

        return value


# ============================================================
# LEAD
# ============================================================

class LeadSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="record.owner.get_full_name",
        read_only=True,
    )

    owner_id = serializers.IntegerField(
        source="record.owner_id",
        read_only=True,
    )

    source_name = serializers.CharField(
        source="source.name",
        read_only=True,
    )

    record_id = serializers.UUIDField(
        source="record.id",
        read_only=True,
    )

    # --------------------------------------------------------
    # PRODUCT / COURSE INTERESTED
    # --------------------------------------------------------

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
        allow_null=True,
    )

    # --------------------------------------------------------
    # PREFERRED LEARNING MODE
    # --------------------------------------------------------

    learning_mode_name = serializers.CharField(
        source="learning_mode.name",
        read_only=True,
        allow_null=True,
    )

    # --------------------------------------------------------
    # PREFERRED COURSE DURATION
    # --------------------------------------------------------

    course_duration_name = serializers.CharField(
        source="course_duration.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Lead

        fields = [
            # Existing identity fields
            "id",
            "record_id",

            # Existing lead information
            "name",
            "company",
            "email",
            "phone",

            # Existing source
            "source",
            "source_name",

            # ------------------------------------------------
            # NEW LEAD FIELDS
            # ------------------------------------------------

            # Course Interested
            "product",
            "product_name",

            # Preferred Learning Mode
            "learning_mode",
            "learning_mode_name",

            # Preferred Course Duration
            "course_duration",
            "course_duration_name",

            # Town / City
            "town_city",

            # ------------------------------------------------
            # Existing Lead fields
            # ------------------------------------------------

            "status",
            "disqualification_reason",

            # Existing DB field.
            # Frontend label = Lead Feedback
            "notes",

            "created_at",

            # Owner information
            "owner_name",
            "owner_id",
        ]

        read_only_fields = [
            "id",
            "record_id",
            "created_at",
            "owner_name",
            "owner_id",
            "source_name",
            "product_name",
            "learning_mode_name",
            "course_duration_name",
        ]

        extra_kwargs = {
            # ------------------------------------------------
            # COMPANY - OPTIONAL
            # ------------------------------------------------
            "company": {
                "required": False,
                "allow_blank": True,
            },

            # ------------------------------------------------
            # EMAIL - OPTIONAL
            # ------------------------------------------------
            "email": {
                "required": False,
                "allow_blank": True,
            },

            # ------------------------------------------------
            # SOURCE - OPTIONAL
            # If not supplied, the existing view can fall back
            # to the "Other" source.
            # ------------------------------------------------
            "source": {
                "required": False,
                "allow_null": True,
            },

            # ------------------------------------------------
            # COURSE INTERESTED - OPTIONAL
            # ------------------------------------------------
            "product": {
                "required": False,
                "allow_null": True,
            },

            # ------------------------------------------------
            # PREFERRED LEARNING MODE - OPTIONAL
            # ------------------------------------------------
            "learning_mode": {
                "required": False,
                "allow_null": True,
            },

            # ------------------------------------------------
            # PREFERRED COURSE DURATION - OPTIONAL
            # ------------------------------------------------
            "course_duration": {
                "required": False,
                "allow_null": True,
            },

            # ------------------------------------------------
            # TOWN / CITY - OPTIONAL
            # ------------------------------------------------
            "town_city": {
                "required": False,
                "allow_blank": True,
            },

            # ------------------------------------------------
            # LEAD FEEDBACK - OPTIONAL
            # ------------------------------------------------
            "notes": {
                "required": False,
                "allow_blank": True,
            },

            # ------------------------------------------------
            # DISQUALIFICATION REASON - OPTIONAL
            # ------------------------------------------------
            "disqualification_reason": {
                "required": False,
                "allow_blank": True,
            },
        }

    def validate_email(self, value):
        return value.lower().strip()

    def validate_phone(self, value):
        value = (value or "").strip()

        if not value:
            return value

        digits = "".join(
            ch for ch in value
            if ch.isdigit()
        )

        if value.startswith("+91"):
            digits = (
                digits[2:]
                if digits.startswith("91")
                else digits
            )

        elif digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]

        if len(digits) != 10 or digits[0] not in "6789":
            raise serializers.ValidationError(
                "Enter a valid Indian mobile number, "
                "e.g. +91 9876543210."
            )

        return f"+91{digits}"

    def validate_town_city(self, value):
        return (value or "").strip()

    def validate_notes(self, value):
        return (value or "").strip()

    def validate_disqualification_reason(self, value):
        return (value or "").strip()


# ============================================================
# ACTIVITY
# ============================================================

class ActivitySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(
        source="author.get_full_name",
        read_only=True,
    )
    deal_name = serializers.CharField(
        source="deal.name",
        read_only=True,
        allow_null=True,
    )
    author_id = serializers.IntegerField(read_only=True)
    edited = serializers.SerializerMethodField()
    voided = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_void = serializers.SerializerMethodField()
    voided_by_name = serializers.SerializerMethodField()
    original_subject = serializers.SerializerMethodField()
    original_description = serializers.SerializerMethodField()

    class Meta:
        model = Activity

        fields = [
            "id",
            "type",
            "subject",
            "description",
            "happened_at",
            "deal",
            "deal_name",
            "author_id",
            "author_id",
            "author_name",
            "created_at",
            "edited",
            "can_edit",
            "can_void",
            "can_edit",
            "can_void",
            "edited_at",
            "original_subject",
            "original_description",
            "voided",
            "void_reason",
            "voided_at",
            "voided_by_name",
        ]

        read_only_fields = [
            "id",
            "author_name",
            "created_at",
            "edited",
            "edited_at",
            "original_subject",
            "original_description",
            "voided",
            "void_reason",
            "voided_at",
            "voided_by_name",
        ]

    def _user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_can_edit(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return False
        if obj.voided_at or obj.author_id != user.id:
            return False
        if not user.has_crm_permission("correct_activity"):
            return False
        window = timedelta(hours=max(settings.ACTIVITY_CORRECTION_WINDOW_HOURS, 0))
        return timezone.now() <= obj.created_at + window

    def get_can_void(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return False
        if obj.voided_at or not user.has_crm_permission("correct_activity"):
            return False
        is_admin = user.is_superuser or getattr(getattr(user, "role", None), "key", None) == "admin"
        return obj.author_id == user.id or is_admin

    def get_edited(self, obj):
        return bool(obj.edited_at)

    def get_voided(self, obj):
        return bool(obj.voided_at)

    def get_voided_by_name(self, obj):
        if not obj.voided_by:
            return None
        return obj.voided_by.get_full_name() or obj.voided_by.username

    def _is_admin(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        role = getattr(user, "role", None)
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or getattr(role, "key", None) == "admin")
        )

    def get_original_subject(self, obj):
        return obj.original_subject if self._is_admin() else None

    def get_original_description(self, obj):
        return obj.original_description if self._is_admin() else None


# ============================================================
# HISTORY
# ============================================================

class HistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()
    detail_text = serializers.SerializerMethodField()

    ACTION_LABELS = {
        "lead_captured": "Lead captured",
        "qualified": "Qualified",
        "not_qualified": "Not qualified",
        "moved_to_contacts": "Moved to Contacts",
        "deal_created": "Deal created",
        "deal_value_updated": "Value updated",
        "deal_stage_changed": "Stage changed",
        "deal_won": "Deal won",
        "deal_lost": "Deal lost",
        "reassigned": "Reassigned",
        "edited": "Edited",
        "merged": "Merged",
        "deleted": "Deleted",
        "activity_edited": "Activity corrected",
        "activity_voided": "Activity voided",
        # Legacy rows already stored before Epic 9 completion.
        "lead_updated": "Edited",
        "lead_status_changed": "Stage changed",
        "lead_reassigned": "Reassigned",
        "lead_deleted": "Deleted",
        "contact_updated": "Edited",
        "contact_created_directly": "Edited",
        "deal_stage_changed": "Stage changed",
    }

    class Meta:
        model = HistoryEvent
        fields = [
            "id",
            "action",
            "action_label",
            "detail",
            "detail_text",
            "actor_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor is None:
            return "System"
        return obj.actor.get_full_name() or obj.actor.username or obj.actor.email or "User"

    def get_action_label(self, obj):
        return self.ACTION_LABELS.get(
            obj.action,
            obj.action.replace("_", " ").strip().title(),
        )

    def get_detail_text(self, obj):
        detail = obj.detail or {}
        if not detail:
            return ""

        # Keep the API detail structured while giving the UI a concise,
        # human-readable explanation of what changed.
        if "from" in detail or "to" in detail:
            before = detail.get("from", "—")
            after = detail.get("to", "—")
            if detail.get("reason"):
                return f"{before} → {after} · Reason: {detail['reason']}"
            return f"{before} → {after}"

        if "from_owner" in detail or "to_owner" in detail:
            return f"Owner {detail.get('from_owner', '—')} → {detail.get('to_owner', '—')}"

        if "changed" in detail and isinstance(detail["changed"], dict):
            parts = []
            for field, change in detail["changed"].items():
                if isinstance(change, dict):
                    parts.append(f"{field}: {change.get('from', '—')} → {change.get('to', '—')}")
            return " · ".join(parts)

        if "product" in detail and "value_minor" in detail:
            value = int(detail.get("value_minor") or 0) / 100
            return f"{detail['product']} · ₹{value:,.2f}"

        if "from_value_minor" in detail or "to_value_minor" in detail:
            before = int(detail.get("from_value_minor") or 0) / 100
            after = int(detail.get("to_value_minor") or 0) / 100
            return f"₹{before:,.2f} → ₹{after:,.2f}"

        if "from_stage" in detail or "to_stage" in detail:
            return f"{detail.get('from_stage', '—')} → {detail.get('to_stage', '—')}"

        if "reason" in detail and detail.get("reason"):
            return str(detail["reason"])

        if "fields" in detail and isinstance(detail["fields"], list):
            return "Changed: " + ", ".join(str(field) for field in detail["fields"])

        if "name" in detail and "company" in detail:
            return f"{detail.get('name') or 'Record'} · {detail.get('company') or '—'}"

        if "batch_id" in detail:
            return f"Import batch {detail['batch_id']}"

        return " · ".join(
            f"{str(key).replace('_', ' ').title()}: {value}"
            for key, value in detail.items()
            if value not in (None, "", [], {})
        )


# ============================================================
# TASK
# ============================================================

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(
        source="assignee.get_full_name",
        read_only=True,
    )

    completed_by_name = serializers.CharField(
        source="completed_by.get_full_name",
        read_only=True,
    )

    is_completed = serializers.BooleanField(
        source="completed_at",
        read_only=True,
    )

    class Meta:
        model = Task

        fields = [
            "id",
            "title",
            "record",
            "deal",
            "due_at",
            "priority",
            "task_type",
            "assignee",
            "assignee_name",
            "creator",
            "completed_at",
            "completed_by",
            "completed_by_name",
            "is_completed",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "creator",
            "completed_at",
            "completed_by",
            "created_at",
            "assignee_name",
            "completed_by_name",
            "is_completed",
        ]

        extra_kwargs = {
            "assignee": {
                "required": False,
            }
        }


# ============================================================
# PRODUCT
# ============================================================

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "description",
            "default_value_minor",
            "active",
        ]


# ============================================================
# DEAL
# ============================================================

class DealSerializer(serializers.ModelSerializer):
    owner_id = serializers.IntegerField(write_only=True, required=False)

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    owner_name = serializers.CharField(
        source="record.owner.get_full_name",
        read_only=True,
    )

    activity_count = serializers.IntegerField(
        source="record.activities.count",
        read_only=True,
    )

    class Meta:
        model = Deal

        fields = [
            "id",
            "record",
            "product",
            "product_name",
            "value_minor",
            "stage",
            "expected_close_date",
            "loss_reason",
            "notes",
            "created_at",
            "closed_at",
            "owner_name",
            "activity_count",
            "owner_id",
        ]

        read_only_fields = [
            "id",
            "record",
            "created_at",
            "closed_at",
        ]

    def validate_value_minor(self, value):
        if value <= 0:
            raise serializers.ValidationError("Deal value must be greater than zero.")
        return value

    def validate_expected_close_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Expected close date cannot be in the past.")
        return value

    def validate_owner_id(self, value):
        user = User.objects.filter(pk=value, is_active=True, role__key__in=["salesperson", "sales_manager"]).first()
        if user is None:
            raise serializers.ValidationError("Choose an active Salesperson or Sales Manager.")
        return value


# ============================================================
# CONTACT
# ============================================================

class ContactSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="record.owner.get_full_name", read_only=True,
    )
    record_id = serializers.UUIDField(source="record.id", read_only=True)
    deal_count = serializers.IntegerField(source="record.deals.count", read_only=True)
    source_name = serializers.CharField(source="source.name", read_only=True, allow_null=True)
    product_name = serializers.CharField(source="product.name", read_only=True, allow_null=True)
    learning_mode_name = serializers.CharField(source="learning_mode.name", read_only=True, allow_null=True)
    course_duration_name = serializers.CharField(source="course_duration.name", read_only=True, allow_null=True)
    owner_id = serializers.IntegerField(source="record.owner_id", read_only=True)
    last_contact_at = serializers.DateTimeField(
    source="record.last_contact_at",
    read_only=True,
    allow_null=True,
)

    class Meta:
        model = Contact
        fields = [
            "id", "record_id", "name", "company", "email", "phone",
            "source", "source_name", "product", "product_name",
            "learning_mode", "learning_mode_name", "course_duration",
            "course_duration_name", "town_city", "status",
            "disqualification_reason", "notes", "industry", "location",
            "became_contact_at", "owner_name", "owner_id", "deal_count","last_contact_at",
        ]
        read_only_fields = ["id", "became_contact_at"]


# ============================================================
# USER SUMMARY
# ============================================================

class UserSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight user representation used throughout the CRM.

    Used for:
    - Owner dropdowns
    - Reassignment dropdowns
    - User lists
    - Activity information
    - Other user references
    """

    role_name = serializers.CharField(
        source="role.name",
        read_only=True,
    )

    role_key = serializers.CharField(
        source="role.key",
        read_only=True,
    )

    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User

        fields = [
            "id",
            "display_name",
            "username",
            "first_name",
            "last_name",
            "email",
            "mobile",
            "role_name",
            "role_key",
            "is_active",
        ]

    def get_display_name(self, obj):
        return (
            obj.get_full_name()
            or obj.username
            or obj.email
        )


# ============================================================
# ROLE
# ============================================================

class RoleSerializer(serializers.ModelSerializer):
    """
    CRM roles.

    Exactly three supported roles:

    - Admin
    - Sales Manager
    - Salesperson
    """

    class Meta:
        model = Role

        fields = [
            "id",
            "key",
            "name",
            "permissions",
        ]

        read_only_fields = [
            "id",
        ]


# ============================================================
# ADMIN USER MANAGEMENT
# ============================================================

class AdminUserSerializer(serializers.ModelSerializer):
    """
    Used by Admin for:

    - Listing users
    - Creating users
    - Updating users
    - Assigning roles
    - Activating/deactivating users
    - Setting initial passwords

    Password is write-only and is never returned in API responses.
    """

    role_name = serializers.CharField(
        source="role.name",
        read_only=True,
    )

    role_key = serializers.CharField(
        source="role.key",
        read_only=True,
    )

    display_name = serializers.SerializerMethodField()

    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
    )

    class Meta:
        model = User

        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "display_name",
            "email",
            "mobile",
            "role",
            "role_name",
            "role_key",
            "is_active",
            "password",
        ]

        read_only_fields = [
            "id",
            "display_name",
            "role_name",
            "role_key",
        ]

    def get_display_name(self, obj):
        return (
            obj.get_full_name()
            or obj.username
            or obj.email
        )

    # --------------------------------------------------------
    # USERNAME
    # --------------------------------------------------------

    def validate_username(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        queryset = User.objects.filter(
            username__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )

        return value

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError(
                "Email is required."
            )

        queryset = User.objects.filter(
            email__iexact=value
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )

        return value

    # --------------------------------------------------------
    # MOBILE
    # --------------------------------------------------------

    def validate_mobile(self, value):
        if value in ("", None):
            return None

        value = value.strip()

        digits = "".join(
            ch for ch in value
            if ch.isdigit()
        )

        if value.startswith("+91"):
            if digits.startswith("91"):
                digits = digits[2:]

        elif digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]

        if len(digits) != 10:
            raise serializers.ValidationError(
                "Enter a valid Indian mobile number, "
                "e.g. +91 9876543210."
            )

        if digits[0] not in "6789":
            raise serializers.ValidationError(
                "Indian mobile numbers must start with 6, 7, 8 or 9."
            )

        normalized = f"+91{digits}"

        queryset = User.objects.filter(
            mobile=normalized
        )

        if self.instance:
            queryset = queryset.exclude(
                pk=self.instance.pk
            )

        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this mobile number already exists."
            )

        return normalized

    # --------------------------------------------------------
    # PASSWORD
    # --------------------------------------------------------

    def validate_password(self, value):
        if not value:
            return value

        validate_password(
            value,
            self.instance,
        )

        if not any(
            character.isupper()
            for character in value
        ):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )

        if not any(
            not character.isalnum()
            for character in value
        ):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )

        return value

    # --------------------------------------------------------
    # ROLE
    # --------------------------------------------------------

    def validate_role(self, value):
        if value is None:
            raise serializers.ValidationError(
                "A role is required."
            )

        allowed_roles = {
            "admin",
            "sales_manager",
            "salesperson",
        }

        if value.key not in allowed_roles:
            raise serializers.ValidationError(
                "Invalid role. Choose Admin, Sales Manager or Salesperson."
            )

        return value

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    def create(self, validated_data):
        password = validated_data.pop(
            "password",
            None,
        )

        if not password:
            raise serializers.ValidationError(
                {
                    "password": (
                        "Password is required when creating a user."
                    )
                }
            )

        user = User(
            **validated_data
        )

        user.set_password(password)

        user.save()

        return user

    # --------------------------------------------------------
    # UPDATE USER
    # --------------------------------------------------------

    def update(self, instance, validated_data):
        password = validated_data.pop(
            "password",
            None,
        )

        for attribute, value in validated_data.items():
            setattr(
                instance,
                attribute,
                value,
            )

        if password:
            validate_password(
                password,
                instance,
            )

            if not any(
                character.isupper()
                for character in password
            ):
                raise serializers.ValidationError(
                    {
                        "password": (
                            "Password must contain at least "
                            "one uppercase letter."
                        )
                    }
                )

            if not any(
                not character.isalnum()
                for character in password
            ):
                raise serializers.ValidationError(
                    {
                        "password": (
                            "Password must contain at least "
                            "one special character."
                        )
                    }
                )

            instance.set_password(password)

        instance.save()

        return instance


# ============================================================
# ADMIN CHANGE USER PASSWORD
# ============================================================

class AdminUserPasswordSerializer(serializers.Serializer):
    """
    Used when an Admin changes another user's password.

    This is separate from:

        /auth/password/change/

    because that endpoint is for the currently
    authenticated user.
    """

    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    def validate(self, attrs):
        new_password = attrs["new_password"]
        confirm_password = attrs["confirm_password"]

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        if not any(
            character.isupper()
            for character in new_password
        ):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "Password must contain at least "
                        "one uppercase letter."
                    )
                }
            )

        if not any(
            not character.isalnum()
            for character in new_password
        ):
            raise serializers.ValidationError(
                {
                    "new_password": (
                        "Password must contain at least "
                        "one special character."
                    )
                }
            )

        validate_password(
            new_password,
            self.context.get("user"),
        )

        return attrs


# ============================================================
# ADMIN USER STATUS
# ============================================================

class AdminUserStatusSerializer(serializers.Serializer):
    """
    Used by Admin to activate/deactivate another user.
    """

    is_active = serializers.BooleanField()


# ============================================================
# ADMIN USER ROLE
# ============================================================

class AdminUserRoleSerializer(serializers.Serializer):
    """
    Used by Admin to change another user's role.
    """

    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all()
    )

    def validate_role(self, value):
        allowed_roles = {
            "admin",
            "sales_manager",
            "salesperson",
        }

        if value.key not in allowed_roles:
            raise serializers.ValidationError(
                "Invalid role."
            )

        return value


# ============================================================
# IN-APP NOTIFICATIONS
# ============================================================

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "event_type",
            "message",
            "read_at",
            "created_at",
        ]
        read_only_fields = fields
