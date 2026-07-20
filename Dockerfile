# syntax=docker/dockerfile:1
FROM python:3.12-slim

# uv for fast, reproducible installs (pinned by uv.lock)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Install dependencies first (better layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# App source
COPY . .
RUN uv sync --frozen --no-dev

# Run as non-root; /app must be writable (render.py writes generated pages)
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "exec uv run --no-dev uvicorn server.main:app --host 0.0.0.0 --port ${PORT}"]
