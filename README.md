# Fexonic Production Starter

A multi-tenant QR restaurant ordering platform built around Next.js + Supabase.

## Included
- Restaurant signup/login with automatic tenant creation.
- Customer URL: `/r/[restaurant-slug]/t/[table-id]`.
- Restaurant kitchen: `/k/[restaurant-slug]`.
- `/kitchen` resolves the logged-in owner's restaurant.
- Menu items, prices, availability and food-image JSON metadata.
- Supabase Storage bucket for food images; only one image object is stored in `menu_items.image`.
- Tables and QR-ready customer URLs.
- Orders with server-side price validation and status workflow.
- Revenue/order/menu/table dashboard.
- Platform admin at `/admin`, restricted by `FEXONIC_PLATFORM_ADMIN_EMAIL`.
- Supabase RLS tenant isolation.
- Health endpoint `/api/health`.

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set the values.
4. Set `NEXT_PUBLIC_APP_URL` to the deployed URL.
5. `npm install`
6. `npm run build`
7. `npm start`

## Important production notes
- The schema is designed for one shared database with `restaurant_id` tenant isolation; do not create one database per restaurant.
- Customer ordering is intentionally public, but only active restaurant/table/menu records can be used.
- For payments, connect Razorpay/Stripe later using a server-side webhook and never trust browser payment status.
- Automated WhatsApp renewal messaging requires a WhatsApp Business provider and is not included as a fake/free integration.
- Supabase Free tier is suitable for an early pilot, not an unlimited permanent production guarantee.
- Before a public launch, configure custom SMTP, backups/retention, monitoring, rate limiting/WAF, payment webhooks, and legal/privacy pages.
