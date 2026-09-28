import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# =============================================================================
# Basic Django Configuration
# =============================================================================

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "unsafe-development-key",
)

DEBUG = (
    os.getenv("DJANGO_DEBUG", "false").lower()
    == "true"
)

ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1",
).split(",")


# =============================================================================
# Installed Applications
# =============================================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",

    "crm",
]


# =============================================================================
# Middleware
# =============================================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",

    "crm.middleware.CrmSessionMiddleware",
]


# =============================================================================
# URL / Template / Application Configuration
# =============================================================================

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# =============================================================================
# Database
# =============================================================================

database_url = os.getenv("DATABASE_URL", "")

if database_url.startswith("mysql"):
    from urllib.parse import urlparse

    parsed = urlparse(database_url)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username,
            "PASSWORD": parsed.password,
            "HOST": parsed.hostname,
            "PORT": parsed.port or 3306,
            "OPTIONS": {
                "charset": "utf8mb4",
            },
        }
    }

else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# =============================================================================
# Custom User Model
# =============================================================================

AUTH_USER_MODEL = "crm.User"


# =============================================================================
# Password Validation
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 8,
        },
    },
]


# =============================================================================
# Internationalization
# =============================================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# =============================================================================
# Static Files
# =============================================================================

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =============================================================================
# Password Hashing
# =============================================================================

PASSWORD_HASHERS = [
    os.getenv(
        "DJANGO_PASSWORD_HASHER",
        "django.contrib.auth.hashers.Argon2PasswordHasher",
    )
]


# =============================================================================
# Django REST Framework
# =============================================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination.PageNumberPagination"
    ),
    "PAGE_SIZE": 25,
}


# =============================================================================
# CORS / CSRF
# =============================================================================

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173",
).split(",")

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS


# =============================================================================
# Session / CSRF Cookies
# =============================================================================

SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SECURE = not DEBUG

SESSION_COOKIE_AGE = 60 * 60 * 8

SESSION_SAVE_EVERY_REQUEST = True

SESSION_COOKIE_HTTPONLY = True

SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SAMESITE = "Lax"


# =============================================================================
# Email / SMTP
# =============================================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "mail.iattechnologies.com",
)

EMAIL_PORT = int(
    os.getenv(
        "EMAIL_PORT",
        "465",
    )
)

EMAIL_USE_SSL = (
    os.getenv(
        "EMAIL_USE_SSL",
        "true",
    ).lower()
    == "true"
)

EMAIL_USE_TLS = (
    os.getenv(
        "EMAIL_USE_TLS",
        "false",
    ).lower()
    == "true"
)

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER,
)

EMAIL_TIMEOUT = 30


# =============================================================================
# Login Security
# =============================================================================

LOGIN_LOCKOUT_MINUTES = int(
    os.getenv(
        "LOGIN_LOCKOUT_MINUTES",
        "15",
    )
)