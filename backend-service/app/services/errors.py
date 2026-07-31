class AuthError(Exception):
    """Base class for auth domain errors the API layer maps to HTTP responses."""


class InvalidCredentialsError(AuthError):
    """The supplied token or sign-in proof did not resolve to a usable account."""


class GuestNotFoundError(AuthError):
    """No guest session exists for the supplied id (never created or expired)."""
