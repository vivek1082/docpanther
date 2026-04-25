# CLAUDE.md — docker-agent

Own ONLY the following files. Do not touch backend Java, web TypeScript, or contracts.

## Files to create

```
docker-compose.yml              ← local dev (all services on localhost)
docker-compose.hostinger.yml    ← Hostinger VPS (adds nginx reverse proxy)
backend/Dockerfile              ← Spring Boot container
web/Dockerfile                  ← Next.js container
docker/init.sql                 ← PostgreSQL initialization (create schemas + extensions)
docker/nginx.conf               ← Nginx config for Hostinger VPS
.env.local.example              ← copy to .env.local for local dev
.env.hostinger.example          ← copy to .env on Hostinger VPS
```

## Architecture

```
Local dev:
  localhost:3000  → Next.js (web)
  localhost:8080  → Spring Boot (backend)
  localhost:5432  → PostgreSQL
  localhost:6379  → Redis

Hostinger VPS:
  yourdomain.com        → Nginx → Next.js (port 3000)
  yourdomain.com/api    → Nginx → Spring Boot (port 8080)
  (PostgreSQL + Redis stay internal — no public ports)
```

## `docker-compose.yml` — local dev

Services:
- `postgres` — postgres:15-alpine, port 5432:5432, volume postgres_data
  - POSTGRES_DB: docpanther
  - POSTGRES_USER: docpanther
  - POSTGRES_PASSWORD: localdev123
  - Mount: ./docker/init.sql → /docker-entrypoint-initdb.d/init.sql

- `redis` — redis:7-alpine, port 6379:6379

- `backend` — build from ./backend/Dockerfile
  - Port 8080:8080
  - Env: SPRING_PROFILES_ACTIVE=local
  - Env: SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/docpanther
  - Env: SPRING_DATASOURCE_USERNAME=docpanther
  - Env: SPRING_DATASOURCE_PASSWORD=localdev123
  - Env: SPRING_DATA_REDIS_HOST=redis
  - Env: SPRING_DATA_REDIS_PORT=6379
  - Env: APP_JWT_SECRET=${APP_JWT_SECRET:-local-dev-jwt-secret-32-chars-min}
  - Env: APP_JWT_ACCESS_EXPIRY_MINUTES=15
  - Env: APP_JWT_REFRESH_EXPIRY_DAYS=7
  - Env: APP_S3_BUCKET=${APP_S3_BUCKET:-docpanther-local}
  - Env: APP_S3_REGION=${APP_S3_REGION:-ap-south-1}
  - Env: AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
  - Env: AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
  - Env: GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
  - Env: GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
  - Env: APP_FRONTEND_URL=http://localhost:3000
  - depends_on: postgres (condition: service_healthy), redis
  - healthcheck: curl -f http://localhost:8080/actuator/health || exit 1

- `web` — build from ./web/Dockerfile
  - Port 3000:3000
  - Env: NEXT_PUBLIC_API_URL=http://localhost:8080
  - depends_on: backend (condition: service_healthy)

volumes: postgres_data, redis_data

## `backend/Dockerfile`

Multi-stage:
- Stage 1 (build): maven:3.9-eclipse-temurin-17 → mvn package -DskipTests → produces app.jar
- Stage 2 (run): eclipse-temurin:17-jre-alpine → COPY app.jar → ENTRYPOINT java -jar app.jar
- EXPOSE 8080

## `web/Dockerfile`

Multi-stage:
- Stage 1 (deps): node:20-alpine → npm ci
- Stage 2 (build): COPY from deps → npm run build
- Stage 3 (run): node:20-alpine → COPY .next/standalone → CMD node server.js
- EXPOSE 3000
- Set ENV NEXT_TELEMETRY_DISABLED=1

Note: web/next.config.js needs `output: 'standalone'` — add it if missing.

## `docker/init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text search

-- Control plane schema
CREATE SCHEMA IF NOT EXISTS control_plane;

-- Pod schema (local dev uses same DB, separate schema)
CREATE SCHEMA IF NOT EXISTS pod_local;

-- Grant
GRANT ALL ON SCHEMA control_plane TO docpanther;
GRANT ALL ON SCHEMA pod_local TO docpanther;
```

## `docker/nginx.conf` — for Hostinger VPS

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Frontend
    location / {
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # Actuator (internal only — block from public)
    location /actuator {
        deny all;
    }
}
```

## `docker-compose.hostinger.yml`

Extends docker-compose.yml and adds:
- `nginx` service: nginx:alpine, ports 80:80 443:443, mounts docker/nginx.conf
- Remove public ports from postgres and redis (internal only)
- Add `restart: unless-stopped` to all services
- Add resource limits: backend memory 512m, web memory 256m

## `.env.local.example`

```
# Copy this to .env.local and fill in your values
APP_JWT_SECRET=change-this-to-a-random-32-char-string
APP_S3_BUCKET=docpanther-local
APP_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

## `.env.hostinger.example`

```
# Copy this to .env on your Hostinger VPS and fill in your values
APP_JWT_SECRET=change-this-to-a-random-32-char-string-prod
APP_S3_BUCKET=docpanther-ap-south-1
APP_S3_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
POSTGRES_PASSWORD=change-this-strong-password
```

## Do NOT
- Hardcode passwords or secrets — use environment variables
- Open postgres or redis ports publicly in hostinger compose
- Add business logic — this agent only creates infrastructure config files
- Modify any Java or TypeScript source files
