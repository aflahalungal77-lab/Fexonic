import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: req,
  });

  const supabaseUrl = "https://zmoxqiggadqlbslyfrzi.supabase.co";
  const supabaseKey = "sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);

            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    (
      req.nextUrl.pathname.startsWith("/k/") ||
      req.nextUrl.pathname === "/kitchen"
    ) &&
    !user
  ) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/k/:path*",
    "/kitchen",
  ],
};