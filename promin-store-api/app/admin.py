from datetime import datetime, time, timedelta, timezone
from html import escape
from pathlib import Path
import re
from uuid import uuid4
from zoneinfo import ZoneInfo

from markupsafe import Markup
from sqladmin import Admin, BaseView, ModelView, expose
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse

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
    Planogram,
    PlanogramZone,
    PushSubscription,
    RocketRoute,
    Store,
    StoreDepartment,
    StoreRequestLog,
    StoreTask,
    StoreTaskAttachment,
    StoreTaskEvent,
    TaskTemplate,
    User,
)
from app.models.enums import DeviceStatus, ShiftStatus, UserRole
from app.security import hash_password, verify_password

LOCAL_TZ = ZoneInfo("Europe/Uzhgorod")
ONLINE_DEVICE_WINDOW = timedelta(minutes=10)
PLANOGRAM_STORAGE_ROOT = Path("storage") / "planograms"
PLANOGRAM_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


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


def safe_path_segment(value: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_-]+", "_", value.strip())
    return sanitized.strip("_") or "item"


def planogram_image_src(image_path: str) -> str:
    if image_path.startswith(("http://", "https://", "/")):
        return image_path
    normalized_path = image_path.replace("\\", "/")
    return f"/{normalized_path}"


def planogram_preview(model, _attribute) -> Markup:
    return Markup(
        '<img src="{}" alt="{}" style="max-width: 120px; max-height: 80px; object-fit: contain;" />'.format(
            escape(planogram_image_src(model.image_path)),
            escape(model.category_name),
        ),
    )


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
    name = "Пользователь"
    name_plural = "Пользователи"
    category = "Система"
    column_list = [User.id, User.email, User.full_name, User.role, User.is_active, User.created_at]
    column_searchable_list = [User.email, User.full_name]
    column_sortable_list = [User.id, User.email, User.created_at]
    column_labels = {
        User.email: "Email",
        User.full_name: "ФИО",
        User.role: "Роль",
        User.is_active: "Активен",
        User.created_at: "Создано",
    }
    form_excluded_columns = [User.audit_logs, User.created_at, User.updated_at]


class StoreAdmin(ModelView, model=Store):
    name = "Магазин"
    name_plural = "Магазины"
    category = "Основное"
    column_list = [Store.code, Store.name, Store.address, Store.is_active]
    column_searchable_list = [Store.code, Store.name]
    column_sortable_list = [Store.id, Store.code, Store.created_at]
    column_labels = {
        Store.code: "Код",
        Store.name: "Магазин",
        Store.address: "Адрес",
        Store.is_active: "Активен",
        Store.created_at: "Создано",
    }


class EmployeeAdmin(ModelView, model=Employee):
    name = "Сотрудник"
    name_plural = "Сотрудники"
    category = "Основное"
    column_list = [
        Employee.full_name,
        Employee.barcode,
        Employee.position,
        Employee.store,
        Employee.is_active,
    ]
    column_searchable_list = [Employee.full_name, Employee.barcode, Employee.external_1c_id]
    column_labels = {
        Employee.full_name: "ФИО",
        Employee.barcode: "Штрихкод",
        Employee.position: "Должность",
        Employee.store: "Магазин",
        Employee.is_active: "Активен",
    }


class DeviceAdmin(ModelView, model=Device):
    name = "Устройство"
    name_plural = "Устройства"
    category = "Основное"
    column_list = [
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
    column_labels = {
        Device.store: "Магазин",
        Device.device_name: "Название",
        Device.login: "Логин устройства",
        Device.is_active: "Активно",
        Device.last_seen_at: "Последняя активность",
        Device.disabled_at: "Отключено",
        Device.disabled_reason: "Причина отключения",
        Device.created_at: "Создано",
        Device.updated_at: "Обновлено",
    }
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
    name = "Смена"
    name_plural = "Смены"
    category = "Табель"
    column_list = [
        AttendanceShift.id,
        AttendanceShift.employee_id,
        AttendanceShift.store_id,
        AttendanceShift.status,
        AttendanceShift.checkin_at,
        AttendanceShift.checkout_at,
    ]
    column_sortable_list = [AttendanceShift.id, AttendanceShift.checkin_at]
    column_labels = {
        AttendanceShift.employee_id: "Сотрудник",
        AttendanceShift.store_id: "Магазин",
        AttendanceShift.status: "Статус",
        AttendanceShift.checkin_at: "Приход",
        AttendanceShift.checkout_at: "Уход",
    }


class AttendanceEventAdmin(ModelView, model=AttendanceEvent):
    name = "Событие табеля"
    name_plural = "События табеля"
    category = "Табель"
    column_list = [
        AttendanceEvent.id,
        AttendanceEvent.employee_id,
        AttendanceEvent.store_id,
        AttendanceEvent.event_type,
        AttendanceEvent.source,
        AttendanceEvent.event_time,
    ]
    column_sortable_list = [AttendanceEvent.id, AttendanceEvent.event_time]
    column_labels = {
        AttendanceEvent.employee_id: "Сотрудник",
        AttendanceEvent.store_id: "Магазин",
        AttendanceEvent.event_type: "Тип события",
        AttendanceEvent.source: "Источник",
        AttendanceEvent.event_time: "Время",
    }


class PushSubscriptionAdmin(ModelView, model=PushSubscription):
    name = "Push-подписка"
    name_plural = "Push-подписки"
    category = "Система"
    column_list = [
        PushSubscription.id,
        PushSubscription.device_id,
        PushSubscription.endpoint,
        PushSubscription.user_agent,
        PushSubscription.created_at,
    ]


class RocketRouteAdmin(ModelView, model=RocketRoute):
    name = "Маршрут Rocket.Chat"
    name_plural = "Маршруты Rocket.Chat"
    category = "Заявки и документы"
    column_list = [
        RocketRoute.route_key,
        RocketRoute.scope,
        RocketRoute.store,
        RocketRoute.room_name,
        RocketRoute.is_active,
        RocketRoute.created_at,
        RocketRoute.updated_at,
    ]
    column_searchable_list = [RocketRoute.route_key, RocketRoute.room_id, RocketRoute.room_name]
    column_sortable_list = [RocketRoute.id, RocketRoute.route_key, RocketRoute.created_at]
    column_labels = {
        RocketRoute.route_key: "Ключ маршрута",
        RocketRoute.scope: "Область",
        RocketRoute.store: "Магазин",
        RocketRoute.room_name: "Канал",
        RocketRoute.is_active: "Активен",
        RocketRoute.created_at: "Создано",
        RocketRoute.updated_at: "Обновлено",
    }
    form_excluded_columns = [RocketRoute.created_at, RocketRoute.updated_at]


class StoreRequestLogAdmin(ModelView, model=StoreRequestLog):
    name = "Лог заявки"
    name_plural = "Логи заявок"
    category = "Система"
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
    name = "Накладная"
    name_plural = "Накладные"
    category = "Заявки и документы"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        InvoiceUploadLog.id,
        InvoiceUploadLog.store,
        InvoiceUploadLog.device_id,
        InvoiceUploadLog.employee,
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
    column_labels = {
        InvoiceUploadLog.store: "Магазин",
        InvoiceUploadLog.employee: "Сотрудник",
        InvoiceUploadLog.request_type: "Тип документа",
        InvoiceUploadLog.status: "Статус",
        InvoiceUploadLog.created_at: "Создано",
        InvoiceUploadLog.sent_at: "Отправлено",
    }


class PhotoReportTemplateAdmin(ModelView, model=PhotoReportTemplate):
    name = "Шаблон фотоотчета"
    name_plural = "Шаблоны фотоотчетов"
    category = "Фотоотчеты"
    can_delete = False
    page_size = 50
    column_list = [
        PhotoReportTemplate.store,
        PhotoReportTemplate.sort_order,
        PhotoReportTemplate.item_key,
        PhotoReportTemplate.item_name,
        PhotoReportTemplate.description,
        PhotoReportTemplate.is_required,
        PhotoReportTemplate.is_active,
    ]
    column_searchable_list = [PhotoReportTemplate.item_name, PhotoReportTemplate.item_key]
    column_sortable_list = [
        PhotoReportTemplate.id,
        PhotoReportTemplate.store_id,
        PhotoReportTemplate.sort_order,
        PhotoReportTemplate.is_active,
        PhotoReportTemplate.item_key,
        PhotoReportTemplate.item_name,
    ]
    column_default_sort = [
        (PhotoReportTemplate.store_id, False),
        (PhotoReportTemplate.is_active, True),
        (PhotoReportTemplate.sort_order, False),
        (PhotoReportTemplate.id, False),
    ]
    column_filters = [PhotoReportTemplate.store, PhotoReportTemplate.is_active, PhotoReportTemplate.is_required]
    column_labels = {
        PhotoReportTemplate.store: "Магазин",
        PhotoReportTemplate.item_key: "Ключ",
        PhotoReportTemplate.item_name: "Зона",
        PhotoReportTemplate.description: "Описание",
        PhotoReportTemplate.sort_order: "Порядок",
        PhotoReportTemplate.is_required: "Обязательно",
        PhotoReportTemplate.is_active: "Активно",
    }
    form_columns = [
        PhotoReportTemplate.store,
        PhotoReportTemplate.item_key,
        PhotoReportTemplate.item_name,
        PhotoReportTemplate.description,
        PhotoReportTemplate.sort_order,
        PhotoReportTemplate.is_required,
        PhotoReportTemplate.is_active,
    ]
    form_ajax_refs = {
        "store": {
            "fields": ("code", "name"),
            "order_by": ("code",),
        },
    }


class PhotoReportAdmin(ModelView, model=PhotoReport):
    name = "Фотоотчет"
    name_plural = "Фотоотчеты"
    category = "Фотоотчеты"
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
    column_labels = {
        PhotoReport.store_id: "Магазин",
        PhotoReport.device_id: "Устройство",
        PhotoReport.employee_id: "Сотрудник",
        PhotoReport.items_done: "Выполнено",
        PhotoReport.items_total: "Всего",
        PhotoReport.status: "Статус",
        PhotoReport.created_at: "Создано",
        PhotoReport.sent_at: "Отправлено",
    }


class PhotoReportItemAdmin(ModelView, model=PhotoReportItem):
    name = "Фото фотоотчета"
    name_plural = "Фото фотоотчетов"
    category = "Фотоотчеты"
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
    column_labels = {
        PhotoReportItem.report_id: "Фотоотчет",
        PhotoReportItem.template_id: "Пункт",
        PhotoReportItem.title: "Зона",
        PhotoReportItem.status: "Статус",
        PhotoReportItem.error_text: "Ошибка",
        PhotoReportItem.created_at: "Создано",
        PhotoReportItem.sent_at: "Отправлено",
    }


class PlanogramAdmin(ModelView, model=Planogram):
    name = "Планограмма"
    name_plural = "Планограммы"
    category = "Планограммы"
    can_create = False
    can_delete = False
    column_list = [
        Planogram.store,
        Planogram.category_name,
        Planogram.description,
        Planogram.image_path,
        Planogram.uploaded_by,
        Planogram.uploaded_at,
        Planogram.is_active,
    ]
    column_formatters = {Planogram.image_path: planogram_preview}
    column_searchable_list = [Planogram.category_name, Planogram.description, Planogram.uploaded_by]
    column_sortable_list = [Planogram.id, Planogram.store_id, Planogram.category_name, Planogram.uploaded_at]
    column_default_sort = [(Planogram.store_id, False), (Planogram.category_name, False)]
    column_filters = [Planogram.store, Planogram.is_active, Planogram.category_name]
    column_labels = {
        Planogram.store: "Магазин",
        Planogram.category_name: "Категория",
        Planogram.description: "Описание",
        Planogram.image_path: "Preview",
        Planogram.uploaded_by: "Кто загрузил",
        Planogram.uploaded_at: "Обновлено",
        Planogram.is_active: "Активно",
    }
    form_columns = [
        Planogram.store,
        Planogram.category_name,
        Planogram.description,
        Planogram.image_path,
        Planogram.uploaded_by,
        Planogram.uploaded_at,
        Planogram.is_active,
    ]
    form_ajax_refs = {
        "store": {
            "fields": ("code", "name"),
            "order_by": ("code",),
        },
    }


class PlanogramUploadAdmin(BaseView):
    name = "Загрузить планограмму"
    category = "Планограммы"
    icon = "fa-solid fa-upload"

    @expose("/planograms/upload", methods=["GET", "POST"], identity="planograms-upload")
    async def upload(self, request: Request):
        message = ""
        store_options: list[dict[str, str | int]] = []
        with SessionLocal() as db:
            stores = list(db.scalars(select(Store).where(Store.is_active.is_(True)).order_by(Store.code.asc())))
            store_options = [
                {
                    "id": store.id,
                    "label": f"{store.code} — {store.name}",
                }
                for store in stores
            ]

            if request.method == "POST":
                form = await request.form()
                store_id = int(str(form.get("store_id") or "0"))
                store = db.get(Store, store_id)
                category_name = str(form.get("category_name") or "").strip()
                description = str(form.get("description") or "").strip() or None
                uploaded_file = form.get("image")

                if store is None:
                    message = "Выберите магазин."
                elif not category_name:
                    message = "Укажите категорию."
                elif not hasattr(uploaded_file, "read") or not getattr(uploaded_file, "filename", ""):
                    message = "Выберите изображение."
                elif getattr(uploaded_file, "content_type", "") not in PLANOGRAM_CONTENT_TYPES:
                    message = "Поддерживаются только JPEG, PNG или WEBP."
                else:
                    content_type = str(uploaded_file.content_type)
                    extension = PLANOGRAM_CONTENT_TYPES[content_type]
                    store_dir = PLANOGRAM_STORAGE_ROOT / safe_path_segment(store.code)
                    store_dir.mkdir(parents=True, exist_ok=True)
                    filename = f"{safe_path_segment(category_name)}-{uuid4().hex[:12]}.{extension}"
                    file_path = store_dir / filename
                    file_bytes = await uploaded_file.read()
                    file_path.write_bytes(file_bytes)
                    relative_path = file_path.as_posix()
                    uploaded_by = str(request.session.get("admin_user") or "") or None
                    existing_planograms = db.scalars(
                        select(Planogram).where(
                            Planogram.store_id == store.id,
                            Planogram.category_name == category_name,
                            Planogram.is_active.is_(True),
                        ),
                    )
                    for existing_planogram in existing_planograms:
                        existing_planogram.is_active = False

                    db.add(
                        Planogram(
                            store_id=store.id,
                            category_name=category_name,
                            description=description,
                            image_path=relative_path,
                            uploaded_by=uploaded_by,
                            uploaded_at=datetime.now(timezone.utc),
                            is_active=True,
                        ),
                    )
                    db.commit()
                    return RedirectResponse("/admin/planogram/list", status_code=303)

        options = "\n".join(
            f'<option value="{store["id"]}">{escape(str(store["label"]))}</option>'
            for store in store_options
        )
        html = f"""
        <section style="max-width: 720px; margin: 32px auto; font-family: system-ui, sans-serif;">
          <h1>Загрузить планограмму</h1>
          <p>Загрузите актуальное изображение планограммы для магазина и категории.</p>
          {"<p><strong>" + escape(message) + "</strong></p>" if message else ""}
          <form method="post" enctype="multipart/form-data" style="display: grid; gap: 14px;">
            <label>Магазин<select name="store_id" required style="width:100%;padding:10px;">{options}</select></label>
            <label>Категория<input name="category_name" required placeholder="Алкоголь" style="width:100%;padding:10px;" /></label>
            <label>Описание<textarea name="description" rows="3" style="width:100%;padding:10px;"></textarea></label>
            <label>Изображение<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <button type="submit" style="padding:12px 16px;">Загрузить</button>
          </form>
          <p><a href="/admin/planogram/list">Открыть список планограмм</a></p>
        </section>
        """
        return HTMLResponse(html)


class PlanogramZoneAdmin(ModelView, model=PlanogramZone):
    name = "Зона планограммы"
    name_plural = "Зоны / оборудование"
    category = "Планограммы"
    can_delete = False
    column_list = [
        PlanogramZone.store,
        PlanogramZone.zone_key,
        PlanogramZone.zone_name,
        PlanogramZone.description,
        PlanogramZone.is_active,
    ]
    column_searchable_list = [PlanogramZone.zone_key, PlanogramZone.zone_name]
    column_sortable_list = [PlanogramZone.id, PlanogramZone.store_id, PlanogramZone.zone_key, PlanogramZone.zone_name]
    column_default_sort = [(PlanogramZone.store_id, False), (PlanogramZone.zone_key, False)]
    column_filters = [PlanogramZone.store, PlanogramZone.is_active]
    column_labels = {
        PlanogramZone.store: "Магазин",
        PlanogramZone.zone_key: "Ключ зоны",
        PlanogramZone.zone_name: "Зона / оборудование",
        PlanogramZone.description: "Описание",
        PlanogramZone.is_active: "Активно",
    }
    form_columns = [
        PlanogramZone.store,
        PlanogramZone.zone_key,
        PlanogramZone.zone_name,
        PlanogramZone.description,
        PlanogramZone.is_active,
    ]
    form_ajax_refs = {
        "store": {
            "fields": ("code", "name"),
            "order_by": ("code",),
        },
    }


class StoreDepartmentAdmin(ModelView, model=StoreDepartment):
    name = "Отдел магазина"
    name_plural = "Отделы магазина"
    category = "Задания магазинов"
    can_delete = False
    column_list = [
        StoreDepartment.store,
        StoreDepartment.sort_order,
        StoreDepartment.name,
        StoreDepartment.description,
        StoreDepartment.is_active,
    ]
    column_searchable_list = [StoreDepartment.name, StoreDepartment.description]
    column_sortable_list = [StoreDepartment.store_id, StoreDepartment.sort_order, StoreDepartment.name]
    column_default_sort = [(StoreDepartment.store_id, False), (StoreDepartment.sort_order, False)]
    column_filters = [StoreDepartment.store, StoreDepartment.is_active]
    column_labels = {
        StoreDepartment.store: "Магазин",
        StoreDepartment.name: "Отдел / зона",
        StoreDepartment.description: "Описание",
        StoreDepartment.sort_order: "Порядок",
        StoreDepartment.is_active: "Активен",
    }
    form_columns = [
        StoreDepartment.store,
        StoreDepartment.name,
        StoreDepartment.description,
        StoreDepartment.sort_order,
        StoreDepartment.is_active,
    ]
    form_ajax_refs = {
        "store": {
            "fields": [Store.code, Store.name],
            "order_by": [Store.code],
            "limit": 25,
        },
    }


class TaskTemplateAdmin(ModelView, model=TaskTemplate):
    name = "Шаблон задания"
    name_plural = "Шаблоны заданий"
    category = "Задания магазинов"
    can_delete = False
    column_list = [
        TaskTemplate.title,
        TaskTemplate.task_type,
        TaskTemplate.requires_photo,
        TaskTemplate.requires_comment,
        TaskTemplate.requires_verification,
        TaskTemplate.priority,
        TaskTemplate.is_active,
    ]
    column_searchable_list = [TaskTemplate.template_key, TaskTemplate.title, TaskTemplate.description]
    column_sortable_list = [TaskTemplate.id, TaskTemplate.title, TaskTemplate.task_type, TaskTemplate.priority]
    column_filters = [TaskTemplate.task_type, TaskTemplate.priority, TaskTemplate.is_active]
    column_labels = {
        TaskTemplate.template_key: "Ключ",
        TaskTemplate.title: "Название",
        TaskTemplate.description: "Описание",
        TaskTemplate.task_type: "Тип",
        TaskTemplate.requires_photo: "Нужно фото",
        TaskTemplate.requires_comment: "Нужен комментарий",
        TaskTemplate.requires_verification: "Нужна проверка",
        TaskTemplate.priority: "Приоритет",
        TaskTemplate.is_active: "Активен",
    }


class StoreTaskAdmin(ModelView, model=StoreTask):
    name = "Задание магазина"
    name_plural = "Задания магазинов"
    category = "Задания магазинов"
    can_delete = False
    page_size = 50
    column_list = [
        StoreTask.store,
        StoreTask.department,
        StoreTask.title,
        StoreTask.source,
        StoreTask.status,
        StoreTask.priority,
        StoreTask.due_date,
        StoreTask.due_time,
        StoreTask.completed_by_employee,
        StoreTask.completed_at,
        StoreTask.verified_at,
    ]
    column_searchable_list = [StoreTask.title, StoreTask.description, StoreTask.related_entity_type]
    column_sortable_list = [
        StoreTask.id,
        StoreTask.store_id,
        StoreTask.status,
        StoreTask.priority,
        StoreTask.due_date,
        StoreTask.completed_at,
        StoreTask.verified_at,
    ]
    column_default_sort = [(StoreTask.due_date, False), (StoreTask.id, True)]
    column_filters = [
        StoreTask.store,
        StoreTask.department,
        StoreTask.status,
        StoreTask.priority,
        StoreTask.source,
        StoreTask.due_date,
    ]
    column_labels = {
        StoreTask.store: "Магазин",
        StoreTask.department: "Отдел",
        StoreTask.template: "Шаблон",
        StoreTask.source: "Источник",
        StoreTask.title: "Задание",
        StoreTask.description: "Описание",
        StoreTask.status: "Статус",
        StoreTask.priority: "Приоритет",
        StoreTask.due_date: "Срок",
        StoreTask.due_time: "Время",
        StoreTask.requires_photo: "Нужно фото",
        StoreTask.requires_comment: "Нужен комментарий",
        StoreTask.requires_verification: "Нужна проверка",
        StoreTask.assigned_employee: "Назначено",
        StoreTask.completed_by_employee: "Выполнил",
        StoreTask.completed_at: "Выполнено",
        StoreTask.verifier: "Проверил",
        StoreTask.verified_at: "Проверено",
        StoreTask.related_entity_type: "Связанная сущность",
        StoreTask.related_entity_id: "ID сущности",
    }
    form_columns = [
        StoreTask.store,
        StoreTask.department,
        StoreTask.template,
        StoreTask.source,
        StoreTask.title,
        StoreTask.description,
        StoreTask.status,
        StoreTask.priority,
        StoreTask.due_date,
        StoreTask.due_time,
        StoreTask.requires_photo,
        StoreTask.requires_comment,
        StoreTask.requires_verification,
        StoreTask.assigned_employee,
        StoreTask.related_entity_type,
        StoreTask.related_entity_id,
    ]
    form_ajax_refs = {
        "store": {
            "fields": [Store.code, Store.name],
            "order_by": [Store.code],
            "limit": 25,
        },
        "department": {
            "fields": [StoreDepartment.name],
            "order_by": [StoreDepartment.store_id, StoreDepartment.sort_order, StoreDepartment.name],
            "limit": 25,
        },
        "template": {
            "fields": [TaskTemplate.title, TaskTemplate.template_key],
            "order_by": [TaskTemplate.title],
            "limit": 25,
        },
        "assigned_employee": {
            "fields": [Employee.full_name, Employee.barcode],
            "order_by": [Employee.full_name],
            "limit": 25,
        },
        "completed_by_employee": {
            "fields": [Employee.full_name, Employee.barcode],
            "order_by": [Employee.full_name],
            "limit": 25,
        },
    }


class StoreTaskAttachmentAdmin(ModelView, model=StoreTaskAttachment):
    name = "Фото задания"
    name_plural = "Фото заданий"
    category = "Технические логи"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        StoreTaskAttachment.id,
        StoreTaskAttachment.task_id,
        StoreTaskAttachment.attachment_type,
        StoreTaskAttachment.file_path,
        StoreTaskAttachment.rocket_file_id,
        StoreTaskAttachment.created_at,
    ]
    column_searchable_list = [StoreTaskAttachment.file_path, StoreTaskAttachment.rocket_file_id]
    column_sortable_list = [StoreTaskAttachment.id, StoreTaskAttachment.task_id, StoreTaskAttachment.created_at]
    column_labels = {
        StoreTaskAttachment.task_id: "Задание",
        StoreTaskAttachment.attachment_type: "Тип",
        StoreTaskAttachment.file_path: "Файл",
        StoreTaskAttachment.rocket_file_id: "Rocket file",
        StoreTaskAttachment.created_at: "Создано",
    }


class StoreTaskEventAdmin(ModelView, model=StoreTaskEvent):
    name = "История задания"
    name_plural = "История заданий"
    category = "Технические логи"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [
        StoreTaskEvent.id,
        StoreTaskEvent.task_id,
        StoreTaskEvent.event_type,
        StoreTaskEvent.author_type,
        StoreTaskEvent.author_id,
        StoreTaskEvent.comment,
        StoreTaskEvent.created_at,
    ]
    column_searchable_list = [StoreTaskEvent.event_type, StoreTaskEvent.author_type, StoreTaskEvent.comment]
    column_sortable_list = [StoreTaskEvent.id, StoreTaskEvent.task_id, StoreTaskEvent.created_at]
    column_labels = {
        StoreTaskEvent.task_id: "Задание",
        StoreTaskEvent.event_type: "Событие",
        StoreTaskEvent.author_type: "Автор",
        StoreTaskEvent.author_id: "ID автора",
        StoreTaskEvent.comment: "Комментарий",
        StoreTaskEvent.created_at: "Создано",
    }


class AuditLogAdmin(ModelView, model=AuditLog):
    name = "Лог аудита"
    name_plural = "Логи аудита"
    category = "Система"
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
    name = "Операционный дашборд"
    category = "Основное"
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
            "title": "Операционный дашборд",
            "subtitle": "Текущая работа магазинов",
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
    admin.add_view(DashboardAdmin)
    admin.add_view(StoreAdmin)
    admin.add_view(EmployeeAdmin)
    admin.add_view(DeviceAdmin)
    admin.add_view(AttendanceShiftAdmin)
    admin.add_view(AttendanceEventAdmin)
    admin.add_view(InvoiceUploadLogAdmin)
    admin.add_view(RocketRouteAdmin)
    admin.add_view(PlanogramUploadAdmin)
    admin.add_view(PlanogramAdmin)
    admin.add_view(PhotoReportAdmin)
    admin.add_view(PhotoReportTemplateAdmin)
    admin.add_view(PhotoReportItemAdmin)
    admin.add_view(PlanogramZoneAdmin)
    admin.add_view(StoreDepartmentAdmin)
    admin.add_view(TaskTemplateAdmin)
    admin.add_view(StoreTaskAdmin)
    admin.add_view(UserAdmin)
    admin.add_view(PushSubscriptionAdmin)
    admin.add_view(StoreTaskAttachmentAdmin)
    admin.add_view(StoreTaskEventAdmin)
    admin.add_view(StoreRequestLogAdmin)
    admin.add_view(AuditLogAdmin)
