from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import AuditEvent, Contact, HistoryEvent, Lead, Record


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
    contact = Contact.objects.create(record=lead.record, name=lead.name, company=lead.company, email=lead.email, phone=lead.phone, source=lead.source, notes=lead.notes)
    activity_count = lead.record.activities.count()
    history(lead.record, actor, "moved_to_contacts", {"activity_count": activity_count})
    audit(actor, "lead.converted", lead, after={"contact_id": contact.id})
    lead.delete()
    return contact, activity_count
