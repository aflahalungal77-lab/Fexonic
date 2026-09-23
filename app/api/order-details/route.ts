import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// GET
// =====================================================

export async function GET(req: NextRequest) {
  try {
    const slug =
      req.nextUrl.searchParams.get("slug");

    if (!slug) {
      return Response.json(
        {
          error: "Restaurant slug is required",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    // =================================================
    // RESTAURANT
    // =================================================

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id,name,slug,is_active"
      )
      .eq("slug", slug)
      .single();

    if (restaurantError || !restaurant) {
      return Response.json(
        {
          error: "Restaurant not found",
        },
        { status: 404 }
      );
    }

    // =================================================
    // PERSISTENT CUSTOMER ORDER COUNT
    //
    // IMPORTANT:
    // This reads ALL historical orders.
    //
    // Done / CLOSED orders are included.
    //
    // Same customer ordering multiple times
    // counts as ONE customer.
    // =================================================

    const {
      data: historicalOrders,
      error: historicalOrdersError,
    } = await supabase
      .from("orders")
      .select(
        `
        id,
        customer_slot_id
        `
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .not(
        "customer_slot_id",
        "is",
        null
      );

    if (historicalOrdersError) {
      console.error(
        "Historical customer orders query error:",
        historicalOrdersError
      );

      return Response.json(
        {
          error:
            "Failed to load customer order count",
        },
        { status: 500 }
      );
    }

    // =================================================
    // UNIQUE CUSTOMERS
    // =================================================

    const uniqueCustomerIds =
      new Set<string>();

    for (
      const order of
        historicalOrders || []
    ) {
      if (
        order.customer_slot_id
      ) {
        uniqueCustomerIds.add(
          order.customer_slot_id
        );
      }
    }

    const customerOrderCount =
      uniqueCustomerIds.size;

    // =================================================
    // ONLY OPEN BILLING SESSIONS
    // =================================================

    const {
      data: sessions,
      error: sessionsError,
    } = await supabase
      .from("billing_sessions")
      .select(
        `
        id,
        table_id,
        status,
        created_at,
        tables (
          id,
          name
        )
        `
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq(
        "status",
        "OPEN"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (sessionsError) {
      console.error(
        "Billing sessions query error:",
        sessionsError
      );

      return Response.json(
        {
          error:
            "Failed to load billing sessions",
        },
        { status: 500 }
      );
    }

    const sessionIds =
      (sessions || []).map(
        (session: any) =>
          session.id
      );

    // =================================================
    // NO OPEN SESSIONS
    // =================================================

    if (sessionIds.length === 0) {
      return Response.json(
        {
          restaurant,

          orders: [],

          customerOrderCount,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    // =================================================
    // OPEN SESSION ORDERS
    // =================================================

    const {
      data: orders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select(
        `
        id,
        restaurant_id,
        table_id,
        customer_slot_id,
        device_id,
        billing_session_id,
        total,
        status,
        created_at,

        tables (
          id,
          name
        ),

        customer_slots (
          id,
          slot_code,
          label,
          is_active
        ),

        devices (
          id,
          name,
          device_key
        ),

        order_items (
          id,
          menu_item_id,
          name,
          price,
          quantity
        )
        `
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .in(
        "billing_session_id",
        sessionIds
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (ordersError) {
      console.error(
        "Order details query error:",
        ordersError
      );

      return Response.json(
        {
          error:
            "Failed to load orders",
        },
        { status: 500 }
      );
    }

    // =================================================
    // NORMALIZE
    // =================================================

    const normalizedOrders =
      (orders || []).map(
        (order: any) => {
          const customerSlot =
            Array.isArray(
              order.customer_slots
            )
              ? order.customer_slots[0] ||
                null
              : order.customer_slots ||
                null;

          return {
            id: order.id,

            table_id:
              order.table_id,

            customer_slot_id:
              order.customer_slot_id,

            device_id:
              order.device_id,

            billing_session_id:
              order.billing_session_id,

            total:
              Number(
                order.total || 0
              ),

            status:
              order.status,

            created_at:
              order.created_at,

            table:
              Array.isArray(
                order.tables
              )
                ? order.tables[0] ||
                  null
                : order.tables ||
                  null,

            customer:
              customerSlot
                ? {
                    id:
                      customerSlot.id,

                    slot_code:
                      customerSlot.slot_code,

                    label:
                      customerSlot.label,

                    is_active:
                      customerSlot.is_active,
                  }
                : null,

            device:
              Array.isArray(
                order.devices
              )
                ? order.devices[0] ||
                  null
                : order.devices ||
                  null,

            order_items:
              Array.isArray(
                order.order_items
              )
                ? order.order_items.map(
                    (item: any) => ({
                      id:
                        item.id,

                      name:
                        item.name,

                      price:
                        Number(
                          item.price || 0
                        ),

                      quantity:
                        Number(
                          item.quantity || 0
                        ),
                    })
                  )
                : [],
          };
        }
      );

    // =================================================
    // RESPONSE
    // =================================================

    return Response.json(
      {
        restaurant,

        orders:
          normalizedOrders,

        /*
         * PERSISTENT COUNT
         *
         * This does NOT disappear
         * when Done is clicked.
         */
        customerOrderCount,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Order details API error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to load order details",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH
//
// DONE BUTTON
//
// Closes the complete billing session.
// =====================================================

export async function PATCH(
  req: NextRequest
) {
  try {
    const body =
      await req.json();

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    const billingSessionId =
      typeof body.billingSessionId ===
      "string"
        ? body.billingSessionId.trim()
        : "";

    if (
      !slug ||
      !billingSessionId
    ) {
      return Response.json(
        {
          error:
            "Invalid billing session",
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminSupabase();

    // =================================================
    // RESTAURANT
    // =================================================

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
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
        { status: 404 }
      );
    }

    // =================================================
    // VERIFY SESSION
    // =================================================

    const {
      data: session,
      error: sessionError,
    } = await supabase
      .from("billing_sessions")
      .select(
        "id,restaurant_id,status"
      )
      .eq(
        "id",
        billingSessionId
      )
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .single();

    if (
      sessionError ||
      !session
    ) {
      return Response.json(
        {
          error:
            "Billing session not found",
        },
        { status: 404 }
      );
    }

    if (
      session.status ===
      "CLOSED"
    ) {
      return Response.json({
        success: true,
        alreadyClosed: true,
      });
    }

    // =================================================
    // CLOSE BILLING SESSION
    // =================================================

    const {
      error: closeError,
    } = await supabase
      .from("billing_sessions")
      .update({
        status: "CLOSED",

        closed_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        billingSessionId
      )
      .eq(
        "restaurant_id",
        restaurant.id
      );

    if (closeError) {
      console.error(
        "Billing session close error:",
        closeError
      );

      return Response.json(
        {
          error:
            "Failed to close bill",
        },
        { status: 500 }
      );
    }

    // =================================================
    // MARK ORDERS SERVED
    // =================================================

    const {
      error:
        ordersUpdateError,
    } = await supabase
      .from("orders")
      .update({
        status: "SERVED",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "billing_session_id",
        billingSessionId
      )
      .eq(
        "restaurant_id",
        restaurant.id
      );

    if (ordersUpdateError) {
      console.error(
        "Orders update error:",
        ordersUpdateError
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Billing session PATCH error:",
      error
    );

    return Response.json(
      {
        error:
          "Unable to complete bill",
      },
      { status: 500 }
    );
  }
}