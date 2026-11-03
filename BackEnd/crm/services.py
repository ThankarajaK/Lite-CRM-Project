from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
import re
from contextvars import ContextVar
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import AuditEvent, Contact, HistoryEvent, Lead, Notification, Record

User = get_user_model()
_audit_request_context = ContextVar("crm_audit_request_context", default=None)


def set_audit_request_context(value):
    return _audit_request_context.set(value)


def reset_audit_request_context(token):
    _audit_request_context.reset(token)


def audit(actor, action, target=None, before=None, after=None):
    if target is None:
        target_type = str((after or {}).get("target_type") or "Authentication")
        target_id = str((after or {}).get("target_id") or "")
    else:
        target_type = target.__class__.__name__
        target_id = str(target.pk)

    request_context = _audit_request_context.get() or {}
    if isinstance(request_context, dict):
        request_context["events_written"] = request_context.get("events_written", 0) + 1
    AuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before=before or {},
        after=after or {},
        correlation_id=request_context.get("correlation_id") or __import__("uuid").uuid4(),
        ip_address=request_context.get("ip_address"),
        browser=request_context.get("browser", ""),
    )

# EPIC 9: History is an application-owned, append-only event stream.
# Only these system events may ever be written to HistoryEvent.
HISTORY_ACTIONS = frozenset({
    "lead_captured",
    "contact_created",
    "qualified",
    "not_qualified",
    "moved_to_contacts",
    "deal_created",
    "deal_value_updated",
    "deal_stage_changed",
    "deal_won",
    "deal_lost",
    "reassigned",
    "edited",
    "merged",
    "deleted",
    "activity_edited",
    "activity_voided",
})


def history(record, actor, action, detail=None):
    if action not in HISTORY_ACTIONS:
        raise ValueError(f"Unsupported history action: {action}")
    return HistoryEvent.objects.create(
        record=record,
        actor=actor,
        action=action,
        detail=detail or {},
    )


def can_read_record_history(user, record):
    """History follows the record's existing read visibility."""
    if not record_is_visible(user, record):
        return False
    if user.has_crm_permission("view_workspace_records"):
        return True
    return bool(
        (hasattr(record, "lead") and user.has_crm_permission("view_leads"))
        or (hasattr(record, "contact") and user.has_crm_permission("view_contacts"))
    )


def record_is_visible(user, record):
    """Managers/admins may be granted global viewing; salespeople see records they own."""
    return record.owner_id == user.id or user.has_crm_permission("view_workspace_records")


def assert_visible(user, record):
    if not record_is_visible(user, record):
        raise PermissionDenied("You do not have access to this record.")



def create_notification(user, event_type, message, *, actor=None, record=None, target_type="", target_id="", dedupe_key=None):
    """Create an in-app notification while suppressing self-notifications."""
    if not user or (actor is not None and user.pk == actor.pk):
        return None
    defaults = {
        "event_type": event_type,
        "message": str(message)[:500],
        "record": record,
        "target_type": target_type or "",
        "target_id": str(target_id or ""),
    }
    if dedupe_key:
        notification, _ = Notification.objects.get_or_create(
            dedupe_key=str(dedupe_key)[:255],
            defaults={"user": user, **defaults},
        )
        return notification
    return Notification.objects.create(user=user, **defaults)


def notify_record_assignment(record, new_owner, actor, record_type, target_id, display_name):
    if new_owner and new_owner.pk != getattr(actor, "pk", None):
        create_notification(
            new_owner, "record.assigned", f"{display_name} has been assigned to you.",
            actor=actor, record=record, target_type=record_type, target_id=target_id,
        )


def notify_record_mentions(text, actor, record, record_type, target_id, display_name):
    """Notify active users explicitly mentioned as @username in activity text."""
    if not text:
        return
    handles = {match.casefold() for match in re.findall(r"(?<![\w.])@([A-Za-z0-9_.-]{1,150})", str(text))}
    if not handles:
        return
    for handle in handles:
        user = User.objects.filter(is_active=True, username__iexact=handle).exclude(
            pk=getattr(actor, "pk", None)
        ).first()
        if user:
            create_notification(
                user, "record.mentioned", f"You were mentioned in an activity on {display_name}.",
                actor=actor, record=record, target_type=record_type, target_id=target_id,
            )


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

    # Preserve the existing event type while adding a safe record destination.
    owner = lead.record.owner
    if owner and owner.id != actor.id:
        create_notification(
            owner, "lead.moved_to_contacts", f"{lead.name} is now a contact.",
            actor=actor, record=lead.record, target_type="contact", target_id=contact.id,
        )

    lead.delete()
    return contact, activity_count
