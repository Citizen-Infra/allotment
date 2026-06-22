from fastapi import Header, HTTPException
from allotment.config import get_settings


def require_operator(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {get_settings().admin_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="operator auth required")
