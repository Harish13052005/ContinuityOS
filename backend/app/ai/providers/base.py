"""Common interface for optional language model providers."""

from abc import ABC, abstractmethod
from typing import Optional


class LLMProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def chat_completion(self, messages: list, temperature: float = 0.0, max_tokens: Optional[int] = 4000) -> tuple[str | None, str | None]: ...
