# Velora Architecture

```mermaid
flowchart TD
  A["Next.js App Router (UI + API)"] --> B["Auth APIs"]
  A --> C["Match + Chat APIs"]
  A --> D["Stripe Checkout API"]
  A --> E["Stripe Webhook API"]
  A --> F["Admin APIs"]

  B --> G["MongoDB Atlas (Mongoose)"]
  C --> G
  D --> H["Stripe"]
  H --> E
  E --> G
  E --> I["Email Service (Resend)"]

  C --> J["Socket.IO Server"]
  J --> G

  G --> K["Collections: User, Match, Swipe, Message, Payment, CoinLedger, Report, OTP, ResetToken, StripeEvent"]

  L["Cloudinary"] --> A
  M["Client Web/Mobile"] --> A
```

## Runtime Boundaries

- Next.js handles server rendering, API routes, auth cookies, Stripe session creation, and webhook processing.
- Socket.IO server handles low-latency chat events and persists chat data to MongoDB.
- Stripe is source-of-truth for payment status; webhook updates user coins/subscription state in MongoDB.
- Resend handles transactional email: OTP, welcome, reset password, and payment confirmations.
