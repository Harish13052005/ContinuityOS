"""Optional LLM provider adapters."""

import json
import os


def extract_knowledge(content: str, filename: str, source_type: str) -> dict:
    """Extract JSON through a configured provider, or request deterministic fallback."""
    provider_name = os.getenv("LLM_PROVIDER", "").strip().lower()
    if not provider_name:
        return {"items": [], "error": "No LLM API configured"}

    try:
        if provider_name == "openai":
            from app.ai.providers.openai_provider import OpenAIProvider
            provider = OpenAIProvider()
        elif provider_name == "anthropic":
            from app.ai.providers.anthropic_provider import AnthropicProvider
            provider = AnthropicProvider()
        else:
            return {"items": [], "error": f"Unsupported LLM_PROVIDER: {provider_name}"}
        if not provider.is_configured:
            return {"items": [], "error": f"{provider_name} provider is not configured"}

        prompt = (
            "Extract only explicit project knowledge from this source. Return JSON with an items array. "
            "Each item must contain item_type, title, content, and evidence_excerpt copied verbatim from the source. "
            "Use item_type decision, task, risk, dependency, blocker, question, responsibility, or milestone. "
            "Do not infer missing facts.\n\n"
            f"Filename: {filename}\nType: {source_type}\nSource:\n{content[:50000]}"
        )
        response, error = provider.chat_completion([{"role": "user", "content": prompt}], temperature=0.0)
        if error or not response:
            return {"items": [], "error": error or "Empty provider response"}
        parsed = json.loads(response)
        if not isinstance(parsed, dict) or not isinstance(parsed.get("items"), list):
            return {"items": [], "error": "LLM response did not contain an items array"}
        safe_items = [
            item for item in parsed["items"]
            if isinstance(item, dict)
            and isinstance(item.get("evidence_excerpt"), str)
            and item["evidence_excerpt"]
            and item["evidence_excerpt"] in content
        ]
        return {"items": safe_items, "error": None}
    except Exception as exc:
        return {"items": [], "error": f"Knowledge extraction failed: {exc}"}
