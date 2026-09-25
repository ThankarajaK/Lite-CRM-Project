from datetime import timedelta
from django.contrib.auth import logout
from django.http import JsonResponse
from django.utils import timezone
from .models import CrmSession


class CrmSessionMiddleware:
    """Enforce the PRD's 8-hour absolute and 60-minute inactivity limits."""
    ABSOLUTE = timedelta(hours=8)
    INACTIVITY = timedelta(minutes=60)

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated and request.session.session_key:
            session = CrmSession.objects.filter(session_key=request.session.session_key, user=user, revoked_at__isnull=True).first()
            now = timezone.now()
            if not session or now - session.created_at >= self.ABSOLUTE or now - session.last_seen_at >= self.INACTIVITY:
                if session:
                    session.revoked_at = now
                    session.save(update_fields=['revoked_at'])
                logout(request)
                if request.path.startswith('/api/'):
                    return JsonResponse({'detail': 'Authentication required.'}, status=401)
            else:
                session.last_seen_at = now
                session.save(update_fields=['last_seen_at'])
        return self.get_response(request)
