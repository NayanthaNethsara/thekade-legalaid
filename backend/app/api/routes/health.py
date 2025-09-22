from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from app.db.database import db_manager
import asyncio

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "LegalAid API"
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including database connections"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "LegalAid API",
        "databases": {}
    }
    
    # Check MongoDB connection
    try:
        if db_manager.mongodb_client:
            await db_manager.mongodb_client.admin.command('ping')
            health_status["databases"]["mongodb"] = {
                "status": "connected",
                "database": db_manager.mongodb_db.name if db_manager.mongodb_db else "unknown"
            }
        else:
            health_status["databases"]["mongodb"] = {"status": "not_initialized"}
    except Exception as e:
        health_status["databases"]["mongodb"] = {
            "status": "error",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check Redis connection
    try:
        if db_manager.redis_client:
            await db_manager.redis_client.ping()
            health_status["databases"]["redis"] = {"status": "connected"}
        else:
            health_status["databases"]["redis"] = {"status": "not_initialized"}
    except Exception as e:
        health_status["databases"]["redis"] = {
            "status": "error", 
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/health/mongodb")
async def mongodb_health():
    """MongoDB specific health check"""
    try:
        if not db_manager.mongodb_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="MongoDB client not initialized"
            )
        
        # Test connection with ping
        await db_manager.mongodb_client.admin.command('ping')
        
        # Get server info
        server_info = await db_manager.mongodb_client.admin.command('serverStatus')
        
        return {
            "status": "connected",
            "database": db_manager.mongodb_db.name if db_manager.mongodb_db else "unknown",
            "server_version": server_info.get("version", "unknown"),
            "uptime": server_info.get("uptime", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MongoDB health check failed: {str(e)}"
        )


@router.get("/health/redis")
async def redis_health():
    """Redis specific health check"""
    try:
        if not db_manager.redis_client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Redis client not initialized"
            )
        
        # Test connection with ping
        pong = await db_manager.redis_client.ping()
        if not pong:
            raise Exception("Redis ping failed")
        
        # Get Redis info
        redis_info = await db_manager.redis_client.info()
        
        return {
            "status": "connected",
            "ping": "pong",
            "redis_version": redis_info.get("redis_version", "unknown"),
            "used_memory": redis_info.get("used_memory_human", "unknown"),
            "connected_clients": redis_info.get("connected_clients", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Redis health check failed: {str(e)}"
        )