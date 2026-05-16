from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from providers.base import LLMProvider


_registry: dict[str, LLMProvider] = {}
_default_provider = None


def get_provider(model: str) -> LLMProvider:
    global _registry, _default_provider
    if not _registry:
        _registry = {
            "gpt": OpenAIProvider(),
            "openai": OpenAIProvider(),
            "claude": AnthropicProvider(),
            "anthropic": AnthropicProvider(),
        }
        _default_provider = OpenAIProvider()
    for prefix, provider in _registry.items():
        if model.startswith(prefix):
            return provider
    return _default_provider
