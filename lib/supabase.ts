import { createBrowserClient } from '@supabase/ssr';

export function supabaseBrowser() {
  return createBrowserClient(
    'https://zmoxqiggadqlbslyfrzi.supabase.co',
    'sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt'
  );
}