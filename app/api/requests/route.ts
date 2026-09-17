import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing"
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

const ALLOWED_TYPES = [
  "TISSUE",
  "CUTLERY",
  "WATER",
  "EXTRA_FOOD",
  "CALL_WAITER",
  "OTHER",
] as const;

async function getCurrentUser() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function verifyRestaurantMember(
  restaurantId: string,
  userId: string
) {
  const supabase = getAdminSupabase();

  const { data: member, error } =
    await supabase
      .from("restaurant_members")
      .select("restaurant_id,user_id,role")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId)
      .maybeSingle();

  if (error || !member) {
    return false;
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| CUSTOMER → CREATE REQUEST
|--------------------------------------------------------------------------
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const restaurantId =
      body?.restaurant_id;

    const tableId =
      body?.table_id;

    const type = body?.type;

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : null;

    if (
      !restaurantId ||
      !tableId ||
      !type
    ) {
      return NextResponse.json(
        {
          error: "Invalid request",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_TYPES.includes(type)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request type",
        },
        { status: 400 }
      );
    }

    if (
      message &&
      message.length > 500
    ) {
      return NextResponse.json(
        {
          error:
            "Message is too long",
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminSupabase();

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select(
        "id,is_active"
      )
      .eq("id", restaurantId)
      .single();

    if (
      restaurantError ||
      !restaurant
    ) {
      return NextResponse.json(
        {
          error:
            "Restaurant not found",
        },
        { status: 404 }
      );
    }

    if (!restaurant.is_active) {
      return NextResponse.json(
        {
          error:
            "Restaurant unavailable",
        },
        { status: 403 }
      );
    }

    const {
      data: table,
      error: tableError,
    } = await supabase
      .from("tables")
      .select(
        "id,restaurant_id,is_active"
      )
      .eq("id", tableId)
      .eq(
        "restaurant_id",
        restaurantId
      )
      .single();

    if (
      tableError ||
      !table
    ) {
      return NextResponse.json(
        {
          error: "Invalid table",
        },
        { status: 400 }
      );
    }

    if (!table.is_active) {
      return NextResponse.json(
        {
          error:
            "Table unavailable",
        },
        { status: 400 }
      );
    }

    const {
      data: request,
      error: insertError,
    } = await supabase
      .from("customer_requests")
      .insert({
        restaurant_id:
          restaurantId,
        table_id: tableId,
        type,
        message:
          message || null,
        status: "PENDING",
      })
      .select(
        "id,type,message,status,created_at"
      )
      .single();

    if (insertError) {
      console.error(
        "Customer request insert error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Failed to send request",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        request,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Customer request error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to send request",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| KITCHEN → GET REQUESTS
|--------------------------------------------------------------------------
*/

export async function GET(req: Request) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const url =
      new URL(req.url);

    const restaurantId =
      url.searchParams.get(
        "restaurant_id"
      );

    if (!restaurantId) {
      return NextResponse.json(
        {
          error:
            "Restaurant ID is required",
        },
        { status: 400 }
      );
    }

    const isMember =
      await verifyRestaurantMember(
        restaurantId,
        user.id
      );

    if (!isMember) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const supabase =
      getAdminSupabase();

    const {
      data: requests,
      error,
    } = await supabase
      .from("customer_requests")
      .select(
        `
        id,
        restaurant_id,
        table_id,
        type,
        message,
        status,
        created_at,
        tables(name)
        `
      )
      .eq(
        "restaurant_id",
        restaurantId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(100);

    if (error) {
      console.error(
        "Customer requests GET error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to load requests",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      requests:
        requests || [],
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to load requests",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| KITCHEN → MARK REQUEST DONE
|--------------------------------------------------------------------------
*/

export async function PATCH(req: Request) {
  try {
    const user =
      await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const id = body?.id;

    const status = body?.status;

    if (!id || status !== "DONE") {
      return NextResponse.json(
        {
          error:
            "Invalid request",
        },
        { status: 400 }
      );
    }

    const supabase =
      getAdminSupabase();

    const {
      data: request,
      error: requestError,
    } = await supabase
      .from("customer_requests")
      .select(
        "id,restaurant_id,status"
      )
      .eq("id", id)
      .single();

    if (
      requestError ||
      !request
    ) {
      return NextResponse.json(
        {
          error:
            "Request not found",
        },
        { status: 404 }
      );
    }

    const isMember =
      await verifyRestaurantMember(
        request.restaurant_id,
        user.id
      );

    if (!isMember) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        { status: 403 }
      );
    }

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("customer_requests")
      .update({
        status: "DONE",
      })
      .eq("id", id)
      .select(
        "id,type,message,status,created_at"
      )
      .single();

    if (updateError) {
      console.error(
        "Customer request update error:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update request",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to update request",
      },
      { status: 500 }
    );
  }
}