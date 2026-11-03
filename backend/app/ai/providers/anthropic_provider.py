"""Anthropic Claude provider for ContinuityOS AI extraction."""

from typing import Optional
from app.core.config import settings

try:
    import anthropic
except ImportError:
    anthropic = None

from app.ai.providers.base import LLMProvider


class AnthropicProvider(LLMProvider):
    """Anthropic Claude provider implementation."""

    def __init__(self) -> None:
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.ANTHROPIC_MODEL
        self._client = anthropic.Anthropic(api_key=self.api_key) if (self.api_key and anthropic) else None

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client is not None)

    def chat_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_tokens: Optional[int] = 4000,
    ) -> tuple:
        """Send a chat completion request to Anthropic."""
        if not self._client:
            return None, "Anthropic client not available"

        try:
            # Extract system prompt and user message
            system_msg = ""
            user_content = ""
            for msg in messages:
                if msg.get("role") == "system":
                    system_msg = msg.get("content", "")
                else:
                    user_content = msg.get("content", "")

            response = self._client.messages.create(
                model=self.model,
                system=system_msg,
                messages=[{"role": "user", "content": user_content}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.content[0].text
            return content.strip(), None
        except Exception as e:
            return None, f"Anthropic error: {str(e)}"
