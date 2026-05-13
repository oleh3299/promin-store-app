import json
import os
import secrets
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal  # noqa: E402
from app.models import Device, DeviceStatus, Store  # noqa: E402
from app.security import hash_password  # noqa: E402


DEFAULT_DEVICE_ACCOUNTS = [
    {"store_code": "000000022", "login": "m22", "device_name": "Телефон М22"},
    {"store_code": "000000052", "login": "m52", "device_name": "Телефон М52"},
    {"store_code": "000000033", "login": "m33", "device_name": "Телефон М33"},
    {"store_code": "000000018", "login": "m18", "device_name": "Телефон М18"},
    {"store_code": "000000058", "login": "m58", "device_name": "Телефон М58"},
    {"store_code": "000000028", "login": "m28", "device_name": "Телефон М28"},
    {"store_code": "000000048", "login": "m48", "device_name": "Телефон М48"},
    {"store_code": "000000038", "login": "m38", "device_name": "Телефон М38"},
    {"store_code": "000000060", "login": "m60", "device_name": "Телефон М60"},
    {"store_code": "000000026", "login": "m26", "device_name": "Телефон М26"},
    {"store_code": "000000061", "login": "m61", "device_name": "Телефон М61"},
]


def load_accounts() -> list[dict[str, str]]:
    raw_accounts = os.getenv("DEVICE_ACCOUNTS_JSON")
    if not raw_accounts:
        return DEFAULT_DEVICE_ACCOUNTS

    accounts = json.loads(raw_accounts)
    if not isinstance(accounts, list):
        raise ValueError("DEVICE_ACCOUNTS_JSON must be a JSON list")

    normalized = []
    for account in accounts:
        if not isinstance(account, dict):
            raise ValueError("Each device account must be an object")
        normalized.append(
            {
                "store_code": str(account["store_code"]),
                "login": str(account["login"]).strip().lower(),
                "device_name": str(account["device_name"]),
            },
        )
    return normalized


def get_password(login: str) -> tuple[str, bool]:
    password = os.getenv(f"DEVICE_PASSWORD_{login.upper()}", "").strip()
    if password:
        return password, False

    shared_password = os.getenv("DEVICE_TEMP_PASSWORD", "").strip()
    if shared_password:
        return shared_password, False

    return secrets.token_urlsafe(18), True


def main() -> None:
    load_dotenv()
    accounts = load_accounts()

    generated_passwords: list[tuple[str, str]] = []
    with SessionLocal() as db:
        for account in accounts:
            login = account["login"].strip().lower()
            store = db.scalar(select(Store).where(Store.code == account["store_code"]))
            if store is None:
                print(f"Skipped {login}: store {account['store_code']} not found")
                continue

            password, generated = get_password(login)
            device = db.scalar(select(Device).where(Device.login == login))
            if device is None:
                device = Device(
                    store_id=store.id,
                    login=login,
                    password_hash=hash_password(password),
                    device_uuid=f"store-device-{login}",
                    device_name=account["device_name"],
                    platform="pwa",
                    token_hash=None,
                    is_active=True,
                    status=DeviceStatus.active,
                )
                db.add(device)
                print(f"Created device account: {login} -> {store.code}")
            else:
                device.store_id = store.id
                device.device_name = account["device_name"]
                device.platform = device.platform or "pwa"
                device.is_active = True
                device.status = DeviceStatus.active
                if not device.password_hash or os.getenv("DEVICE_RESET_PASSWORDS", "").lower() in {"1", "true", "yes"}:
                    device.password_hash = hash_password(password)
                    print(f"Updated device account and password: {login} -> {store.code}")
                else:
                    print(f"Updated device account: {login} -> {store.code}")

            if generated:
                generated_passwords.append((login, password))

        db.commit()

    if generated_passwords:
        print("\nGenerated one-time temporary passwords:")
        for login, password in generated_passwords:
            print(f"{login}: {password}")
        print("\nStore these passwords securely. They are not saved in plaintext.")


if __name__ == "__main__":
    main()
