import os
from typing import Any, Dict

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.graph import build_graph
from app.state import GraphState

workflow = build_graph()


class OrchestrateRequest(BaseModel):
    message: str
    user_id: str
    months: int = 12
    forecast_start_month: str | None = None
    ai_provider: str | None = None
    analyst_mode: str = "auto"
    financial_state: Dict[str, Any] = Field(default_factory=dict)


app = FastAPI(title="LangGraph Orchestrator", version="0.2.0")


@app.get("/")
def root():
    return {
        "service": "LangGraph Orchestrator",
        "health": "/health",
        "orchestrate": "POST /orchestrate",
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "app_web_base_url": os.environ.get("APP_WEB_BASE_URL", ""),
    }


@app.post("/orchestrate")
async def orchestrate(body: OrchestrateRequest):
    initial_state: GraphState = {
        "message": body.message,
        "user_id": body.user_id,
        "months": body.months,
        "forecast_start_month": body.forecast_start_month,
        "analyst_mode": body.analyst_mode,
        "intent": "general_finance_question",
        "routes": [],
        "snapshots": {},
        "specialist_outputs": {},
        "agents_used": [],
        "answer": "",
        "recommendation": "",
        "confidence": 0.0,
    }
    out = await workflow.ainvoke(initial_state)
    return {
        "answer": out["answer"],
        "recommendation": out["recommendation"],
        "intent": out["intent"],
        "confidence": out["confidence"],
        "agents_used": out.get("agents_used") or [],
    }
