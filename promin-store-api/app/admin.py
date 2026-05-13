from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request

from app.config import get_settings
from app.db import engine, SessionLocal
from app.models import (
    AttendanceEvent,
    AttendanceShift,
    AuditLog,
    Device,
    Employee,
    PushSubscription,
    Store,
    User,
)
from app.models.enums import UserRole
from app.security import verify_password


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = str(form.get("username") or "")
        password = str(form.get("password") or "")

        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
            if user is None or user.role != UserRole.admin:
                return False
            if not verify_password(password, user.password_hash):
                return False

        request.session.update({"admin_user": email})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin_user"))


class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.full_name, User.role, User.is_active, User.created_at]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.created_at]
    form_excluded_columns = [User.audit_logs, User.created_at, User.updated_at]


class StoreAdmin(ModelView, model=Store):
    column_list = [Store.id, Store.code, Store.name, Store.is_active, Store.created_at]
    column_searchable_list = [Store.code, Store.name]
    column_sortable_list = [Store.id, Store.code, Store.created_at]


class EmployeeAdmin(ModelView, model=Employee):
    column_list = [
        Employee.id,
        Employee.full_name,
        Employee.barcode,
        Employee.position,
        Employee.store_id,
        Employee.is_active,
    ]
    column_searchable_list = [Employee.full_name, Employee.barcode, Employee.external_1c_id]


class DeviceAdmin(ModelView, model=Device):
    column_list = [
        Device.id,
        Device.device_uuid,
        Device.device_name,
        Device.platform,
        Device.status,
        Device.store_id,
        Device.last_seen_at,
    ]
    column_searchable_list = [Device.device_uuid, Device.device_name]
    form_excluded_columns = [
        Device.shifts,
        Device.events,
        Device.push_subscriptions,
        Device.audit_logs,
        Device.created_at,
        Device.updated_at,
    ]


class AttendanceShiftAdmin(ModelView, model=AttendanceShift):
    column_list = [
        AttendanceShift.id,
        AttendanceShift.employee_id,
        AttendanceShift.store_id,
        AttendanceShift.status,
        AttendanceShift.checkin_at,
        AttendanceShift.checkout_at,
    ]
    column_sortable_list = [AttendanceShift.id, AttendanceShift.checkin_at]


class AttendanceEventAdmin(ModelView, model=AttendanceEvent):
    column_list = [
        AttendanceEvent.id,
        AttendanceEvent.employee_id,
        AttendanceEvent.store_id,
        AttendanceEvent.event_type,
        AttendanceEvent.source,
        AttendanceEvent.event_time,
    ]
    column_sortable_list = [AttendanceEvent.id, AttendanceEvent.event_time]


class PushSubscriptionAdmin(ModelView, model=PushSubscription):
    column_list = [
        PushSubscription.id,
        PushSubscription.device_id,
        PushSubscription.endpoint,
        PushSubscription.user_agent,
        PushSubscription.created_at,
    ]


class AuditLogAdmin(ModelView, model=AuditLog):
    column_list = [
        AuditLog.id,
        AuditLog.actor_user_id,
        AuditLog.actor_device_id,
        AuditLog.action,
        AuditLog.entity_type,
        AuditLog.entity_id,
        AuditLog.created_at,
    ]
    column_searchable_list = [AuditLog.action, AuditLog.entity_type, AuditLog.entity_id]


def setup_admin(app) -> None:
    settings = get_settings()
    admin = Admin(
        app,
        engine,
        title="Promin Store Admin",
        authentication_backend=AdminAuth(secret_key=settings.secret_key),
    )
    admin.add_view(UserAdmin)
    admin.add_view(StoreAdmin)
    admin.add_view(EmployeeAdmin)
    admin.add_view(DeviceAdmin)
    admin.add_view(AttendanceShiftAdmin)
    admin.add_view(AttendanceEventAdmin)
    admin.add_view(PushSubscriptionAdmin)
    admin.add_view(AuditLogAdmin)
