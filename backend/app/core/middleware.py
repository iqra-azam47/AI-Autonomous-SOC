import time
import uuid
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("soc.api")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        
        # Safe structured logging - never logs body, secrets, auth headers
        logger.info(
            f"request_id={request_id} method={request.method} path={request.url.path} "
            f"status={response.status_code} duration_ms={duration}"
        )
        return response

class InMemoryRateLimiter(BaseHTTPMiddleware):
    """
    Sliding window rate limiter protecting sensitive API routes.
    """
    def __init__(self, app, limits=None):
        super().__init__(app)
        # Endpoint prefix -> max requests per 60 seconds
        self.limits = limits or {
            "/api/auth/login": 10,
            "/api/ai/investigate": 20,
            "/api/ai/chat": 30,
            "/api/simulations/run": 15,
            "/api/ingestion/upload": 30,
        }
        self.request_history = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path
        
        limit = None
        for prefix, max_reqs in self.limits.items():
            if path.startswith(prefix):
                limit = max_reqs
                break
                
        if limit:
            now = time.time()
            window_start = now - 60
            key = f"{client_ip}:{path}"
            
            # Filter timestamps in current window
            self.request_history[key] = [ts for ts in self.request_history[key] if ts > window_start]
            
            if len(self.request_history[key]) >= limit:
                logger.warning(f"Rate limit exceeded for IP {client_ip} on path {path}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Too many requests. Please slow down and try again shortly."
                        }
                    },
                    headers={"Retry-After": "60"}
                )
            self.request_history[key].append(now)

        return await call_next(request)
