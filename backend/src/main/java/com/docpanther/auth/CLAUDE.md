# CLAUDE.md — auth-agent

## Scope
Own ONLY `com.docpanther.auth.*`. Do not touch any other package.

## What to build
- Form-based registration (INDIVIDUAL + ENTERPRISE modes)
- Email verification flow (token → SES → verify endpoint)
- Password reset flow (forgot-password → SES → reset endpoint)
- Email + password login → issue JWT
- Google OAuth 2.0 (individual users only) → issue JWT
- JWT access token (15 min) + refresh token (7d in Redis)
- Logout (revoke refresh token from Redis)

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `auth`.
Your controllers must return exactly those response shapes. Use models from `contracts/models.md`.

## Key classes to create
- `AuthController` — REST endpoints
- `AuthService` — registration, login, email verify, password reset
- `JwtService` — generate/parse/validate JWT; refresh tokens in Redis
- `JwtAuthFilter` — extract Bearer token, set SecurityContext
- `OAuth2AuthSuccessHandler` — Google OAuth callback → issue JWT
- `User` entity (JPA) → `users` table
- `UserRepository` (JpaRepository)
- `EmailVerification` entity → `email_verifications` table
- `PasswordReset` entity → `password_resets` table

## Do NOT
- Modify SecurityConfig in `common/` — it already wires up your filter and OAuth handler
- Write Flyway migrations — propose schema to control agent
- Send emails directly — call `Mailer` interface from `common/`

## Dependencies allowed
- `common/config/AppProperties` — for JWT secret, expiry config
- `common/exception/ApiException` — for error throwing
- `audit/AuditLogger` interface — call after register, login, password reset
