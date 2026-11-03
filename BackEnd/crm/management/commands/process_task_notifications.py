from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from crm.models import Notification, Task
from crm.services import create_notification


class Command(BaseCommand):
    help = "Create due/overdue task notifications and purge notifications older than 90 days."

    def handle(self, *args, **options):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timedelta(days=1)
        due_today = Task.objects.filter(
            completed_at__isnull=True, due_at__gte=today_start, due_at__lt=tomorrow_start
        ).select_related("assignee", "record")
        for task in due_today.iterator():
            create_notification(
                task.assignee, "task.due_today", f'Task "{task.title}" is due today.',
                record=task.record, target_type="task", target_id=task.id,
                dedupe_key=f"task:{task.id}:user:{task.assignee_id}:due_today:{today_start.date().isoformat()}",
            )

        overdue = Task.objects.filter(
            completed_at__isnull=True, due_at__lt=now
        ).select_related("assignee", "record")
        for task in overdue.iterator():
            create_notification(
                task.assignee, "task.overdue", f'Task "{task.title}" is overdue.',
                record=task.record, target_type="task", target_id=task.id,
                dedupe_key=f"task:{task.id}:user:{task.assignee_id}:overdue",
            )

        cutoff = now - timedelta(days=90)
        deleted, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Task reminders processed; removed {deleted} expired notification records."
        ))
