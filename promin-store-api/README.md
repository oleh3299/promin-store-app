# Promin Store API

Minimal FastAPI backend foundation for the Promin Store PWA.

## Stack

- Python 3.11+
- FastAPI + Uvicorn
- PostgreSQL
- SQLAlchemy 2.x
- Alembic
- Pydantic v2
- JWT auth
- passlib/bcrypt
- SQLAdmin
- python-dotenv

## Local Setup

```bash
cd promin-store-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Create a local PostgreSQL database:

```bash
createdb promin_store
```

Update `DATABASE_URL` in `.env`, then run migrations:

```bash
alembic upgrade head
```

Seed the first admin user and test store:

```bash
python scripts/seed.py
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Admin UI:

```text
http://127.0.0.1:8000/admin
```

Operational dashboard:

```text
http://127.0.0.1:8000/admin/dashboard
```

The dashboard is a lightweight SQLAdmin page for current store operations. It
shows open shifts, employees currently on shift, worked time for today's shifts,
device status, and per-store totals. Employee records are global; dashboard
store metrics come from `attendance_shifts.store_id`, `attendance_events.store_id`,
and `devices.store_id`.

Device online status currently uses `devices.last_seen_at` with a 10 minute
window. A future device heartbeat endpoint should refresh `last_seen_at` more
frequently than registration-only flows.

## Auth

JWT endpoints use:

```text
Authorization: Bearer <access_token>
```

PWA device endpoints use the persistent device token returned by
`/api/devices/login`. The legacy `/api/devices/register` endpoint remains as a
fallback for older clients:

```text
X-Device-Token: <device_token>
```

`Authorization: Bearer <device_token>` is also accepted for backward
compatibility. Only the hash of the device token is stored in the database.
Setting `devices.is_active=false` is the device kill switch and blocks existing
tokens immediately.

## Ubuntu Deployment Notes

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql nginx
sudo -u postgres createuser --pwprompt promin
sudo -u postgres createdb -O promin promin_store

cd /opt/promin-store-api
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env
alembic upgrade head
python scripts/seed.py
```

Production must run `alembic upgrade head` after deploying this branch. The
current migration head is `0003_device_accounts`, which adds persistent device
account fields. This migration was not executed locally because the local
PostgreSQL server was unavailable in the development environment.

Example systemd unit:

```ini
[Unit]
Description=Promin Store API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/promin-store-api
EnvironmentFile=/opt/promin-store-api/.env
ExecStart=/opt/promin-store-api/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now promin-store-api
```

Configure Nginx as a reverse proxy and terminate TLS in front of Uvicorn.
