import {supabaseServer} from './supabase-server';
export async function currentUser(){const s=await supabaseServer();const {data}=await s.auth.getUser();return data.user}
export async function currentMembership(restaurantId:string){const s=await supabaseServer();const u=await currentUser();if(!u)return null;const {data}=await s.from('restaurant_members').select('role,restaurant_id').eq('restaurant_id',restaurantId).eq('user_id',u.id).maybeSingle();return data}
