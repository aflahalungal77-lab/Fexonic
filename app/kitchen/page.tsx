import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

export default async function Kitchen() {
  const s = await supabaseServer();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) redirect('/login');

  const { data: m } = await s
    .from('restaurant_members')
    .select('restaurant_id,restaurants(slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!m) redirect('/signup');

  redirect('/k/' + (m as any).restaurants.slug);
}