from fastapi import APIRouter

from app.api.routes import attendance, auth, devices, employees, integration, push, stores

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(devices.router)
api_router.include_router(stores.router)
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(push.router)
api_router.include_router(integration.router)
