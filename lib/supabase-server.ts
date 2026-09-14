import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const jar = await cookies();

  return createServerClient(
    'https://zmoxqiggadqlbslyfrzi.supabase.co',
    'sb_publishable_OK-FDWBUcZ45tcccuFuukA_8R88aQyt',
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(c) {
          try {
            c.forEach(({ name, value, options }) => {
              jar.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
}