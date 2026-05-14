from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqladmin import Admin, BaseView, ModelView, expose
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
    InvoiceUploadLog,
    PhotoReport,
    PhotoReportItem,
    PhotoReportTemplate,
    PushSubscription,
    RocketRoute,
    Store,
    StoreRequestLog,
    User,
)
from app.models.enums import DeviceStatus, ShiftStatus, UserRole
from app.security import hash_password, verify_password

LOCAL_TZ = ZoneInfo("Europe/Uzhgorod")
ONLINE_DEVICE_WINDOW = timedelta(minutes=10)


def to_local(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo("UTC"))

    return value.astimezone(LOCAL_TZ)


def format_datetime(value: datetime | None) -> str:
    local_value = to_local(value)
    if local_value is None:
        return "-"

    return local_value.strftime("%d.%m.%Y %H:%M")


def format_duration(minutes: int) -> str:
    hours, remaining_minutes = divmod(max(minutes, 0), 60)
    return f"{hours} год {remaining_minutes:02d} хв"


def duration_minutes(start: datetime, end: datetime) -> int:
    start_local = to_local(start)
    end_local = to_local(end)
    if start_local is None or end_local is None:
        return 0

    return int((end_local - start_local).total_seconds() // 60)


def today_bounds() -> tuple[datetime, datetime]:
    now_local = datetime.now(LOCAL_TZ)
    start = datetime.combine(now_local.date(), time.min, tzinfo=LOCAL_TZ)
    return start, start + timedelta(days=1)


def enum_value(value) -> str:
    return getattr(value, "value", str(value))


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
        Device.store,
        Device.device_name,
        Device.login,
        Device.is_active,
        Device.last_seen_at,
        Device.disabled_at,
        Device.disabled_reason,
        Device.created_at,
        Device.updated_at,
    ]
    column_searchable_list = [Device.device_uuid, Device.device_name, Device.login]
    column_sortable_list = [Device.id, Device.login, Device.last_seen_at, Device.created_at]
    form_excluded_columns = [
        Device.token_hash,
        Device.shifts,
        Device.events,
        Device.push_subscriptions,
        Device.audit_logs,
        Device.created_at,
        Device.updated_at,
    ]

    async def on_model_change(self, data, model: Device, is_created: bool, request: Request) -> None:
        password_hash = data.get("password_hash")
        if password_hash and not str(password_hash).startswith("$2"):
            model.password_hash = hash_password(str(password_hash))


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


class RocketRouteAdmin(ModelView, model=RocketRoute):
    column_list = [
        RocketRoute.id,
        RocketRoute.route_key,
        RocketRoute.scope,
        RocketRoute.store_id,
        RocketRoute.room_name,
        RocketRoute.is_active,
        RocketRoute.created_at,
        RocketRoute.updated_at,
    ]
    column_searchable_list = [RocketRoute.route_key, RocketRoute.room_id, RocketRoute.room_name]
    column_sortable_list = [RocketRoute.id, RocketRoute.route_key, RocketRoute.created_at]
    form_excluded_columns = [RocketRoute.created_at, RocketRoute.updated_at]


class StoreRequestLogAdmin(ModelView, model=StoreRequestLog):
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        StoreRequestLog.id,
        StoreRequestLog.store_id,
        StoreRequestLog.device_id,
        StoreRequestLog.employee_id,
        StoreRequestLog.route_key,
        StoreRequestLog.request_type,
        StoreRequestLog.rocket_room_id,
        StoreRequestLog.rocket_message_id,
        StoreRequestLog.status,
        StoreRequestLog.error_text,
        StoreRequestLog.created_at,
        StoreRequestLog.sent_at,
    ]
    column_searchable_list = [
        StoreRequestLog.route_key,
        StoreRequestLog.request_type,
        StoreRequestLog.rocket_room_id,
        StoreRequestLog.rocket_message_id,
        StoreRequestLog.status,
    ]
    column_sortable_list = [StoreRequestLog.id, StoreRequestLog.created_at, StoreRequestLog.sent_at]


class InvoiceUploadLogAdmin(ModelView, model=InvoiceUploadLog):
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        InvoiceUploadLog.id,
        InvoiceUploadLog.store_id,
        InvoiceUploadLog.device_id,
        InvoiceUploadLog.employee_id,
        InvoiceUploadLog.request_type,
        InvoiceUploadLog.rocket_room_id,
        InvoiceUploadLog.rocket_file_id,
        InvoiceUploadLog.rocket_message_id,
        InvoiceUploadLog.status,
        InvoiceUploadLog.error_text,
        InvoiceUploadLog.created_at,
        InvoiceUploadLog.sent_at,
    ]
    column_searchable_list = [
        InvoiceUploadLog.request_type,
        InvoiceUploadLog.rocket_room_id,
        InvoiceUploadLog.rocket_file_id,
        InvoiceUploadLog.rocket_message_id,
        InvoiceUploadLog.status,
    ]
    column_sortable_list = [
        InvoiceUploadLog.id,
        InvoiceUploadLog.created_at,
        InvoiceUploadLog.sent_at,
    ]


class PhotoReportTemplateAdmin(ModelView, model=PhotoReportTemplate):
    column_list = [
        PhotoReportTemplate.id,
        PhotoReportTemplate.store_id,
        PhotoReportTemplate.title,
        PhotoReportTemplate.sort_order,
        PhotoReportTemplate.is_active,
    ]
    column_searchable_list = [PhotoReportTemplate.title]
    column_sortable_list = [PhotoReportTemplate.id, PhotoReportTemplate.store_id, PhotoReportTemplate.sort_order]
    form_excluded_columns = [PhotoReportTemplate.created_at, PhotoReportTemplate.updated_at]


class PhotoReportAdmin(ModelView, model=PhotoReport):
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        PhotoReport.id,
        PhotoReport.store_id,
        PhotoReport.device_id,
        PhotoReport.employee_id,
        PhotoReport.items_done,
        PhotoReport.items_total,
        PhotoReport.status,
        PhotoReport.created_at,
        PhotoReport.sent_at,
    ]
    column_sortable_list = [PhotoReport.id, PhotoReport.created_at, PhotoReport.sent_at]


class PhotoReportItemAdmin(ModelView, model=PhotoReportItem):
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        PhotoReportItem.id,
        PhotoReportItem.report_id,
        PhotoReportItem.template_id,
        PhotoReportItem.title,
        PhotoReportItem.rocket_room_id,
        PhotoReportItem.rocket_file_id,
        PhotoReportItem.rocket_message_id,
        PhotoReportItem.status,
        PhotoReportItem.error_text,
        PhotoReportItem.created_at,
        PhotoReportItem.sent_at,
    ]
    column_searchable_list = [PhotoReportItem.title, PhotoReportItem.status]
    column_sortable_list = [PhotoReportItem.id, PhotoReportItem.created_at, PhotoReportItem.sent_at]


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


class DashboardAdmin(BaseView):
    name = "Операційний дашборд"
    icon = "fa-solid fa-chart-line"

    @expose("/dashboard", methods=["GET"], identity="dashboard")
    async def dashboard(self, request: Request):
        now_local = datetime.now(LOCAL_TZ)
        today_start, today_end = today_bounds()
        online_since = now_local - ONLINE_DEVICE_WINDOW

        with SessionLocal() as db:
            open_shift_rows = db.execute(
                select(AttendanceShift, Employee, Store)
                .join(Employee, Employee.id == AttendanceShift.employee_id)
                .join(Store, Store.id == AttendanceShift.store_id)
                .where(AttendanceShift.status == ShiftStatus.open)
                .order_by(AttendanceShift.checkin_at.asc()),
            ).all()

            today_shift_rows = db.execute(
                select(AttendanceShift, Employee, Store)
                .join(Employee, Employee.id == AttendanceShift.employee_id)
                .join(Store, Store.id == AttendanceShift.store_id)
                .where(
                    AttendanceShift.checkin_at >= today_start,
                    AttendanceShift.checkin_at < today_end,
                )
                .order_by(AttendanceShift.checkin_at.asc()),
            ).all()

            device_rows = db.execute(
                select(Device, Store)
                .outerjoin(Store, Store.id == Device.store_id)
                .order_by(Device.id.asc()),
            ).all()

            stores = list(db.scalars(select(Store).order_by(Store.code.asc())))

        open_shift_count = len(open_shift_rows)
        employees_on_shift_count = len({shift.employee_id for shift, _, _ in open_shift_rows})
        stores_with_open_shifts_count = len({shift.store_id for shift, _, _ in open_shift_rows})

        devices = []
        online_device_count = 0
        for device, store in device_rows:
            last_seen_at = to_local(device.last_seen_at)
            is_online = (
                device.is_active
                and device.status == DeviceStatus.active
                and last_seen_at is not None
                and last_seen_at >= online_since
            )
            if is_online:
                online_device_count += 1

            devices.append(
                {
                    "id": device.id,
                    "name": device.device_name,
                    "store": store.name if store else "-",
                    "status": enum_value(device.status),
                    "last_seen_at": format_datetime(device.last_seen_at),
                    "is_online": is_online,
                    "uuid_tail": device.device_uuid[-6:] if device.device_uuid else "",
                },
            )

        open_shifts = [
            {
                "store": store.name,
                "employee": employee.full_name,
                "barcode": employee.barcode,
                "checkin_at": format_datetime(shift.checkin_at),
                "worked": format_duration(duration_minutes(shift.checkin_at, now_local)),
                "status": enum_value(shift.status),
            }
            for shift, employee, store in open_shift_rows
        ]

        today_shifts = [
            {
                "store": store.name,
                "employee": employee.full_name,
                "first_checkin": format_datetime(shift.checkin_at),
                "last_checkout": format_datetime(shift.checkout_at),
                "worked": format_duration(
                    duration_minutes(shift.checkin_at, shift.checkout_at or now_local),
                ),
                "status": enum_value(shift.status),
            }
            for shift, employee, store in today_shift_rows
        ]

        store_stats = []
        for store in stores:
            store_open_shifts = [
                shift for shift, _, _ in open_shift_rows if shift.store_id == store.id
            ]
            store_today_shifts = [
                shift for shift, _, _ in today_shift_rows if shift.store_id == store.id
            ]
            worked_minutes = sum(
                duration_minutes(shift.checkin_at, shift.checkout_at or now_local)
                for shift in store_today_shifts
            )

            store_stats.append(
                {
                    "store": store.name,
                    "code": store.code,
                    "current_on_shift": len({shift.employee_id for shift in store_open_shifts}),
                    "shifts_today": len(store_today_shifts),
                    "hours_today": format_duration(worked_minutes),
                },
            )

        context = {
            "title": "Операційний дашборд",
            "subtitle": "Поточна робота магазинів",
            "now_label": now_local.strftime("%d.%m.%Y %H:%M"),
            "timezone": str(LOCAL_TZ),
            "summary": {
                "open_shifts": open_shift_count,
                "employees_on_shift": employees_on_shift_count,
                "stores_with_open_shifts": stores_with_open_shifts_count,
                "devices_total": len(device_rows),
                "devices_online": online_device_count,
            },
            "open_shifts": open_shifts,
            "today_shifts": today_shifts,
            "devices": devices,
            "store_stats": store_stats,
        }
        return await self.templates.TemplateResponse(
            request,
            "admin/dashboard.html",
            context,
        )


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
    admin.add_view(RocketRouteAdmin)
    admin.add_view(StoreRequestLogAdmin)
    admin.add_view(InvoiceUploadLogAdmin)
    admin.add_view(PhotoReportTemplateAdmin)
    admin.add_view(PhotoReportAdmin)
    admin.add_view(PhotoReportItemAdmin)
    admin.add_view(AuditLogAdmin)
    admin.add_view(DashboardAdmin)
