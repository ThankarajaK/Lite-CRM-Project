
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContactViewSet,
    CourseDurationViewSet,
    DealViewSet,
    LeadViewSet,
    LearningModeViewSet,
    NotificationViewSet,
    ProductViewSet,
    RecordViewSet,
    RoleViewSet,
    SourceViewSet,
    TaskViewSet,
    UserViewSet,
    admin_reset_password_view,
    admin_revoke_user_sessions_view,
    csrf_view,
    export_job_download_view,
    export_job_status_view,
    exports_create_view,
    login_view,
    logout_view,
    me_view,
    password_change_view,
    password_reset_confirm_view,
    password_reset_request_view,
    password_reset_verify_view,
    pipeline_conversion_reports_view,
    salesperson_performance_reports_view,
    sessions_revoke_all_view,
    sessions_view,
    business_configuration_view,
    workspace_audit_view,
)

router = DefaultRouter()

# ============================================================
# CRM RECORDS
# ============================================================

router.register("leads", LeadViewSet, basename="lead")
router.register("contacts", ContactViewSet, basename="contact")
router.register("deals", DealViewSet, basename="deal")
router.register("products", ProductViewSet)
router.register("sources", SourceViewSet, basename="source")
router.register("records", RecordViewSet, basename="record")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("tasks", TaskViewSet, basename="task")

# ============================================================
# LEAD MASTER DATA
# ============================================================

router.register("learning-modes", LearningModeViewSet, basename="learning-mode")
router.register("course-durations", CourseDurationViewSet, basename="course-duration")

# ============================================================
# USER / PERMISSION MANAGEMENT
# ============================================================

router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")

urlpatterns = [
    path("audit/", workspace_audit_view, name="workspace-audit"),
    path("business-configuration/", business_configuration_view, name="business-configuration"),
    path("business-configuration/items/<int:item_id>/", business_configuration_view, name="business-configuration-item"),
    # ========================================================
    # REPORTS
    # ========================================================

    path(
        "reports/pipeline-conversion/",
        pipeline_conversion_reports_view,
        name="pipeline-conversion-reports",
    ),
    path(
        "reports/salesperson-performance/",
        salesperson_performance_reports_view,
        name="salesperson-performance-reports",
    ),

    # ========================================================
    # EXPORTS
    # ========================================================

    path(
        "exports/",
        exports_create_view,
        name="exports-create",
    ),
    path(
        "exports/jobs/<uuid:job_id>/status/",
        export_job_status_view,
        name="export-job-status",
    ),
    path(
        "exports/jobs/<uuid:job_id>/download/",
        export_job_download_view,
        name="export-job-download",
    ),

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    path("auth/csrf/", csrf_view),
    path("auth/login/", login_view),
    path("auth/logout/", logout_view),
    path("auth/me/", me_view),

    # ========================================================
    # PASSWORD
    # ========================================================

    path("auth/password/change/", password_change_view),
    path("auth/password/reset/request/", password_reset_request_view),
    path("auth/password/reset/confirm/", password_reset_confirm_view),
    path("auth/password-reset/verify/", password_reset_verify_view),

    # ========================================================
    # SESSIONS
    # ========================================================

    path("auth/sessions/", sessions_view),
    path("auth/sessions/revoke-all/", sessions_revoke_all_view),

    # ========================================================
    # ADMIN USER MANAGEMENT
    # ========================================================

    path(
        "auth/users/<int:user_id>/sessions/revoke/",
        admin_revoke_user_sessions_view,
    ),
    path(
        "auth/users/<int:user_id>/password/reset/",
        admin_reset_password_view,
    ),

    # ========================================================
    # DRF ROUTER
    # ========================================================

    path("", include(router.urls)),
]
