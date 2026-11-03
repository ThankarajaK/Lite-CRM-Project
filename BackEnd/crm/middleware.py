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

class AuditTrailMiddleware:
    """Attach request metadata to explicit audit events and cover successful writes."""
    SENSITIVE_KEYS = {"password", "token", "access", "refresh", "secret", "authorization", "csrfmiddlewaretoken"}

    def __init__(self, get_response):
        self.get_response = get_response

    @classmethod
    def _safe_payload(cls, value, depth=0):
        if depth > 4:
            return "[truncated]"
        if isinstance(value, dict):
            return {str(k): ("[redacted]" if str(k).lower() in cls.SENSITIVE_KEYS else cls._safe_payload(v, depth + 1)) for k, v in list(value.items())[:80]}
        if isinstance(value, (list, tuple)):
            return [cls._safe_payload(v, depth + 1) for v in value[:80]]
        if value is None or isinstance(value, (str, int, float, bool)):
            return value if not isinstance(value, str) or len(value) <= 1000 else value[:1000]
        return str(value)[:500]

    def __call__(self, request):
        import uuid
        from .services import set_audit_request_context, reset_audit_request_context

        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        try:
            correlation_id = str(uuid.UUID(str(correlation_id)))
        except (ValueError, TypeError, AttributeError):
            correlation_id = str(uuid.uuid4())
        request.audit_correlation_id = correlation_id
        ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
        context = {"correlation_id": correlation_id, "ip_address": ip or None, "browser": request.META.get("HTTP_USER_AGENT", "")[:500], "events_written": 0}
        token = set_audit_request_context(context)
        try:
            response = self.get_response(request)
            if request.method in {"POST", "PUT", "PATCH", "DELETE"} and 200 <= response.status_code < 400:
                # Explicit domain audit calls are preferred. This is a safety net for successful write routes.
                if context["events_written"] == 0 and getattr(request, "user", None) and request.user.is_authenticated:
                    import json
                    from .services import audit
                    body = {}
                    try:
                        if request.content_type == "application/json" and request.body:
                            body = self._safe_payload(json.loads(request.body.decode("utf-8")))
                    except Exception:
                        body = {"detail": "Request payload unavailable"}
                    parts = [part for part in request.path.strip("/").split("/") if part]
                    target_type = parts[-2] if len(parts) > 1 else (parts[-1] if parts else "Workspace")
                    target_id = parts[-1] if parts and parts[-1].isdigit() else ""
                    audit(request.user, f"api.{request.method.lower()}", after={"path": request.path, "status": response.status_code, "payload": body, "target_type": target_type, "target_id": target_id})
            response["X-Correlation-ID"] = correlation_id
            return response
        finally:
            reset_audit_request_context(token)
