import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"


class DeviceStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    revoked = "revoked"


class ShiftStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class AttendanceEventType(str, enum.Enum):
    checkin = "checkin"
    checkout = "checkout"


class AttendanceEventSource(str, enum.Enum):
    pwa = "pwa"
    admin = "admin"
    import_ = "import"
