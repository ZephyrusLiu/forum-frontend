from functools import wraps
import jwt
from flask import current_app, request, g
from .message import RErrorMessage

def _error_response(message: str, status: int):
  response = RErrorMessage(error_text=message, response_code=status)
  return response.get()

def _get_bearer_token(req) -> str | None:
  auth = req.headers.get("Authorization", "")
  if not auth:
    return None
  if not auth.lower().startswith("bearer "):
    return None
  token = auth.split(" ", 1)[1].strip()
  return token or None

def _decode_jwt(token: str) -> dict:
  secret = current_app.config.get("JWT_SECRET")
  alg = current_app.config.get("JWT_ALG", "HS256")
  return jwt.decode(token, secret, algorithms=[alg], options={"verify_aud": False})

def login_required(fn):
  @wraps(fn)
  def wrapper(*args, **kwargs):
    token = _get_bearer_token(request)
    if not token:
      return _error_response("Missing Bearer token", 401)

    try:
      claims = _decode_jwt(token)
    except jwt.ExpiredSignatureError:
      return _error_response("Token expired", 401)
    except jwt.InvalidTokenError:
      return _error_response("Invalid token", 401)

    user_id = claims.get("sub") or claims.get("id")
    if user_id is None:
      return _error_response("Token missing sub/id", 401)

    # type = role (user/admin/super)
    role = (claims.get("type") or "").strip().lower()

    # status = unverified/active/banned
    status = (claims.get("status") or "").strip().lower()
    if status not in {"unverified", "active", "banned"}:
      # If unknown, treat as unauthorized to be safe
      return _error_response("Invalid status claim", 401)

    if status == "banned":
      return _error_response("User is banned", 403)

    # Normalize for controllers
    g.user = {
      "userId": str(user_id),
      "role": role,                 # user/admin/super
      "status": status,             # unverified/active
      "verified": status != "unverified",
      **claims,
    }

    return fn(*args, **kwargs)
  return wrapper

def permission_checking(*allowed_roles: str):
  normalized_roles = {role.strip().lower() for role in allowed_roles if role}

  def decorator(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
      user = getattr(g, "user", None)
      if not user:
        return _error_response("Missing user context", 401)

      role = (user.get("role") or "").strip().lower()
      if normalized_roles and role not in normalized_roles:
        return _error_response("Insufficient permissions", 403)

      return fn(*args, **kwargs)
    return wrapper
  return decorator