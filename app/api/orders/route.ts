import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type OrderItemInput = {
  menu_item_id?: unknown;
  quantity?: unknown;
};

type MenuItem = {
  id: string;
  name: string;
  price: number | string;
};

type NormalizedOrderItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
};

let adminClient: SupabaseClient | null = null;

/**
 * ✅ Reuse the Supabase admin client during warm server instances.
 * This avoids creating a new client for every request.
 */
function getAdminSupabase() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SERVICE_ROLE_KEY_MISSING");
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * ✅ Keep error messages returned to customers generic.
 * Internal database errors should only appear in server logs.
 */
function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function serverError() {
  return Response.json(
    { error: "Unable to place order. Please try again." },
    { status: 500 }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --------------------------------------------------
    // 1. BASIC REQUEST VALIDATION
    // --------------------------------------------------

    const restaurantId =
      typeof body?.restaurant_id === "string"
        ? body.restaurant_id.trim()
        : "";

    const tableId =
      typeof body?.table_id === "string"
        ? body.table_id.trim()
        : "";

    const items: OrderItemInput[] = Array.isArray(body?.items)
      ? body.items
      : [];

    if (!restaurantId || !tableId || items.length === 0) {
      return badRequest("Invalid order.");
    }

    // Prevent unnecessarily large requests.
    // A restaurant order normally shouldn't contain hundreds of lines.
    if (items.length > 50) {
      return badRequest("Too many items in order.");
    }

    // --------------------------------------------------
    // 2. VALIDATE ITEM SHAPE
    // --------------------------------------------------

    const cleanedItems: Array<{
      menuItemId: string;
      quantity: number;
    }> = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return badRequest("Invalid order item.");
      }

      const menuItemId =
        typeof item.menu_item_id === "string"
          ? item.menu_item_id.trim()
          : "";

      const rawQuantity = Number(item.quantity);

      if (!menuItemId) {
        return badRequest("Invalid menu item.");
      }

      if (
        !Number.isFinite(rawQuantity) ||
        !Number.isInteger(rawQuantity) ||
        rawQuantity < 1
      ) {
        return badRequest("Invalid quantity.");
      }

      if (rawQuantity > 99) {
        return badRequest("Maximum quantity is 99.");
      }

      cleanedItems.push({
        menuItemId,
        quantity: rawQuantity,
      });
    }

    // --------------------------------------------------
    // 3. MERGE DUPLICATE MENU ITEMS
    // --------------------------------------------------

    /**
     * ✅ If a malicious/client request contains:
     *
     * item A x2
     * item A x3
     *
     * it becomes:
     *
     * item A x5
     *
     * This also reduces unnecessary order_items rows.
     */
    const quantityMap = new Map<string, number>();

    for (const item of cleanedItems) {
      const current = quantityMap.get(item.menuItemId) ?? 0;

      const next = current + item.quantity;

      if (next > 99) {
        return badRequest("Maximum quantity is 99.");
      }

      quantityMap.set(item.menuItemId, next);
    }

    const menuItemIds = [...quantityMap.keys()];

    // --------------------------------------------------
    // 4. SUPABASE
    // --------------------------------------------------

    const supabase = getAdminSupabase();

    // --------------------------------------------------
    // 5. RESTAURANT + TABLE VALIDATION
    // --------------------------------------------------

    /**
     * We still verify the restaurant and table separately
     * because it gives cleaner error handling.
     *
     * The table query is constrained by restaurant_id, so a
     * table belonging to another restaurant cannot be used.
     */

    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("id,is_active")
        .eq("id", restaurantId)
        .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant lookup failed:", restaurantError);
      return serverError();
    }

    if (!restaurant) {
      return Response.json(
        { error: "Restaurant not found." },
        { status: 404 }
      );
    }

    if (!restaurant.is_active) {
      return Response.json(
        { error: "Restaurant unavailable." },
        { status: 403 }
      );
    }

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id,restaurant_id,is_active")
      .eq("id", tableId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (tableError) {
      console.error("Table lookup failed:", tableError);
      return serverError();
    }

    if (!table) {
      return badRequest("Invalid table.");
    }

    if (!table.is_active) {
      return badRequest("Table is unavailable.");
    }

    // --------------------------------------------------
    // 6. GET MENU ITEMS
    // --------------------------------------------------

    /**
     * ✅ One query gets all requested menu items.
     *
     * Prices come from the database.
     * Client-supplied prices are completely ignored.
     */
    const { data: menus, error: menuError } = await supabase
      .from("menu_items")
      .select("id,name,price")
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .in("id", menuItemIds);

    if (menuError) {
      console.error("Menu lookup failed:", menuError);
      return serverError();
    }

    if (!menus || menus.length !== menuItemIds.length) {
      return badRequest(
        "Menu changed. Refresh and try again."
      );
    }

    // --------------------------------------------------
    // 7. O(1) MENU LOOKUP
    // --------------------------------------------------

    /**
     * ❌ Old:
     *
     * menus.find(...)
     *
     * for every item.
     *
     * ✅ New:
     *
     * Map lookup.
     *
     * Much cleaner and faster when orders contain
     * multiple items.
     */

    const menuMap = new Map<string, MenuItem>(
      (menus as MenuItem[]).map((menu) => [menu.id, menu])
    );

    const normalized: NormalizedOrderItem[] = [];

    let total = 0;

    for (const menuItemId of menuItemIds) {
      const menu = menuMap.get(menuItemId);

      if (!menu) {
        return badRequest(
          "Menu changed. Refresh and try again."
        );
      }

      const price = Number(menu.price);

      if (!Number.isFinite(price) || price < 0) {
        console.error(
          "Invalid menu price:",
          menu.id,
          menu.price
        );

        return serverError();
      }

      const quantity = quantityMap.get(menuItemId) ?? 0;

      normalized.push({
        menu_item_id: menu.id,
        name: menu.name,
        price,
        quantity,
      });

      total += price * quantity;
    }

    // Prevent floating-point surprises in monetary calculations.
    total = Math.round((total + Number.EPSILON) * 100) / 100;

    // --------------------------------------------------
    // 8. REGISTER CUSTOMER DEVICE
    // --------------------------------------------------

    let deviceId: string | null = null;

    const deviceKey =
      typeof body?.device_key === "string"
        ? body.device_key.trim().slice(0, 120)
        : "";

    if (deviceKey) {
      const deviceName =
        typeof body?.device_name === "string" &&
        body.device_name.trim()
          ? body.device_name.trim().slice(0, 80)
          : "Customer Device";

      const { data: device, error: deviceError } =
        await supabase
          .from("devices")
          .upsert(
            {
              restaurant_id: restaurant.id,
              device_key: deviceKey,
              name: deviceName,
              kind: "CUSTOMER",
              last_seen_at: new Date().toISOString(),
            },
            {
              onConflict: "restaurant_id,device_key",
            }
          )
          .select("id")
          .single();

      if (deviceError) {
        /**
         * Device registration is useful, but it should not
         * prevent a customer from ordering if the device
         * table has a temporary problem.
         *
         * The order itself remains the important operation.
         */
        console.error(
          "Device registration failed:",
          deviceError
        );
      } else {
        deviceId = device?.id ?? null;
      }
    }

    // --------------------------------------------------
    // 9. CREATE ORDER
    // --------------------------------------------------

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          table_id: table.id,
          device_id: deviceId,
          total,
          status: "NEW",
        })
        .select("id,total")
        .single();

    if (orderError || !order) {
      console.error("Order creation failed:", orderError);
      return serverError();
    }

    // --------------------------------------------------
    // 10. CREATE ORDER ITEMS
    // --------------------------------------------------

    const orderItems = normalized.map((item) => ({
      order_id: order.id,
      restaurant_id: restaurant.id,
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const { error: orderItemsError } =
      await supabase
        .from("order_items")
        .insert(orderItems);

    if (orderItemsError) {
      console.error(
        "Order items creation failed:",
        orderItemsError
      );

      /**
       * Manual rollback.
       *
       * IMPORTANT:
       * For true atomicity, move order + order_items creation
       * into a PostgreSQL RPC/transaction later.
       */
      const { error: rollbackError } =
        await supabase
          .from("orders")
          .delete()
          .eq("id", order.id);

      if (rollbackError) {
        console.error(
          "Order rollback failed:",
          rollbackError
        );
      }

      return serverError();
    }

    // --------------------------------------------------
    // 11. SUCCESS
    // --------------------------------------------------

    return Response.json(
      {
        id: order.id,
        total,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Order creation error:", error);

    return serverError();
  }
}