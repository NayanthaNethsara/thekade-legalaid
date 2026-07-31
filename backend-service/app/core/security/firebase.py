from dataclasses import dataclass

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

_request = google_requests.Request()


class InvalidFirebaseTokenError(Exception):
    """Raised when a Firebase ID token fails signature, audience, or issuer checks."""


@dataclass(frozen=True)
class FirebaseIdentity:
    """Claims we trust from a verified Firebase ID token."""

    uid: str
    email: str | None
    display_name: str | None


def verify_firebase_id_token(token: str, project_id: str) -> FirebaseIdentity:
    """Validate a Firebase ID token against Google's public keys.

    Synchronous (fetches Google's signing certificates over HTTP), so call it
    through a threadpool from async code.
    """

    if not project_id:
        raise InvalidFirebaseTokenError("FIREBASE_PROJECT_ID is not configured")

    try:
        # google-auth ships without type stubs for this call.
        claims = google_id_token.verify_firebase_token(  # type: ignore[no-untyped-call]
            token, _request, audience=project_id
        )
    except (GoogleAuthError, ValueError) as error:
        raise InvalidFirebaseTokenError(str(error)) from error

    if claims.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise InvalidFirebaseTokenError("Unexpected token issuer")

    uid = claims.get("sub")
    if not isinstance(uid, str) or not uid:
        raise InvalidFirebaseTokenError("Token missing subject")

    return FirebaseIdentity(
        uid=uid,
        email=claims.get("email"),
        display_name=claims.get("name"),
    )
