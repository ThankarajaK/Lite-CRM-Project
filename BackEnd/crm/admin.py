from django.contrib import admin
from .models import Activity, AuditEvent, Contact, Deal, Lead, Product, Record, Role, Source, Task, User


# HistoryEvent is intentionally not registered in Django admin.
# Epic 9 history is application-owned and append-only; users must not be able
# to add, edit, or remove history entries manually through the admin route.
admin.site.register([
    Activity,
    AuditEvent,
    Contact,
    Deal,
    Lead,
    Product,
    Record,
    Role,
    Source,
    Task,
    User,
])
