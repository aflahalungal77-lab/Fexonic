import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = "https://zmoxqiggadqlbslyfrzi.supabase.co";
const supabaseKey = "sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt";

export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always modify cookies.
            // Middleware handles session refresh.
          }
        },
      },
    }
  );
}