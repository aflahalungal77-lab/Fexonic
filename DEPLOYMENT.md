# Fexonic deployment checklist

1. Create Supabase project and run `supabase/schema.sql`.
2. In Supabase Auth, configure email confirmation/SMTP for your launch policy.
3. Copy `.env.example` to `.env.local` for local development.
4. Set `NEXT_PUBLIC_APP_URL` to the final Vercel URL.
5. Set `FEXONIC_PLATFORM_ADMIN_EMAIL` to the platform owner's verified login email.
6. Deploy with Vercel/another Node-compatible host.
7. Add the deployment URL to Supabase Auth redirect URLs.
8. Test: signup -> kitchen -> add table -> scan QR -> place order -> kitchen status.
9. Configure database backups/retention and monitoring before onboarding real restaurants.
10. Add a real payment provider webhook before charging subscriptions.
