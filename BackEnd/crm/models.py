import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.db import models


class Permission(models.TextChoices):
    VIEW_LEADS = "view_leads", "View leads"
    CAPTURE_LEAD = "capture_lead", "Capture a lead"
    EDIT_LEAD = "edit_lead", "Edit a lead"
    SET_LEAD_STATUS = "set_lead_status", "Set lead status"
    MOVE_TO_CONTACT = "move_to_contact", "Move a lead to contacts"

    VIEW_CONTACTS = "view_contacts", "View contacts"
    EDIT_CONTACT = "edit_contact", "Edit contact"
    CREATE_DEAL = "create_deal", "Move a contact to deals"

    VIEW_DEALS = "view_deals", "View deals"
    EDIT_DEAL = "edit_deal", "Edit deal"
    EDIT_DEAL_VALUE = "edit_deal_value", "Edit deal value"
    MOVE_DEAL = "move_deal", "Move deal between open stages"
    CLOSE_WON = "close_won", "Close deal won"
    CLOSE_LOST = "close_lost", "Close deal lost"
    REOPEN_DEAL = "reopen_deal", "Reopen a closed deal"

    LOG_ACTIVITY = "log_activity", "Log activity"
    CREATE_TASK = "create_task", "Create and complete tasks"
    COMPLETE_OTHERS_TASK = (
        "complete_others_task",
        "Complete another person's task",
    )

    VIEW_HISTORY = "view_history", "View record history"

    MANAGE_USERS = "manage_users", "Manage users"
    MANAGE_PERMISSIONS = (
        "manage_permissions",
        "Manage roles and permissions",
    )
    MANAGE_CATALOGUE = (
        "manage_catalogue",
        "Manage catalogue",
    )

    VIEW_REPORTS = "view_reports", "View reports"

    DELETE_LEAD = "delete_lead", "Delete a lead"
    REASSIGN_LEAD = "reassign_lead", "Reassign a lead"
    IMPORT_LEADS = "import_leads", "Import leads in bulk"

    CREATE_CONTACT = "create_contact", "Create contact"
    DELETE_CONTACT = "delete_contact", "Delete contact"
    REASSIGN_CONTACT = (
        "reassign_contact",
        "Reassign a contact",
    )

    REASSIGN_DEAL = "reassign_deal", "Reassign a deal"
    DELETE_DEAL = "delete_deal", "Delete a deal"

    CORRECT_ACTIVITY = (
        "correct_activity",
        "Correct an activity within the edit window",
    )
    VIEW_ACTIVITY = "view_activity", "View the activity log"

    VIEW_OWN_REPORTS = (
        "view_own_reports",
        "View own performance reports",
    )
    VIEW_TEAM_REPORTS = (
        "view_team_reports",
        "View team and workspace reports",
    )

    EXPORT_RECORDS = (
        "export_records",
        "Export records to CSV",
    )

    MANAGE_CONFIGURATION = (
        "manage_configuration",
        "Configure pipeline stages and value rules",
    )

    VIEW_AUDIT = (
        "view_audit",
        "View the workspace audit trail",
    )

    VIEW_WORKSPACE_RECORDS = (
        "view_workspace_records",
        "View workspace records",
    )


class Role(models.Model):
    key = models.SlugField(unique=True)
    name = models.CharField(max_length=50)
    permissions = models.JSONField(default=list)

    def has_permission(self, permission):
        return permission in self.permissions

    def __str__(self):
        return self.name


class User(AbstractUser):
    mobile = models.CharField(
        max_length=32,
        blank=True,
        unique=True,
        null=True,
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
    )

    is_active = models.BooleanField(default=True)

    failed_login_attempts = models.PositiveSmallIntegerField(
        default=0,
    )

    locked_until = models.DateTimeField(
        null=True,
        blank=True,
    )

    must_change_password = models.BooleanField(
        default=False,
    )

    def has_crm_permission(self, permission):
        return bool(
            self.role
            and self.role.has_permission(permission)
        )


class CrmSession(models.Model):
    session_key = models.CharField(
        max_length=40,
        unique=True,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="crm_sessions",
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    browser = models.CharField(
        max_length=500,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    last_seen_at = models.DateTimeField(
        default=timezone.now,
    )

    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
    )


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )

    code_hash = models.CharField(
        max_length=128,
    )

    expires_at = models.DateTimeField()

    used_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    event_type = models.CharField(
        max_length=100,
    )

    message = models.CharField(
        max_length=500,
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )


class Record(models.Model):
    """
    Immutable relationship identifier shared by the
    lead/contact/deal lifecycle.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_records",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    last_contact_at = models.DateTimeField(
        null=True,
        blank=True,
    )


class Source(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    active = models.BooleanField(
        default=True,
    )

    def __str__(self):
        return self.name


# ============================================================================
# LEAD MASTER DATA
# ============================================================================


class LearningMode(models.Model):
    """
    Admin-managed master data for the preferred learning
    mode of a Lead.

    Examples:
        Online
        Offline
        Hybrid

    Values are stored in the database and are therefore
    not hardcoded into the React frontend.
    """

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CourseDuration(models.Model):
    """
    Admin-managed master data for the preferred course
    duration of a Lead.

    Examples:
        3 Months
        6 Months
        1 Year
    """

    name = models.CharField(
        max_length=100,
        unique=True,
    )

    active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Lead(models.Model):
    class Status(models.TextChoices):
        QUALIFIED = "qualified", "Qualified"
        NOT_QUALIFIED = (
            "not_qualified",
            "Not qualified",
        )

    record = models.OneToOneField(
        Record,
        on_delete=models.PROTECT,
        related_name="lead",
    )

    name = models.CharField(
        max_length=200,
    )

    company = models.CharField(
        max_length=200,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=50,
        blank=True,
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    # ------------------------------------------------------------------------
    # NEW LEAD FIELDS
    # ------------------------------------------------------------------------

    product = models.ForeignKey(
        "Product",
        on_delete=models.PROTECT,
        related_name="leads",
        null=True,
        blank=True,
    )

    learning_mode = models.ForeignKey(
        LearningMode,
        on_delete=models.PROTECT,
        related_name="leads",
        null=True,
        blank=True,
    )

    course_duration = models.ForeignKey(
        CourseDuration,
        on_delete=models.PROTECT,
        related_name="leads",
        null=True,
        blank=True,
    )

    town_city = models.CharField(
        max_length=150,
        blank=True,
    )

    # ------------------------------------------------------------------------
    # EXISTING LEAD FIELDS
    # ------------------------------------------------------------------------

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_QUALIFIED,
    )

    disqualification_reason = models.CharField(
        max_length=100,
        blank=True,
    )

    """
    Existing database field retained for compatibility.

    Frontend label:
        Lead Feedback
    """

    notes = models.TextField(
        blank=True,
    )

    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]


class Contact(models.Model):
    record = models.OneToOneField(
        Record,
        on_delete=models.PROTECT,
        related_name="contact",
    )

    name = models.CharField(
        max_length=200,
    )

    company = models.CharField(
        max_length=200,
    )

    email = models.EmailField()

    phone = models.CharField(
        max_length=50,
        blank=True,
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.PROTECT,
    )

    notes = models.TextField(
        blank=True,
    )

    industry = models.CharField(
        max_length=100,
        blank=True,
    )

    location = models.CharField(
        max_length=200,
        blank=True,
    )

    became_contact_at = models.DateTimeField(
        auto_now_add=True,
    )

    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
    )


class Product(models.Model):
    name = models.CharField(
        max_length=150,
        unique=True,
    )

    description = models.TextField(
        blank=True,
    )

    default_value_minor = models.BigIntegerField(
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0),
        ],
    )

    active = models.BooleanField(
        default=True,
    )

    def __str__(self):
        return self.name


class Deal(models.Model):
    class Stage(models.TextChoices):
        PROPOSAL = "proposal", "Proposal"
        NEGOTIATION = (
            "negotiation",
            "Negotiation",
        )
        WON = "won", "Won"
        LOST = "lost", "Lost"

    record = models.ForeignKey(
        Record,
        on_delete=models.PROTECT,
        related_name="deals",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
    )

    value_minor = models.BigIntegerField(
        validators=[
            MinValueValidator(0),
        ],
    )

    stage = models.CharField(
        max_length=20,
        choices=Stage.choices,
        default=Stage.PROPOSAL,
    )

    expected_close_date = models.DateField()

    loss_reason = models.CharField(
        max_length=100,
        blank=True,
    )

    notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    closed_at = models.DateTimeField(
        null=True,
        blank=True,
    )


class Activity(models.Model):
    class Type(models.TextChoices):
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"
        NOTE = "note", "Note"
        FOLLOW_UP = (
            "follow_up",
            "Follow-up",
        )

    record = models.ForeignKey(
        Record,
        on_delete=models.PROTECT,
        related_name="activities",
    )

    deal = models.ForeignKey(
        Deal,
        on_delete=models.SET_NULL,
        related_name="activities",
        null=True,
        blank=True,
    )

    type = models.CharField(
        max_length=20,
        choices=Type.choices,
    )

    subject = models.CharField(
        max_length=300,
    )

    description = models.TextField(
        blank=True,
    )

    happened_at = models.DateTimeField()

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )


class Task(models.Model):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    title = models.CharField(
        max_length=300,
    )

    record = models.ForeignKey(
        Record,
        on_delete=models.PROTECT,
        related_name="tasks",
        null=True,
        blank=True,
    )

    deal = models.ForeignKey(
        Deal,
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )

    due_at = models.DateTimeField()

    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    task_type = models.CharField(
        max_length=100,
        default="follow_up",
    )

    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_tasks",
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_tasks",
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="completed_tasks",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["due_at", "id"]


class HistoryEvent(models.Model):
    record = models.ForeignKey(
        Record,
        on_delete=models.PROTECT,
        related_name="history",
    )

    action = models.CharField(
        max_length=100,
    )

    detail = models.JSONField(
        default=dict,
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]


class AuditEvent(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
    )

    action = models.CharField(
        max_length=100,
    )

    target_type = models.CharField(
        max_length=100,
    )

    target_id = models.CharField(
        max_length=100,
    )

    before = models.JSONField(
        default=dict,
    )

    after = models.JSONField(
        default=dict,
    )

    correlation_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )