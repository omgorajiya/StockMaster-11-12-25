from typing import Any, Dict

from .models import AuditLog


def log_audit_event(
    *,
    document_type: str,
    document_id: int,
    action: str,
    user,
    message: str = '',
    before: Dict[str, Any] | None = None,
    after: Dict[str, Any] | None = None,
) -> AuditLog:
    """Persist an audit entry."""
    return AuditLog.objects.create(
        document_type=document_type.lower(),
        document_id=document_id,
        action=action,
        user=user,
        message=message,
        before_data=before,
        after_data=after,
    )

