from django.contrib import admin
from .models import Activity, AuditEvent, Contact, Deal, HistoryEvent, Lead, Product, Record, Role, Source, Task, User
admin.site.register([Activity, AuditEvent, Contact, Deal, HistoryEvent, Lead, Product, Record, Role, Source, Task, User])
