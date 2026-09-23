import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SERVICE_ROLE_KEY_MISSING"
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

const CUSTOMER_SLOTS = [
  "A",
  "B",
  "C",
  "D",
] as const;

type CustomerSlotCode =
  (typeof CUSTOMER_SLOTS)[number];

function isCustomerSlotCode(
  value: unknown
): value is CustomerSlotCode {
  return (
    value === "A" ||
    value === "B" ||
    value === "C" ||
    value === "D"
  );
}

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (
      !body.restaurant_id ||
      !body.table_id ||
      !Array.isArray(body.items) ||
      !body.items.length
    ) {
      return Response.json(
        {
          error: "Invalid order",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getAdminSupabase();

    // =====================================================
    // RESTAURANT
    // =====================================================

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id,is_active"
      )
      .eq(
        "id",
        body.restaurant_id
      )
      .single();

    if (
      restaurantError ||
      !restaurant
    ) {
      return Response.json(
        {
          error:
            "Restaurant not found",
        },
        {
          status: 404,
        }
      );
    }

    if (!restaurant.is_active) {
      return Response.json(
        {
          error:
            "Restaurant unavailable",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // TABLE
    // =====================================================

    const {
      data: table,
      error: tableError,
    } = await supabase
      .from("tables")
      .select(
        "id,restaurant_id,is_active"
      )
      .eq(
        "id",
        body.table_id
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .single();

    if (
      tableError ||
      !table
    ) {
      return Response.json(
        {
          error:
            "Invalid table",
        },
        {
          status: 400,
        }
      );
    }

    if (!table.is_active) {
      return Response.json(
        {
          error:
            "Table is unavailable",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // CUSTOMER SLOT
    //
    // Customer page sends:
    //
    // customer: "A"
    //
    // We validate that A/B/C/D belongs to
    // this exact restaurant + table.
    // =====================================================

    const customerCode =
      typeof body.customer ===
      "string"
        ? body.customer
            .trim()
            .toUpperCase()
        : "";

    if (
      !isCustomerSlotCode(
        customerCode
      )
    ) {
      return Response.json(
        {
          error:
            "Invalid customer slot. Please scan the correct Customer A, B, C or D QR.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: customerSlot,
      error: customerSlotError,
    } = await supabase
      .from("customer_slots")
      .select(
        "id,restaurant_id,table_id,slot_code,is_active"
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq(
        "table_id",
        table.id
      )
      .eq(
        "slot_code",
        customerCode
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle();

    if (
      customerSlotError
    ) {
      throw customerSlotError;
    }

    if (!customerSlot) {
      return Response.json(
        {
          error:
            `Customer ${customerCode} slot is not available for this table.`,
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // MENU VALIDATION
    // =====================================================

    const ids = [
      ...new Set(
        body.items.map(
          (x: any) =>
            String(
              x.menu_item_id
            )
        )
      ),
    ];

    const {
      data: menus,
      error: menuError,
    } = await supabase
      .from("menu_items")
      .select(
        "id,name,price"
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .in(
        "id",
        ids
      )
      .eq(
        "is_available",
        true
      );

    if (menuError) {
      throw menuError;
    }

    if (
      !menus ||
      menus.length !==
        ids.length
    ) {
      return Response.json(
        {
          error:
            "Menu changed. Refresh and try again.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // NORMALIZE ITEMS
    // =====================================================

    const normalized =
      body.items.map(
        (x: any) => {
          const menu =
            menus.find(
              (z: any) =>
                z.id ===
                x.menu_item_id
            );

          if (!menu) {
            throw new Error(
              "Menu item not found"
            );
          }

          const quantity =
            Math.min(
              99,
              Math.max(
                1,
                Number(
                  x.quantity
                ) || 1
              )
            );

          return {
            menu_item_id:
              menu.id,

            name:
              menu.name,

            price:
              Number(
                menu.price
              ),

            quantity,
          };
        }
      );

    // =====================================================
    // TOTAL
    // =====================================================

    const total =
      normalized.reduce(
        (
          sum: number,
          item: any
        ) =>
          sum +
          item.price *
            item.quantity,
        0
      );

    // =====================================================
    // DEVICE
    // =====================================================

    let deviceId:
      string | null = null;

    const deviceKey =
      typeof body.device_key ===
      "string"
        ? body.device_key
            .trim()
            .slice(0, 120)
        : "";

    if (deviceKey) {
      const {
        data: device,
        error: deviceError,
      } = await supabase
        .from("devices")
        .upsert(
          {
            restaurant_id:
              restaurant.id,

            device_key:
              deviceKey,

            name:
              typeof body.device_name ===
                "string" &&
              body.device_name.trim()
                ? body.device_name
                    .trim()
                    .slice(0, 80)
                : "Customer Device",

            kind:
              "CUSTOMER",

            last_seen_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "restaurant_id,device_key",
          }
        )
        .select("id")
        .single();

      if (deviceError) {
        throw deviceError;
      }

      deviceId =
        device?.id ||
        null;
    }

    // =====================================================
    // BILLING SESSION
    //
    // One physical table still has one billing session.
    //
    // Customer A/B/C/D are separated through
    // customer_slot_id on each order.
    // =====================================================

    let billingSessionId:
      string | null = null;

    const {
      data: existingSession,
      error:
        existingSessionError,
    } = await supabase
      .from(
        "billing_sessions"
      )
      .select("id")
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq(
        "table_id",
        table.id
      )
      .eq(
        "status",
        "OPEN"
      )
      .maybeSingle();

    if (
      existingSessionError
    ) {
      throw existingSessionError;
    }

    if (existingSession) {
      billingSessionId =
        existingSession.id;
    } else {
      const {
        data: newSession,
        error:
          newSessionError,
      } = await supabase
        .from(
          "billing_sessions"
        )
        .insert({
          restaurant_id:
            restaurant.id,

          table_id:
            table.id,

          status:
            "OPEN",
        })
        .select("id")
        .single();

      if (newSessionError) {
        throw newSessionError;
      }

      billingSessionId =
        newSession.id;
    }

    // =====================================================
    // CREATE ORDER
    // =====================================================

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        restaurant_id:
          restaurant.id,

        table_id:
          table.id,

        /*
         * NEW:
         * Customer A/B/C/D slot ID
         */
        customer_slot_id:
          customerSlot.id,

        device_id:
          deviceId,

        billing_session_id:
          billingSessionId,

        total,

        status:
          "NEW",
      })
      .select(
        "id,total,customer_slot_id"
      )
      .single();

    if (orderError) {
      throw orderError;
    }

    // =====================================================
    // CREATE ORDER ITEMS
    // =====================================================

    const {
      error:
        orderItemsError,
    } = await supabase
      .from(
        "order_items"
      )
      .insert(
        normalized.map(
          (item: any) => ({
            ...item,

            order_id:
              order.id,

            restaurant_id:
              restaurant.id,
          })
        )
      );

    if (orderItemsError) {
      /*
       * Roll back the order if
       * order items fail.
       */
      await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      throw orderItemsError;
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return Response.json(
      {
        id:
          order.id,

        total,

        customer:
          customerCode,

        customer_slot_id:
          customerSlot.id,

        billing_session_id:
          billingSessionId,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "Order creation error:",
      error
    );

    return Response.json(
      {
        error:
          error?.message ||
          "Order failed",
      },
      {
        status: 500,
      }
    );
  }
}