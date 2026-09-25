from rest_framework.permissions import BasePermission


class HasCrmPermission(BasePermission):
    permission_key = None
    def has_permission(self, request, view):
        key = getattr(view, "permission_key", self.permission_key)
        return bool(key and request.user.has_crm_permission(key))
