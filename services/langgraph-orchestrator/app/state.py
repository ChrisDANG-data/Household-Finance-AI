from typing import Any, TypedDict


class GraphState(TypedDict, total=False):
    message: str
    user_id: str
    months: int
    forecast_start_month: str | None
    analyst_mode: str
    intent: str
    routes: list[str]
    snapshots: dict[str, Any]
    specialist_outputs: dict[str, str]
    agents_used: list[str]
    answer: str
    recommendation: str
    confidence: float
