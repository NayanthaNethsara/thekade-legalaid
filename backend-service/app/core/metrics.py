from prometheus_client import Counter

TOOL_CALLS_TOTAL = Counter(
    "orchestrator_tool_calls_total",
    "Total orchestrator tool calls executed, by tool name and execution status",
    ["tool_name", "status"],
)

TURNS_TOTAL = Counter(
    "orchestrator_turns_total",
    "Total orchestrator conversation turns executed, by channel and completion status",
    ["channel", "status"],
)
