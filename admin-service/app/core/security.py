"""RBAC for admin-service endpoints.

This service performs no web-auth validation of its own. Authentication happens
at the Next.js edge, which forwards the verified role on the `X-User-Role`
header. Endpoints that mutate the knowledge base depend on `require_admin`,
which rejects non-admins before any heavy work (parsing, embedding) begins.
"""

from fastapi import Header, HTTPException, status

ADMIN_ROLE = "ADMIN"


def require_admin(x_user_role: str | None = Header(default=None)) -> str:
    """Allow the request only when the forwarded role is ADMIN."""
    if x_user_role != ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return x_user_role
