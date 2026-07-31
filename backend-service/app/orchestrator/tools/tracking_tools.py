import asyncio

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, tool

from app.orchestrator.tools.common import _identity
from app.orchestrator.utils.turns import tool_output_to_text
from app.repositories.order_tracking_repository import OrderTrackingRepository


def build_list_tracked_orders_tool(order_tracking_repo: OrderTrackingRepository) -> BaseTool:
    @tool
    async def list_tracked_orders(config: RunnableConfig) -> str:
        """List the customer's tracking numbers and their last-known status from
        records, WITHOUT contacting the live tracking service.

        Use this to see which orders the customer has on file before deciding what
        to do -- for example to find the relevant number, or to answer 'which orders
        am I tracking?'. To get the live delivery progress of one number, use
        kakille_track_order; for live status of all of them, use track_all_active_orders.
        """
        identity = _identity(config)
        if not identity:
            return "No tracking history is available for this customer."

        records = await order_tracking_repo.get_all_for_user(identity)
        if not records:
            return "This customer has no tracking numbers on file."

        lines = [f"- {r.tracking_number} (last known: {r.status})" for r in records]
        return "Tracked orders on file:\n" + "\n".join(lines)

    return list_tracked_orders


def build_track_all_active_orders_tool(
    mcp_tools: list[BaseTool],
    order_tracking_repo: OrderTrackingRepository,
) -> BaseTool:
    @tool
    async def track_all_active_orders(config: RunnableConfig) -> str:
        """Look up status and delivery progress for all tracked Kakille orders.

        Use this when the customer asks about their orders tracking
        (e.g. 'check my orders', 'status of all my orders')
        and has multiple active tracking numbers.
        """
        identity = _identity(config)
        if not identity:
            return "No tracking history is available for this customer."

        records = await order_tracking_repo.get_all_for_user(identity)
        tracking_numbers = [r.tracking_number for r in records if r.status == "tracking"]
        if not tracking_numbers:
            return "No active tracked orders found for this customer."

        track_tool = next((t for t in mcp_tools if t.name == "kakille_track_order"), None)
        if not track_tool:
            return "Order tracking tool is currently unavailable."

        async def resolve_one(order_number: str) -> str:
            try:
                res = await track_tool.ainvoke({"order_number": order_number})
                return f"### Order {order_number}\n{tool_output_to_text(res)}"
            except Exception:
                try:
                    res = await track_tool.ainvoke({"params": {"order_number": order_number}})
                    return f"### Order {order_number}\n{tool_output_to_text(res)}"
                except Exception as e:
                    return f"### Order {order_number}\nError: {str(e)}"

        results = await asyncio.gather(*(resolve_one(num) for num in tracking_numbers))
        return "\n\n".join(results)

    return track_all_active_orders
