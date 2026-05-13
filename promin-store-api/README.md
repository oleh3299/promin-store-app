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

## Auth

JWT endpoints use:

```text
Authorization: Bearer <access_token>
```

PWA device endpoints use the device token returned by `/api/devices/register`:

```text
Authorization: Bearer <device_token>
```

Only the hash of the device token is stored in the database.

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
