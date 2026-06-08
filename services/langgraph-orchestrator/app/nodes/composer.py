import re
from typing import Any

from app.state import GraphState

AGENT_LABELS = {
    "cost": "Cost analyst",
    "investment": "Investment analyst",
    "payments": "Payment planner",
}


def _format_money(value: Any) -> str:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return str(value)
    return f"${amount:,.2f}"


def _parse_monthly_amount(message: str) -> float | None:
    patterns = [
        r"\$?\s*([\d,]+(?:\.\d{1,2})?)\s*/\s*month",
        r"\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\$\s*/\s*month",
        r"\$?\s*([\d,]+(?:\.\d{1,2})?)\s*per\s+month",
        r"\b([\d,]+(?:\.\d{1,2})?)\s*\$\s*/\s*month",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def _car_lease_lines(snapshot: dict[str, Any]) -> list[str]:
    state = snapshot.get("state") or {}
    events = state.get("events") or []
    lines: list[str] = []
    for event in events:
        category = (event.get("category") or "").lower().replace("-", "_")
        if "lease" in category or category in ("car_lease", "carlease"):
            freq = event.get("frequency") or "?"
            lines.append(
                f"- {event.get('category')}: {_format_money(event.get('amount'))} ({freq})"
            )
    return lines


def _affordability_summary(state: GraphState) -> str | None:
    message = state.get("message") or ""
    if "afford" not in message.lower():
        return None

    proposed = _parse_monthly_amount(message)
    if proposed is None:
        return None

    cost_snap = (state.get("snapshots") or {}).get("cost") or {}
    risk = cost_snap.get("risk") or {}
    worst = (risk.get("metrics") or {}).get("worst_month_cash_flow")
    if worst is None:
        return None

    remaining = float(worst) - proposed
    verdict = (
        "Yes - likely affordable on the simulated forecast."
        if remaining > 500
        else "Caution - tight after the added payment."
        if remaining > 0
        else "No - would push worst-month cash flow negative."
    )

    lines = [
        "### Affordability summary",
        f"- Proposed **additional** payment: {_format_money(proposed)}/month",
    ]

    car_lines = _car_lease_lines(cost_snap)
    if car_lines:
        lines.append("- Existing car/lease in your ledger (already in forecast):")
        lines.extend(car_lines)
        lines.append(
            f"- Combined car cost if both apply: existing lease(s) + {_format_money(proposed)}/month"
        )
    else:
        lines.append("- No car/lease category found in ledger events.")

    lines.extend(
        [
            f"- Worst-month net cash flow (current forecast): {_format_money(worst)} CAD",
            f"- Estimated buffer after +{_format_money(proposed)}/month: about {_format_money(remaining)} CAD",
            f"- **Verdict:** {verdict}",
            "- Note: Payment planner obligations may duplicate document-sourced leases; ledger events drive the forecast.",
        ]
    )
    return "\n".join(lines)


def composer_node(state: GraphState) -> GraphState:
    outputs = state.get("specialist_outputs") or {}
    agents = state.get("agents_used") or []
    intent = state.get("intent", "general_finance_question")

    sections: list[str] = []

    afford_summary = _affordability_summary(state)
    if afford_summary:
        sections.append(afford_summary)
    else:
        for agent in agents:
            label = AGENT_LABELS.get(agent, agent)
            body = outputs.get(agent, "No output.")
            sections.append(f"### {label}\n{body}")

    if not sections:
        sections.append(
            "No specialist data was retrieved. Check APP_WEB_BASE_URL and that the web app is running."
        )

    answer = "\n\n".join(sections)

    message = (state.get("message") or "").lower()
    is_investment_question = "invest" in message and any(
        word in message for word in ("increase", "add", "extra", "contribute", "can i")
    )
    is_balance_trend = "balance" in message and any(
        word in message
        for word in ("trend", "history", "over time", "changing", "going")
    )

    if afford_summary:
        recommendation = (
            "Confirm whether the new payment replaces or adds to your current car-lease event."
        )
        confidence = 0.85
    elif is_balance_trend:
        recommendation = (
            "Use forecast cash for planned affordability; use Plaid balances for "
            "what is actually in linked accounts today."
        )
        confidence = 0.82
    elif is_investment_question:
        recommendation = (
            "Compare August cash flow and liquid balances against the proposed "
            "one-time investment before committing."
        )
        confidence = 0.8
    elif intent == "affordability_check":
        recommendation = (
            "Compare the cost outlook, upcoming payments, and liquid balances above "
            "before committing to new recurring expenses."
        )
        confidence = 0.82
    elif intent == "what_if_simulation":
        recommendation = (
            "Review stress months in the cost section and payment timing before applying the scenario."
        )
        confidence = 0.78
    else:
        recommendation = (
            "Review your forecast timeline and linked account balances before major decisions."
        )
        confidence = 0.75

    state["answer"] = answer
    state["recommendation"] = recommendation
    state["confidence"] = confidence
    return state
