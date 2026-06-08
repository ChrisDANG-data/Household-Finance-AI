from app.state import GraphState


def _classify_intent(message: str) -> str:
    msg = message.lower()
    if any(
        phrase in msg
        for phrase in (
            "afford",
            "can i afford",
            "afford another",
            "do i have enough",
        )
    ):
        return "affordability_check"
    if "what if" in msg or "if i" in msg or "suppose i" in msg:
        return "what_if_simulation"
    if "invest" in msg and any(
        phrase in msg
        for phrase in ("can i increase", "could i increase", "increase my", "add ")
    ):
        return "what_if_simulation"
    if "why" in msg or "explain" in msg:
        return "explanation_request"
    return "general_finance_question"


def _auto_routes(message: str) -> list[str]:
    msg = message.lower()
    routes: list[str] = []

    if any(
        word in msg
        for word in (
            "expense",
            "spending",
            "cost",
            "afford",
            "cash flow",
            "budget",
        )
    ):
        routes.append("cost")

    if any(
        word in msg
        for word in (
            "payment",
            "bill",
            "due",
            "insurance",
            "lease",
            "installment",
        )
    ):
        routes.append("payments")

    if any(
        word in msg
        for word in (
            "invest",
            "investment",
            "balance",
            "trend",
            "checking",
            "savings",
            "plaid",
            "portfolio",
        )
    ):
        routes.append("investment")

    if not routes:
        if _classify_intent(message) in (
            "affordability_check",
            "what_if_simulation",
        ):
            return ["cost", "payments", "investment"]
        return ["cost", "payments"]

    # Affordability-style questions benefit from all three specialists.
    if _classify_intent(message) == "affordability_check":
        for route in ("cost", "payments", "investment"):
            if route not in routes:
                routes.append(route)

    return routes


def router_node(state: GraphState) -> GraphState:
    message = state["message"]
    mode = state.get("analyst_mode", "auto")

    if mode in ("cost", "investment", "payments"):
        routes = [mode]
    else:
        routes = _auto_routes(message)

    state["intent"] = _classify_intent(message)
    state["routes"] = routes
    state["snapshots"] = state.get("snapshots") or {}
    state["specialist_outputs"] = state.get("specialist_outputs") or {}
    state["agents_used"] = []
    return state
