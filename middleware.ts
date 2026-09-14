import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: req,
  });

  const supabaseUrl = 'https://zmoxqiggadqlbslyfrzi.supabase.co';
  const supabaseKey = 'sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt';

  const s = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(c) {
          c.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await s.auth.getUser();

  if (
    (req.nextUrl.pathname.startsWith('/k/') ||
      req.nextUrl.pathname === '/kitchen') &&
    !user
  ) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/k/:path*', '/kitchen'],
};