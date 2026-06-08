import re
from collections import defaultdict
from typing import Any

from app.clients import web_api
from app.state import GraphState


def _format_money(value: Any) -> str:
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return str(value)
    return f"${amount:,.2f}"


def _cost_summary(snapshot: dict[str, Any]) -> str:
    risk = snapshot.get("risk") or {}
    timeline = snapshot.get("timeline") or []
    lines = [
        "Cost analyst (forecast snapshot):",
        f"- Risk level: {risk.get('risk_level', 'unknown')}",
        f"- Average monthly savings: {_format_money(risk.get('metrics', {}).get('average_monthly_savings', 0))} CAD",
        f"- Worst month cash flow: {_format_money(risk.get('metrics', {}).get('worst_month_cash_flow', 0))} CAD",
    ]

    stress = risk.get("stress_months") or []
    if stress:
        lines.append(f"- Stress months: {', '.join(stress[:6])}")

    if timeline:
        worst = min(timeline, key=lambda m: m.get("net_cash_flow", 0))
        lines.append(
            f"- Weakest month: {worst.get('month')} (net {_format_money(worst.get('net_cash_flow', 0))})"
        )

    insights = risk.get("insights") or []
    if insights:
        lines.append(f"- Insight: {insights[0]}")

    state = snapshot.get("state") or {}
    car_lease = []
    for event in state.get("events") or []:
        category = (event.get("category") or "").lower().replace("-", "_")
        if "lease" in category or category in ("car_lease", "carlease"):
            car_lease.append(
                f"- {event.get('category')}: {_format_money(event.get('amount'))} ({event.get('frequency')})"
            )
    if car_lease:
        lines.append("- Car/lease events in ledger:")
        lines.extend(car_lease)

    return "\n".join(lines)


def _short_account_name(name: str) -> str:
    return name.split(" · ")[0].strip() or name


def _parse_horizon_months(message: str, default: int = 3) -> int:
    msg = message.lower()
    patterns = (
        r"(?:following|next|over)\s+(\d+)\s*months?",
        r"(\d+)\s*months?",
        r"(\d+)-month",
    )
    for pattern in patterns:
        match = re.search(pattern, msg)
        if match:
            months = int(match.group(1))
            if 1 <= months <= 12:
                return months
    return default


def _wants_percentage_metrics(message: str) -> bool:
    msg = message.lower()
    return any(
        word in msg
        for word in (
            "percent",
            "percentage",
            "%",
            "average increase",
            "growth rate",
            "avg",
        )
    )


def _format_pct(value: float) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f}%"


def _ledger_cash_trend(snapshot: dict[str, Any], message: str = "") -> list[str]:
    state = snapshot.get("state") or {}
    current_cash = float(state.get("current_cash") or 0)
    timeline = snapshot.get("timeline") or []
    lines = [
        "#### Forecast cash (household ledger)",
        f"- Starting cash today: {_format_money(current_cash)} CAD",
    ]

    if not timeline:
        lines.append("- No forecast timeline available from your ledger.")
        return lines

    wants_pct = _wants_percentage_metrics(message)
    horizon = _parse_horizon_months(message) if wants_pct else 6

    lines.append("- Projected month-end cash:")
    running = current_cash
    month_closings: list[tuple[str, float]] = []

    for month_row in timeline[:horizon]:
        month = month_row.get("month") or "?"
        net = float(month_row.get("net_cash_flow") or 0)
        closing = month_row.get("closing_balance")
        if closing is None:
            running = running + net
            closing = running
        else:
            running = float(closing)
        month_closings.append((month, float(closing)))
        sign = "+" if net >= 0 else ""
        lines.append(
            f"  • {month}: {_format_money(closing)} CAD ({sign}{_format_money(net)} net)"
        )

    closings = [value for _, value in month_closings]
    if len(closings) > 1:
        change = closings[-1] - current_cash
        sign = "+" if change >= 0 else ""
        lines.append(
            f"- Trend: {_format_money(current_cash)} → {_format_money(closings[-1])} "
            f"over {len(month_closings)} months ({sign}{_format_money(change)} total)"
        )

    if wants_pct and month_closings:
        lines.append("- Month-over-month balance change:")
        previous = current_cash
        mom_pcts: list[float] = []
        for month, closing in month_closings:
            if previous != 0:
                pct = ((closing - previous) / abs(previous)) * 100
                mom_pcts.append(pct)
                lines.append(
                    f"  • {month}: {_format_pct(pct)} "
                    f"({_format_money(previous)} → {_format_money(closing)})"
                )
            previous = closing

        if mom_pcts:
            average = sum(mom_pcts) / len(mom_pcts)
            total_pct = (
                ((closings[-1] - current_cash) / abs(current_cash)) * 100
                if current_cash
                else 0.0
            )
            lines.append(
                f"- Average month-over-month increase ({len(mom_pcts)} months): "
                f"{_format_pct(average)}"
            )
            lines.append(
                f"- Total growth over {len(month_closings)} months: {_format_pct(total_pct)}"
            )

    return lines


def _plaid_account_lines(accounts: dict[str, Any]) -> list[str]:
    account_rows = accounts.get("accounts") or []
    lines = ["#### Linked accounts (Plaid)"]

    if not account_rows:
        lines.append("- No linked Plaid accounts.")
        return lines

    for row in account_rows[:8]:
        name = _short_account_name(
            row.get("account_name") or row.get("name") or "Account"
        )
        balance = row.get("balance")
        if balance is None:
            balance = row.get("balances", {}).get("current")
        currency = row.get("currency") or "USD"
        lines.append(f"- {name}: {_format_money(balance)} {currency}")

    return lines


def _plaid_history_lines(history: dict[str, Any]) -> list[str]:
    recent = history.get("recent") or []
    lines = ["#### Plaid balance history"]

    if not recent:
        lines.append(
            "- No Plaid snapshots yet — sync from the Balances page to track linked accounts."
        )
        return lines

    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for point in recent[:24]:
        date = point.get("snapshot_date") or "unknown"
        by_date[str(date)].append(point)

    for date in sorted(by_date.keys(), reverse=True)[:3]:
        lines.append(f"- {date}:")
        for point in by_date[date]:
            name = _short_account_name(point.get("account_name") or "Account")
            balance = point.get("balance")
            delta = point.get("balance_delta")
            delta_part = ""
            if delta is not None:
                sign = "+" if float(delta) >= 0 else ""
                delta_part = f" ({sign}{_format_money(delta)} vs prior)"
            lines.append(f"  • {name}: {_format_money(balance)}{delta_part}")

    return lines


def _investment_summary(
    accounts: dict[str, Any],
    history: dict[str, Any],
    snapshot: dict[str, Any],
    message: str = "",
) -> str:
    sections = [
        _ledger_cash_trend(snapshot, message),
        _plaid_account_lines(accounts),
        _plaid_history_lines(history),
    ]
    return "\n".join("\n".join(section) for section in sections)


def _payments_summary(ledger: dict[str, Any]) -> str:
    summary = ledger.get("summary") or {}
    obligations = ledger.get("obligations") or []
    lines = [
        "Payment planner (obligations ledger):",
        f"- Month: {summary.get('month', 'current')}",
        f"- Total obligations: {_format_money(summary.get('total_monthly_obligations', 0))}",
        f"- Obligation count: {summary.get('obligation_count', len(obligations))}",
    ]

    for ob in obligations[:8]:
        name = ob.get("name") or ob.get("category") or "Obligation"
        amount = ob.get("amount")
        freq = ob.get("frequency") or "?"
        lines.append(f"- {name}: {_format_money(amount)} ({freq})")

    if len(obligations) > 8:
        lines.append(f"- … and {len(obligations) - 8} more")

    return "\n".join(lines)


async def run_specialists_node(state: GraphState) -> GraphState:
    user_id = state["user_id"]
    months = state.get("months", 12)
    routes = state.get("routes") or []
    snapshots = dict(state.get("snapshots") or {})
    outputs = dict(state.get("specialist_outputs") or {})
    agents_used: list[str] = []

    for route in routes:
        try:
            if route == "cost":
                snapshots["cost"] = await web_api.fetch_financial_snapshot(
                    user_id, months
                )
                outputs["cost"] = _cost_summary(snapshots["cost"])
                agents_used.append("cost")
            elif route == "investment":
                accounts = await web_api.fetch_plaid_accounts(user_id)
                history = await web_api.fetch_plaid_history(user_id)
                forecast = await web_api.fetch_financial_snapshot(user_id, months)
                snapshots["investment"] = {
                    "accounts": accounts,
                    "history": history,
                    "forecast": forecast,
                }
                outputs["investment"] = _investment_summary(
                    accounts,
                    history,
                    forecast,
                    state.get("message") or "",
                )
                agents_used.append("investment")
            elif route == "payments":
                ledger = await web_api.fetch_ledger(
                    state.get("forecast_start_month")
                )
                snapshots["payments"] = ledger
                outputs["payments"] = _payments_summary(ledger)
                agents_used.append("payments")
        except Exception as exc:  # noqa: BLE001 — surface per-agent failure in answer
            outputs[route] = (
                f"{route.title()} analyst could not load data: {exc}"
            )
            agents_used.append(route)

    state["snapshots"] = snapshots
    state["specialist_outputs"] = outputs
    state["agents_used"] = agents_used
    return state
