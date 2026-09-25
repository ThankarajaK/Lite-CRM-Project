import re
from django.contrib.auth import get_user_model


def normalize_identifier(value):
    value = (value or '').strip()
    if '@' in value:
        return value.casefold()
    return re.sub(r'[^0-9+]', '', value)


def find_user(identifier):
    User = get_user_model()
    normalized = normalize_identifier(identifier)
    if not normalized:
        return None
    user = User.objects.filter(email__iexact=normalized).select_related('role').first()
    if user:
        return user
    user = User.objects.filter(username__iexact=normalized).select_related('role').first()
    if user:
        return user
    return User.objects.filter(mobile=normalized).select_related('role').first()
