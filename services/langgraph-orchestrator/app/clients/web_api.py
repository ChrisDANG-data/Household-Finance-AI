import os
from typing import Any

import httpx

DEFAULT_BASE = "http://host.docker.internal:3000"
TIMEOUT = 30.0


def web_base_url() -> str:
    return os.environ.get("APP_WEB_BASE_URL", DEFAULT_BASE).rstrip("/")


def _unwrap(payload: dict[str, Any]) -> Any:
    if payload.get("success") is True and "data" in payload:
        return payload["data"]
    return payload


async def fetch_financial_snapshot(user_id: str, months: int) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{web_base_url()}/api/financial-state/snapshot",
            json={"user_id": user_id, "use_persisted": True, "months": months},
        )
        response.raise_for_status()
        return _unwrap(response.json())


async def fetch_plaid_accounts(user_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            f"{web_base_url()}/api/integrations/plaid/accounts",
            params={"user_id": user_id},
        )
        response.raise_for_status()
        return _unwrap(response.json())


async def fetch_plaid_history(user_id: str, limit: int = 12) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            f"{web_base_url()}/api/integrations/plaid/history",
            params={"user_id": user_id, "limit": limit},
        )
        response.raise_for_status()
        return _unwrap(response.json())


async def fetch_ledger(month: str | None = None) -> dict[str, Any]:
    params: dict[str, str] = {}
    if month:
        params["month"] = month
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(
            f"{web_base_url()}/api/financial-state/ledger",
            params=params,
        )
        response.raise_for_status()
        return _unwrap(response.json())
