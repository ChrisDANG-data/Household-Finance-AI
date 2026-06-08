from langgraph.graph import END, StateGraph

from app.nodes.composer import composer_node
from app.nodes.router import router_node
from app.nodes.specialists import run_specialists_node
from app.state import GraphState


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("router", router_node)
    graph.add_node("specialists", run_specialists_node)
    graph.add_node("composer", composer_node)

    graph.set_entry_point("router")
    graph.add_edge("router", "specialists")
    graph.add_edge("specialists", "composer")
    graph.add_edge("composer", END)
    return graph.compile()
