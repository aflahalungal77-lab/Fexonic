import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SERVICE_ROLE_KEY_MISSING");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getMemberRestaurantId(orderId: string) {
  const authClient = await supabaseServer();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const admin = getAdminSupabase();
  const { data: order } = await admin
    .from("orders")
    .select("id,restaurant_id")
    .eq("id", orderId)
    .single();
  if (!order) return null;

  const { data: member } = await admin
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("restaurant_id", order.restaurant_id)
    .eq("user_id", user.id)
    .maybeSingle();

  return member ? order.restaurant_id : null;
}

export async function GET(req: Request) {
  try {
    const orderId = new URL(req.url).searchParams.get("order_id");
    if (!orderId) return Response.json({ error: "order_id is required" }, { status: 400 });

    const restaurantId = await getMemberRestaurantId(orderId);
    if (!restaurantId) return Response.json({ error: "Forbidden" }, { status: 403 });

    const admin = getAdminSupabase();
    const { data, error } = await admin
      .from("bills")
      .select("*,orders(id,status,total,created_at,table_id,tables(name),order_items(name,price,quantity)")
      .eq("order_id", orderId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (error || !data) return Response.json({ error: "Bill not found" }, { status: 404 });
    return Response.json({ bill: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("Bill GET error:", error);
    return Response.json({ error: error?.message || "Failed to load bill" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.order_id || "");
    if (!orderId) return Response.json({ error: "order_id is required" }, { status: 400 });

    const restaurantId = await getMemberRestaurantId(orderId);
    if (!restaurantId) return Response.json({ error: "Forbidden" }, { status: 403 });

    const admin = getAdminSupabase();
    const update: Record<string, unknown> = {};
    if (body.printed === true) {
      update.printed = true;
      update.printed_at = new Date().toISOString();
    }
    if (body.status === "PAID" || body.status === "OPEN" || body.status === "CANCELLED") {
      update.status = body.status;
    }

    if (!Object.keys(update).length) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("bills")
      .update(update)
      .eq("order_id", orderId)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ bill: data });
  } catch (error: any) {
    console.error("Bill PATCH error:", error);
    return Response.json({ error: error?.message || "Failed to update bill" }, { status: 500 });
  }
}
