"""OpenAI GPT provider for ContinuityOS AI extraction."""

import os
from typing import Optional

try:
    import openai
except ImportError:
    openai = None

from app.ai.providers.base import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider implementation."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("OPENAI_API_KEY", "")
        self.model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        self._client = openai.OpenAI(api_key=self.api_key) if self.api_key and openai else None

    @property
    def name(self) -> str:
        return "openai"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client is not None)

    def chat_completion(
        self,
        messages: list,
        temperature: float = 0.0,
        max_tokens: Optional[int] = 4000,
    ) -> tuple:
        """Send a chat completion request to OpenAI."""
        if not self._client:
            return None, "OpenAI client not initialized"

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content
            return content.strip(), None
        except Exception as e:
            return None, f"Unexpected error: {str(e)}"
