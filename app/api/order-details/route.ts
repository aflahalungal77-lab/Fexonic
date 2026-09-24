import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/* =========================================================
   GET
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get("slug")?.trim();

    if (!slug) {
      return NextResponse.json(
        {
          error: "Restaurant slug is required",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       RESTAURANT
       ===================================================== */

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id, name, slug, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "Restaurant lookup error:",
        restaurantError
      );

      return NextResponse.json(
        {
          error: "Failed to load restaurant",
        },
        { status: 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          error: "Restaurant not found",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       ACTIVE BILLING SESSIONS
       ===================================================== */

    const {
      data: billingSessions,
      error: billingError,
    } = await supabase
      .from("billing_sessions")
      .select(
        "id, restaurant_id, table_id, status, created_at, closed_at"
      )
      .eq("restaurant_id", restaurant.id)
      .eq("status", "OPEN");

    if (billingError) {
      console.error(
        "Billing sessions error:",
        billingError
      );

      return NextResponse.json(
        {
          error: "Failed to load billing sessions",
        },
        { status: 500 }
      );
    }

    const sessionIds = (billingSessions || []).map(
      (session) => session.id
    );

    /* =====================================================
       ACTIVE ORDERS
       ===================================================== */

    let orders: any[] = [];

    if (sessionIds.length > 0) {
      const {
        data,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(`
          id,
          restaurant_id,
          table_id,
          customer_slot_id,
          device_id,
          billing_session_id,
          total,
          status,
          need,
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
            name,
            price,
            quantity
          )
        `)
        .eq("restaurant_id", restaurant.id)
        .in("billing_session_id", sessionIds)
        .order("created_at", {
          ascending: true,
        });

      if (ordersError) {
        console.error(
          "Orders query error:",
          ordersError
        );

        return NextResponse.json(
          {
            error: "Failed to load orders",
          },
          { status: 500 }
        );
      }

      orders = data || [];
    }

    /* =====================================================
       NORMALIZE ACTIVE ORDERS
       ===================================================== */

    const normalizedOrders = orders.map(
      (order) => ({
        id: order.id,

        table_id: order.table_id,

        customer_slot_id:
          order.customer_slot_id || null,

        device_id:
          order.device_id || null,

        billing_session_id:
          order.billing_session_id,

        total: Number(order.total || 0),

        status: order.status,

        need: order.need || null,

        created_at: order.created_at,

        table: Array.isArray(order.tables)
          ? order.tables[0] || null
          : order.tables || null,

        customer: Array.isArray(
          order.customer_slots
        )
          ? order.customer_slots[0] || null
          : order.customer_slots || null,

        device: Array.isArray(order.devices)
          ? order.devices[0] || null
          : order.devices || null,

        order_items: (
          order.order_items || []
        ).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 0),
        })),
      })
    );

    /* =====================================================
       HISTORICAL ORDERS
       ===================================================== */

    const {
      data: historicalOrders,
      error: historicalOrdersError,
    } = await supabase
      .from("orders")
      .select(
        "table_id,billing_session_id,customer_slot_id,created_at"
      )
      .eq("restaurant_id", restaurant.id)
      .not("billing_session_id", "is", null)
      .not("customer_slot_id", "is", null);

    if (historicalOrdersError) {
      console.error(
        "Historical customer count error:",
        historicalOrdersError
      );

      return NextResponse.json(
        {
          error:
            "Failed to calculate table customer count",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       TOTAL ORDERS BY TABLE
       =====================================================

       Customer is counted once per billing session.

       Example:

       Session 1:
       A, A, B = 2

       Session 2:
       A, B, C = 3

       Total = 5
    */

    const tableOrderCounts: Record<
      string,
      number
    > = {};

    const countedCustomers =
      new Set<string>();

    for (
      const order of historicalOrders || []
    ) {
      if (
        !order.table_id ||
        !order.billing_session_id ||
        !order.customer_slot_id
      ) {
        continue;
      }

      const uniqueKey =
        `${order.table_id}:${order.billing_session_id}:${order.customer_slot_id}`;

      if (
        countedCustomers.has(uniqueKey)
      ) {
        continue;
      }

      countedCustomers.add(uniqueKey);

      if (
        typeof tableOrderCounts[
          order.table_id
        ] !== "number"
      ) {
        tableOrderCounts[
          order.table_id
        ] = 0;
      }

      tableOrderCounts[
        order.table_id
      ] += 1;
    }

    const customerOrderCount =
      Object.values(
        tableOrderCounts
      ).reduce(
        (total, count) =>
          total + count,
        0
      );

    /* =====================================================
       DAILY ORDERS BY TABLE
       ===================================================== */

    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const tomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const dailyTableOrderCounts: Record<
      string,
      number
    > = {};

    const dailyCountedCustomers =
      new Set<string>();

    for (
      const order of historicalOrders || []
    ) {
      if (
        !order.table_id ||
        !order.billing_session_id ||
        !order.customer_slot_id ||
        !order.created_at
      ) {
        continue;
      }

      const createdAt = new Date(
        order.created_at
      );

      if (
        createdAt < todayStart ||
        createdAt >= tomorrowStart
      ) {
        continue;
      }

      const uniqueKey =
        `${order.table_id}:${order.billing_session_id}:${order.customer_slot_id}`;

      if (
        dailyCountedCustomers.has(
          uniqueKey
        )
      ) {
        continue;
      }

      dailyCountedCustomers.add(
        uniqueKey
      );

      if (
        typeof dailyTableOrderCounts[
          order.table_id
        ] !== "number"
      ) {
        dailyTableOrderCounts[
          order.table_id
        ] = 0;
      }

      dailyTableOrderCounts[
        order.table_id
      ] += 1;
    }

    const dailyCustomerOrderCount =
      Object.values(
        dailyTableOrderCounts
      ).reduce(
        (total, count) =>
          total + count,
        0
      );

    /* =====================================================
       MONTHLY ORDERS BY TABLE
       ===================================================== */

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const nextMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );

    const monthlyTableOrderCounts: Record<
      string,
      number
    > = {};

    const monthlyCountedCustomers =
      new Set<string>();

    for (
      const order of historicalOrders || []
    ) {
      if (
        !order.table_id ||
        !order.billing_session_id ||
        !order.customer_slot_id ||
        !order.created_at
      ) {
        continue;
      }

      const createdAt = new Date(
        order.created_at
      );

      if (
        createdAt < monthStart ||
        createdAt >= nextMonthStart
      ) {
        continue;
      }

      const uniqueKey =
        `${order.table_id}:${order.billing_session_id}:${order.customer_slot_id}`;

      if (
        monthlyCountedCustomers.has(
          uniqueKey
        )
      ) {
        continue;
      }

      monthlyCountedCustomers.add(
        uniqueKey
      );

      if (
        typeof monthlyTableOrderCounts[
          order.table_id
        ] !== "number"
      ) {
        monthlyTableOrderCounts[
          order.table_id
        ] = 0;
      }

      monthlyTableOrderCounts[
        order.table_id
      ] += 1;
    }

    const monthlyCustomerOrderCount =
      Object.values(
        monthlyTableOrderCounts
      ).reduce(
        (total, count) =>
          total + count,
        0
      );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        restaurant,

        orders: normalizedOrders,

        /* Existing total */
        customerOrderCount,

        /* Existing per-table total */
        tableOrderCounts,

        /* NEW daily */
        dailyCustomerOrderCount,

        dailyTableOrderCounts,

        /* NEW monthly */
        monthlyCustomerOrderCount,

        monthlyTableOrderCounts,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "Order details GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   CLOSE BILLING SESSION
   ========================================================= */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const slug = String(
      body?.slug || ""
    ).trim();

    const billingSessionId =
      String(
        body?.billingSessionId || ""
      ).trim();

    if (!slug) {
      return NextResponse.json(
        {
          error:
            "Restaurant slug is required",
        },
        { status: 400 }
      );
    }

    if (!billingSessionId) {
      return NextResponse.json(
        {
          error:
            "Billing session ID is required",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       RESTAURANT
       ===================================================== */

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id, name, slug, is_active"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (restaurantError) {
      console.error(
        "Restaurant lookup error:",
        restaurantError
      );

      return NextResponse.json(
        {
          error:
            "Failed to find restaurant",
        },
        { status: 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          error:
            "Restaurant not found",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       VERIFY BILLING SESSION
       ===================================================== */

    const {
      data: billingSession,
      error:
        billingSessionError,
    } = await supabase
      .from("billing_sessions")
      .select(
        "id, restaurant_id, table_id, status"
      )
      .eq("id", billingSessionId)
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .maybeSingle();

    if (billingSessionError) {
      console.error(
        "Billing session lookup error:",
        billingSessionError
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify billing session",
        },
        { status: 500 }
      );
    }

    if (!billingSession) {
      return NextResponse.json(
        {
          error:
            "Billing session not found",
        },
        { status: 404 }
      );
    }

    if (
      billingSession.status !==
      "OPEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Billing session is already closed",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       CLOSE SESSION
       ===================================================== */

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
        "Close billing session error:",
        closeError
      );

      return NextResponse.json(
        {
          error:
            "Failed to close billing session",
        },
        { status: 500 }
      );
    }

    /* =====================================================
       MARK SESSION ORDERS SERVED
       ===================================================== */

    const {
      error: servedError,
    } = await supabase
      .from("orders")
      .update({
        status: "SERVED",
      })
      .eq(
        "restaurant_id",
        restaurant.id
      )
      .eq(
        "billing_session_id",
        billingSessionId
      );

    if (servedError) {
      console.error(
        "Mark orders served error:",
        servedError
      );

      return NextResponse.json(
        {
          error:
            "Billing closed, but failed to update order status",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Billing session completed",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Order details PATCH error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal server error",
      },
      { status: 500 }
    );
  }
}