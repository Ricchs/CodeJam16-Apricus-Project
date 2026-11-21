import os
from functools import lru_cache
from uuid import UUID

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
ISSUER = f"{SUPABASE_URL}/auth/v1"

bearer = HTTPBearer()


@lru_cache(maxsize=1)
def jwks_client() -> jwt.PyJWKClient:
    """Supabase's public signing keys; fetched once, then cached."""
    return jwt.PyJWKClient(f"{ISSUER}/.well-known/jwks.json")


def get_current_claims(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    """Verifies the Supabase access token and returns its claims."""
    token = credentials.credentials
    try:
        key = jwks_client().get_signing_key_from_jwt(token).key
        return jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=ISSUER,
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user_id(claims: dict = Depends(get_current_claims)) -> UUID:
    """The logged-in user's UUID (same as users.id)."""
    return UUID(claims["sub"])