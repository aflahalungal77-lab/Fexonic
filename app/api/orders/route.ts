import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("SERVICE_ROLE_KEY_MISSING");
}

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body.restaurant_id ||
      !body.table_id ||
      !Array.isArray(body.items) ||
      !body.items.length
    ) {
      return Response.json(
        { error: "Invalid order" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    // Check restaurant
    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("id,is_active")
        .eq("id", body.restaurant_id)
        .single();

    if (restaurantError || !restaurant) {
      return Response.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!restaurant.is_active) {
      return Response.json(
        { error: "Restaurant unavailable" },
        { status: 403 }
      );
    }

    // Check that the table actually belongs to this restaurant
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id,restaurant_id,is_active")
      .eq("id", body.table_id)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (tableError || !table) {
      return Response.json(
        { error: "Invalid table" },
        { status: 400 }
      );
    }

    if (!table.is_active) {
      return Response.json(
        { error: "Table is unavailable" },
        { status: 400 }
      );
    }

    // Get menu items
    const ids = body.items.map(
      (x: any) => x.menu_item_id
    );

    const { data: menus, error: menuError } = await supabase
      .from("menu_items")
      .select("id,name,price")
      .eq("restaurant_id", restaurant.id)
      .in("id", ids)
      .eq("is_available", true);

    if (menuError) {
      throw menuError;
    }

    if (!menus || menus.length !== ids.length) {
      return Response.json(
        {
          error:
            "Menu changed. Refresh and try again.",
        },
        { status: 400 }
      );
    }

    // Normalize order items
    const normalized = body.items.map((x: any) => {
      const menu = menus.find(
        (z: any) => z.id === x.menu_item_id
      );

      if (!menu) {
        throw new Error("Menu item not found");
      }

      const quantity = Math.min(
        99,
        Math.max(1, Number(x.quantity) || 1)
      );

      return {
        menu_item_id: menu.id,
        name: menu.name,
        price: menu.price,
        quantity,
      };
    });

    // Calculate total on the server
    const total = normalized.reduce(
      (sum: number, item: any) =>
        sum + Number(item.price) * item.quantity,
      0
    );

    // Create order
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          table_id: table.id,
          total,
          status: "NEW",
        })
        .select("id")
        .single();

    if (orderError) {
      throw orderError;
    }

    // Create order items
    const { error: orderItemsError } =
      await supabase
        .from("order_items")
        .insert(
          normalized.map((item: any) => ({
            ...item,
            order_id: order.id,
            restaurant_id: restaurant.id,
          }))
        );

    if (orderItemsError) {
      // Remove the order if order_items insertion fails
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      throw orderItemsError;
    }

    return Response.json(
      {
        id: order.id,
        total,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Order creation error:", error);

    return Response.json(
      {
        error:
          error?.message ||
          "Order failed",
      },
      { status: 500 }
    );
  }
}