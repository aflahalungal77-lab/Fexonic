import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("SERVICE_ROLE_KEY_MISSING");
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.restaurant_id || !body.table_id || !Array.isArray(body.items) || !body.items.length) {
      return Response.json({ error: "Invalid order" }, { status: 400 });
    }

    const supabase = getAdminSupabase();

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id,is_active")
      .eq("id", body.restaurant_id)
      .single();

    if (restaurantError || !restaurant) return Response.json({ error: "Restaurant not found" }, { status: 404 });
    if (!restaurant.is_active) return Response.json({ error: "Restaurant unavailable" }, { status: 403 });

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id,restaurant_id,is_active")
      .eq("id", body.table_id)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (tableError || !table) return Response.json({ error: "Invalid table" }, { status: 400 });
    if (!table.is_active) return Response.json({ error: "Table is unavailable" }, { status: 400 });

    const ids = [...new Set(body.items.map((x: any) => String(x.menu_item_id)))];
    const { data: menus, error: menuError } = await supabase
      .from("menu_items")
      .select("id,name,price")
      .eq("restaurant_id", restaurant.id)
      .in("id", ids)
      .eq("is_available", true);

    if (menuError) throw menuError;
    if (!menus || menus.length !== ids.length) {
      return Response.json({ error: "Menu changed. Refresh and try again." }, { status: 400 });
    }

    const normalized = body.items.map((x: any) => {
      const menu = menus.find((z: any) => z.id === x.menu_item_id);
      if (!menu) throw new Error("Menu item not found");
      const quantity = Math.min(99, Math.max(1, Number(x.quantity) || 1));
      return { menu_item_id: menu.id, name: menu.name, price: Number(menu.price), quantity };
    });

    const total = normalized.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Register the browser/device that originated the order.
    let deviceId: string | null = null;
    const deviceKey = typeof body.device_key === "string" ? body.device_key.trim().slice(0, 120) : "";
    if (deviceKey) {
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .upsert({
          restaurant_id: restaurant.id,
          device_key: deviceKey,
          name: typeof body.device_name === "string" && body.device_name.trim() ? body.device_name.trim().slice(0, 80) : "Customer Device",
          kind: "CUSTOMER",
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "restaurant_id,device_key" })
        .select("id")
        .single();
      if (deviceError) throw deviceError;
      deviceId = device?.id || null;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ restaurant_id: restaurant.id, table_id: table.id, device_id: deviceId, total, status: "NEW" })
      .select("id")
      .single();

    if (orderError) throw orderError;

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      normalized.map((item: any) => ({ ...item, order_id: order.id, restaurant_id: restaurant.id }))
    );

    if (orderItemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      throw orderItemsError;
    }

    const { data: bill, error: billError } = await supabase
      .from("bills")
      .insert({ restaurant_id: restaurant.id, order_id: order.id, subtotal: total, total, status: "OPEN" })
      .select("id,bill_number")
      .single();

    if (billError) {
      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("orders").delete().eq("id", order.id);
      throw billError;
    }

    return Response.json({ id: order.id, total, bill_id: bill.id, bill_number: bill.bill_number }, { status: 201 });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return Response.json({ error: error?.message || "Order failed" }, { status: 500 });
  }
}
