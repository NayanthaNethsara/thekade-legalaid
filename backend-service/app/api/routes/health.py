from fastapi import APIRouter, Request, Response, status

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict[str, str]:
    """Liveness probe: the process is up and serving HTTP."""
    return {"status": "ok"}


@router.get("/ready")
async def readiness(request: Request, response: Response) -> dict[str, object]:
    """Readiness probe: dependencies (NATS) are connected."""
    nats_client = request.app.state.nats_client
    nats_connected = nats_client is not None and nats_client.is_connected

    if not nats_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if nats_connected else "degraded",
        "checks": {"nats": "connected" if nats_connected else "disconnected"},
    }
