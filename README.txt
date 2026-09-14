OneTime Labs Store v2.1.3 - Login Width Fix

Replace these two project files:

1. src/pages/LoginPage.tsx
2. src/styles.css

What changed:
- /login now keeps the same full store-shell width as the rest of the Store.
- The visible auth card spans the Store content area instead of being capped at 460px.
- The email/password form remains intentionally compact inside the full-width card.
- Mobile padding remains compact.
- No auth, routing, Supabase, Stripe, or seller logic was changed.
