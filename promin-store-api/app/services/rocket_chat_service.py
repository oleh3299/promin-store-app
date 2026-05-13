import json
from dataclasses import dataclass
from urllib import error, request

from app.config import get_settings


class RocketChatError(Exception):
    pass


@dataclass
class RocketChatSendResult:
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
