# Velora Backend + Frontend

Next.js 14 + TypeScript + MongoDB (Mongoose) premium dating platform.

## Backend architecture implemented

- App Router API structure under `/app/api`
- Auth with bcrypt + JWT cookies + refresh token rotation
- Email verification + forgot/reset password flows
- Role model: `user`, `admin`, `super_admin`
- Admin user management with role/status controls
- Discover/Like/Match APIs with mutual-match logic
- Chat persistence APIs + Socket.io authenticated real-time server
- Stripe checkout for subscriptions and coins
- Stripe webhook fulfillment + idempotent event handling
- Stripe customer portal + subscription cancel route
- Core security utilities: rate-limit, CSRF token checks, validation, centralized API wrapper

## Core models

- `User`, `Like`, `Match`, `Swipe`, `Message`
- `Payment`, `Transaction`, `CoinLedger`, `StripeEvent`
- `OtpCode`, `PasswordResetToken`, `Report`

## Key API routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/verify-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Matching
- `GET /api/discover`
- `POST /api/like`
- `GET /api/matches`

### Chat
- `GET /api/chat/messages`
- `POST /api/chat/messages`

### Stripe
- `POST /api/stripe/create-checkout`
- `POST /api/stripe/checkout`
- `POST /api/stripe/webhook`
- `POST /api/stripe/portal`
- `POST /api/stripe/subscription/cancel`
- `POST /api/stripe/subscription/portal`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

## Local run

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Notes

- Mutating authenticated routes require CSRF header `x-csrf-token` matching cookie `velora_csrf`.
- Stripe webhooks are idempotent via `StripeEvent`.
- Socket server entrypoint: `/socket/server.ts`.
# velora
