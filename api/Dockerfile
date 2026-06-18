FROM node:20-slim AS ui-build
WORKDIR /ui
COPY ui/package*.json .
RUN npm ci
COPY ui/ .
RUN npm run build


FROM python:3.11-slim

WORKDIR /app/api

# build-essential needed to compile pyFAI (Meson/Cython build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies from root pyproject.toml
COPY pyproject.toml .
RUN pip install --no-cache-dir ".[api]"

# Copy full project so src/assets/default_models.json is accessible
COPY . /app

# Copy built UI from the first stage
COPY --from=ui-build /ui/dist /app/ui/dist

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
