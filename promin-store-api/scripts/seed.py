import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db import SessionLocal  # noqa: E402
from app.models import Store, User, UserRole  # noqa: E402
from app.security import hash_password  # noqa: E402


def main() -> None:
    load_dotenv()

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@promin.local")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "ChangeMe123!")
    admin_full_name = os.getenv("SEED_ADMIN_FULL_NAME", "Promin Admin")
    store_code = os.getenv("SEED_STORE_CODE", "M37")
    store_name = os.getenv("SEED_STORE_NAME", "Promin Store M37")
    store_address = os.getenv("SEED_STORE_ADDRESS") or None

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == admin_email))
        if user is None:
            user = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                full_name=admin_full_name,
                role=UserRole.admin,
                is_active=True,
            )
            db.add(user)
            print(f"Created admin user: {admin_email}")
        else:
            print(f"Admin user already exists: {admin_email}")

        store = db.scalar(select(Store).where(Store.code == store_code))
        if store is None:
            store = Store(
                code=store_code,
                name=store_name,
                address=store_address,
                is_active=True,
            )
            db.add(store)
            print(f"Created store: {store_code}")
        else:
            print(f"Store already exists: {store_code}")

        db.commit()


if __name__ == "__main__":
    main()
