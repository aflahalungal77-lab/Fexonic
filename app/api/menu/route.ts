import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zmoxqiggadqlbslfyfrzi.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminSupabase() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);

    const tableId = requestUrl.searchParams.get("table");

    if (!tableId) {
      return Response.json(
        { error: "Invalid QR link" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id,name,is_active,restaurant_id")
      .eq("id", tableId)
      .maybeSingle();

    if (tableError) {
      console.error("Table lookup error:", tableError);

      return Response.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    if (!table || !table.is_active) {
      return Response.json(
        { error: "Table unavailable" },
        { status: 404 }
      );
    }

    const { data: restaurant, error: restaurantError } =
      await supabase
        .from("restaurants")
        .select("id,name,slug,description,is_active")
        .eq("id", table.restaurant_id)
        .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant lookup error:", restaurantError);

      return Response.json(
        { error: "Failed to load restaurant" },
        { status: 500 }
      );
    }

    if (!restaurant || !restaurant.is_active) {
      return Response.json(
        { error: "Restaurant unavailable" },
        { status: 404 }
      );
    }

    const { data: items, error: menuError } = await supabase
      .from("menu_items")
      .select(
        "id,name,description,price,image,is_available,category_id"
      )
      .eq("restaurant_id", restaurant.id)
      .eq("is_available", true)
      .order("created_at", {
        ascending: true,
      });

    if (menuError) {
      console.error("Menu loading error:", menuError);

      return Response.json(
        { error: "Failed to load menu" },
        { status: 500 }
      );
    }

    return Response.json(
      {
        restaurant,
        table: {
          id: table.id,
          name: table.name,
          is_active: table.is_active,
        },
        items: items ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("Menu API error:", error);

    return Response.json(
      {
        error:
          error?.message || "Failed to load menu",
      },
      { status: 500 }
    );
  }
}