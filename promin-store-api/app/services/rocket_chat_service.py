import json
import mimetypes
import uuid
from dataclasses import dataclass
from urllib import error, request

from app.config import get_settings


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

        boundary = f"----promin-store-{uuid.uuid4().hex}"
        body = self._build_multipart_body(
            boundary,
            fields={"msg": message, "description": description},
            files={
                "file": {
                    "filename": filename,
                    "content_type": content_type,
                    "content": file_bytes,
                },
            },
        )
        upload_request = request.Request(
            f"{self.base_url}/api/v1/rooms.upload/{room_id}",
            data=body,
            headers={
                "X-Auth-Token": self.auth_token,
                "X-User-Id": self.user_id,
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Content-Length": str(len(body)),
            },
            method="POST",
        )

        try:
            with request.urlopen(upload_request, timeout=self.timeout) as response:
                response_body = response.read().decode("utf-8")
        except error.HTTPError as exc:
            raise RocketChatError(f"Rocket.Chat HTTP {exc.code}") from exc
        except error.URLError as exc:
            raise RocketChatError(f"Rocket.Chat upload failed: {exc.reason}") from exc
        except TimeoutError as exc:
            raise RocketChatError("Rocket.Chat upload timed out") from exc

        try:
            data = json.loads(response_body)
        except json.JSONDecodeError as exc:
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

    def _build_multipart_body(
        self,
        boundary: str,
        fields: dict[str, str],
        files: dict[str, dict[str, bytes | str]],
    ) -> bytes:
        lines: list[bytes] = []
        boundary_bytes = boundary.encode("ascii")

        for name, value in fields.items():
            lines.extend(
                [
                    b"--" + boundary_bytes,
                    f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"),
                    b"",
                    value.encode("utf-8"),
                ],
            )

        for name, file_data in files.items():
            filename = str(file_data["filename"])
            content_type = str(file_data.get("content_type") or mimetypes.guess_type(filename)[0] or "application/octet-stream")
            content = file_data["content"]
            if not isinstance(content, bytes):
                raise TypeError("Multipart file content must be bytes")

            lines.extend(
                [
                    b"--" + boundary_bytes,
                    f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode("utf-8"),
                    f"Content-Type: {content_type}".encode("utf-8"),
                    b"",
                    content,
                ],
            )

        lines.extend([b"--" + boundary_bytes + b"--", b""])
        return b"\r\n".join(lines)
