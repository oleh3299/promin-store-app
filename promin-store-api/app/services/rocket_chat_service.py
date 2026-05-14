import json
import logging
from dataclasses import dataclass
from urllib.parse import urlencode
from urllib import error, request

import requests

from app.config import get_settings


logger = logging.getLogger(__name__)


class RocketChatError(Exception):
    pass


@dataclass
class RocketChatSendResult:
    message_id: str | None


@dataclass
class RocketChatUploadResult:
    file_id: str | None
    message_id: str | None


class RocketChatService:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.rocket_chat_base_url.rstrip("/")
        self.user_id = settings.rocket_chat_user_id
        self.auth_token = settings.rocket_chat_auth_token
        self.timeout = settings.rocket_chat_timeout_seconds

    def _extract_error_message(self, response_body: str, fallback: str) -> str:
        try:
            data = json.loads(response_body)
        except json.JSONDecodeError:
            return response_body[:500] or fallback

        if isinstance(data, dict):
            error_message = data.get("error") or data.get("message") or data.get("errorType")
            if error_message:
                return str(error_message)

        return fallback

    def send_message(self, room_id: str, text: str) -> RocketChatSendResult:
        if not self.user_id or not self.auth_token:
            raise RocketChatError("Rocket.Chat credentials are not configured")

        payload = json.dumps({"roomId": room_id, "text": text}).encode("utf-8")
        post_request = request.Request(
            f"{self.base_url}/api/v1/chat.postMessage",
            data=payload,
            headers={
                "X-Auth-Token": self.auth_token,
                "X-User-Id": self.user_id,
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with request.urlopen(post_request, timeout=self.timeout) as response:
                response_body = response.read().decode("utf-8")
        except error.HTTPError as exc:
            raise RocketChatError(f"Rocket.Chat HTTP {exc.code}") from exc
        except error.URLError as exc:
            raise RocketChatError(f"Rocket.Chat request failed: {exc.reason}") from exc
        except TimeoutError as exc:
            raise RocketChatError("Rocket.Chat request timed out") from exc

        try:
            data = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise RocketChatError("Rocket.Chat returned invalid JSON") from exc

        if not data.get("success"):
            error_message = data.get("error") or data.get("message") or "Rocket.Chat send failed"
            raise RocketChatError(str(error_message))

        message = data.get("message")
        message_id = message.get("_id") if isinstance(message, dict) else None
        return RocketChatSendResult(message_id=message_id)

    def get_room_id_by_name(self, room_name: str) -> str:
        if not self.user_id or not self.auth_token:
            raise RocketChatError("Rocket.Chat credentials are not configured")

        info_request = request.Request(
            f"{self.base_url}/api/v1/rooms.info?{urlencode({'roomName': room_name})}",
            headers={
                "X-Auth-Token": self.auth_token,
                "X-User-Id": self.user_id,
            },
            method="GET",
        )

        try:
            with request.urlopen(info_request, timeout=self.timeout) as response:
                response_body = response.read().decode("utf-8")
        except error.HTTPError as exc:
            raise RocketChatError(f"Rocket.Chat HTTP {exc.code}") from exc
        except error.URLError as exc:
            raise RocketChatError(f"Rocket.Chat room lookup failed: {exc.reason}") from exc
        except TimeoutError as exc:
            raise RocketChatError("Rocket.Chat room lookup timed out") from exc

        try:
            data = json.loads(response_body)
        except json.JSONDecodeError as exc:
            raise RocketChatError("Rocket.Chat returned invalid JSON") from exc

        if not data.get("success"):
            error_message = data.get("error") or data.get("message") or "Rocket.Chat room lookup failed"
            raise RocketChatError(str(error_message))

        room = data.get("room")
        room_id = room.get("_id") if isinstance(room, dict) else None
        if not room_id:
            raise RocketChatError("Rocket.Chat room id missing")
        return str(room_id)

    def upload_file(
        self,
        room_id: str,
        filename: str,
        content_type: str,
        file_bytes: bytes,
        message: str,
        description: str,
    ) -> RocketChatUploadResult:
        if not self.user_id or not self.auth_token:
            raise RocketChatError("Rocket.Chat credentials are not configured")

        endpoint = f"{self.base_url}/api/v1/rooms.upload/{room_id}"
        try:
            response = requests.post(
                endpoint,
                headers={
                    "X-Auth-Token": self.auth_token,
                    "X-User-Id": self.user_id,
                },
                data={
                    "msg": message,
                    "description": description,
                },
                files={
                    "file": (filename, file_bytes, content_type),
                },
                timeout=self.timeout,
            )
        except requests.Timeout as exc:
            raise RocketChatError("Rocket.Chat upload timed out") from exc
        except requests.RequestException as exc:
            raise RocketChatError(f"Rocket.Chat upload failed: {exc}") from exc

        response_body = response.text
        logger.info(
            "rocket_chat_upload_response",
            extra={
                "endpoint": endpoint,
                "room_id": room_id,
                "status_code": response.status_code,
                "response_body": response_body[:500],
            },
        )

        if not response.ok:
            error_message = self._extract_error_message(response_body, response.reason)
            raise RocketChatError(f"Rocket.Chat HTTP {response.status_code}: {error_message}")

        try:
            data = response.json()
        except ValueError as exc:
            raise RocketChatError("Rocket.Chat returned invalid JSON") from exc

        if not data.get("success"):
            error_message = data.get("error") or data.get("message") or "Rocket.Chat upload failed"
            raise RocketChatError(str(error_message))

        file_data = data.get("file")
        message_data = data.get("message")
        return RocketChatUploadResult(
            file_id=file_data.get("_id") if isinstance(file_data, dict) else None,
            message_id=message_data.get("_id") if isinstance(message_data, dict) else None,
        )
