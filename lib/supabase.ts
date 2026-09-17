import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = "https://zmoxqiggadqlbslyfrzi.supabase.co";
const supabaseKey = "sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function supabaseBrowser() {
  if (client) return client;

  client = createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  return client;
}