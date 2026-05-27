"""Error classes for the StoicOS SDK."""


class AgentOSError(Exception):
    """Base error for all StoicOS SDK errors."""

    def __init__(self, message: str, code: str = "UNKNOWN", status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class AuthError(AgentOSError):
    """Raised when authentication fails (invalid API key or token)."""

    def __init__(self, message: str = "Invalid API key"):
        super().__init__(message, code="AUTH_ERROR", status_code=401)


class ValidationError(AgentOSError):
    """Raised when request parameters are invalid."""

    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)


class RateLimitError(AgentOSError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limited", limit: int = 0, current: int = 0):
        super().__init__(message, code="RATE_LIMIT", status_code=429)
        self.limit = limit
        self.current = current
