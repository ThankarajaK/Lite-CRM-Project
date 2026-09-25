from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    Activity,
    Contact,
    CourseDuration,
    Deal,
    HistoryEvent,
    Lead,
    LearningMode,
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

    class Meta:
        model = Activity

        fields = [
            "id",
            "type",
            "subject",
            "description",
            "happened_at",
            "deal",
            "author_name",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "author_name",
            "created_at",
        ]


# ============================================================
# HISTORY
# ============================================================

class HistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(
        source="actor.get_full_name",
        read_only=True,
    )

    class Meta:
        model = HistoryEvent

        fields = [
            "id",
            "action",
            "detail",
            "actor_name",
            "created_at",
        ]


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
        ]

        read_only_fields = [
            "id",
            "record",
            "created_at",
            "closed_at",
        ]


# ============================================================
# CONTACT
# ============================================================

class ContactSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="record.owner.get_full_name",
        read_only=True,
    )

    record_id = serializers.UUIDField(
        source="record.id",
        read_only=True,
    )

    deal_count = serializers.IntegerField(
        source="record.deals.count",
        read_only=True,
    )

    class Meta:
        model = Contact

        fields = [
            "id",
            "record_id",
            "name",
            "company",
            "email",
            "phone",
            "source",
            "notes",
            "industry",
            "location",
            "became_contact_at",
            "owner_name",
            "deal_count",
        ]

        read_only_fields = [
            "id",
            "became_contact_at",
        ]


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