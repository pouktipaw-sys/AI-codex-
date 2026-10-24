# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN --mount=type=secret,id=proxy_ca     if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi;     npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FLOW_FRONTEND_DIR=/app/frontend/dist
WORKDIR /app
COPY pyproject.toml requirements.lock ./
COPY backend ./backend
RUN --mount=type=secret,id=proxy_ca     if [ -f /run/secrets/proxy_ca ]; then export PIP_CERT=/run/secrets/proxy_ca; fi;     pip install --no-cache-dir -r requirements.lock && pip install --no-cache-dir --no-deps .
COPY --from=frontend /build/dist ./frontend/dist
COPY scripts/serve.py /app/serve.py
# Bootstrap creates only the app-owned directory on the mounted disk, then drops root.
EXPOSE 8000
CMD ["python", "/app/serve.py"]
