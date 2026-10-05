from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import AuditEvent, Contact, HistoryEvent, Lead, Record




def normalize_email(value):
    return str(value or "").strip().lower()


def normalize_phone(value):
    """Return the canonical Indian mobile representation used by LiteCRM."""
    value = str(value or "").strip()
    if not value:
        return ""
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return f"+91{digits}" if len(digits) == 10 else value


def validate_unique_contact_details(
    email=None,
    phone=None,
    *,
    exclude_lead_id=None,
    exclude_contact_id=None,
    check_leads=True,
    check_contacts=True,
):
    """
    Enforce email/mobile uniqueness across active Leads and Contacts.

    This is intentionally application-level rather than a DB unique constraint
    because Leads and Contacts are separate tables and a qualified Lead is
    converted into a Contact while retaining the same identity details.
    """
    errors = {}
    normalized_email = normalize_email(email)
    normalized_phone = normalize_phone(phone)

    if normalized_email:
        email_leads = (
            Lead.objects.filter(email__iexact=normalized_email, deleted_at__isnull=True)
            .exclude(pk=exclude_lead_id)
            if check_leads else Lead.objects.none()
        )
        email_contacts = (
            Contact.objects.filter(email__iexact=normalized_email, deleted_at__isnull=True)
            .exclude(pk=exclude_contact_id)
            if check_contacts else Contact.objects.none()
        )
        if email_leads.exists() or email_contacts.exists():
            errors["email"] = "This email address is already used by another Lead or Contact."

    if normalized_phone:
        candidates = []
        if check_leads:
            candidates.extend(
                Lead.objects.filter(phone__isnull=False, phone__gt="", deleted_at__isnull=True)
                .exclude(pk=exclude_lead_id)
                .values_list("id", "phone")
            )
        if check_contacts:
            candidates.extend(
                Contact.objects.filter(phone__isnull=False, phone__gt="", deleted_at__isnull=True)
                .exclude(pk=exclude_contact_id)
                .values_list("id", "phone")
            )
        if any(normalize_phone(existing_phone) == normalized_phone for _, existing_phone in candidates):
            errors["phone"] = "This mobile number is already used by another Lead or Contact."

    if errors:
        raise ValidationError(errors)


def audit(actor, action, target=None, before=None, after=None):
    if target is None:
        target_type = "Authentication"
        target_id = ""
    else:
        target_type = target.__class__.__name__
        target_id = str(target.pk)

    AuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=before or {},
        after=after or {},
    )

def history(record, actor, action, detail=None):
    return HistoryEvent.objects.create(record=record, actor=actor, action=action, detail=detail or {})


def record_is_visible(user, record):
    """Managers/admins may be granted global viewing; salespeople see records they own."""
    return record.owner_id == user.id or user.has_crm_permission("view_workspace_records")


def assert_visible(user, record):
    if not record_is_visible(user, record):
        raise PermissionDenied("You do not have access to this record.")


@transaction.atomic
def convert_lead(lead, actor):
    if lead.status != Lead.Status.QUALIFIED:
        raise ValidationError("Only qualified leads can be moved to Contacts.")
    assert_visible(actor, lead.record)
    if not actor.has_crm_permission("move_to_contact"):
        raise PermissionDenied("You do not have permission to move leads to contacts.")
    # The Lead itself is being converted, so its own email/mobile are allowed.
    # A different existing Contact must still not share either identifier.
    validate_unique_contact_details(
        email=lead.email,
        phone=lead.phone,
        check_leads=False,
        check_contacts=True,
    )
    contact = Contact.objects.create(
        record=lead.record,
        name=lead.name,
        company=lead.company,
        email=normalize_email(lead.email) or None,
        phone=normalize_phone(lead.phone) or None,
        source=lead.source,
        notes=lead.notes,
    )
    activity_count = lead.record.activities.count()
    history(lead.record, actor, "moved_to_contacts", {"activity_count": activity_count})
    audit(actor, "lead.converted", lead, after={"contact_id": contact.id})
    lead.delete()
    return contact, activity_count
