import os

# Agent loop
MAX_ITERATIONS = int(os.environ.get("MAX_ITERATIONS", "50"))

# Session defaults
DEFAULT_MAX_ROUNDS = int(os.environ.get("DEFAULT_MAX_ROUNDS", "50"))
SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", "86400"))
CLEANUP_INTERVAL_SECONDS = int(os.environ.get("CLEANUP_INTERVAL_SECONDS", "300"))
MAX_DISCUSSION_ROUNDS = int(os.environ.get("MAX_DISCUSSION_ROUNDS", "200"))

# Networking
DEFAULT_PORT = int(os.environ.get("ENGINE_PORT", "8001"))
SSE_CHANNEL_BUFFER = int(os.environ.get("SSE_CHANNEL_BUFFER", "64"))

# LLM
DEFAULT_MAX_TOKENS = int(os.environ.get("DEFAULT_MAX_TOKENS", "8192"))
LLM_REQUEST_TIMEOUT = int(os.environ.get("LLM_REQUEST_TIMEOUT", "120"))

# Callback
CALLBACK_TIMEOUT = int(os.environ.get("CALLBACK_TIMEOUT", "10"))
