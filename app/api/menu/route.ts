import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const slug = url.searchParams.get("slug");
    const tableId = url.searchParams.get("table");

    if (!slug || !tableId) {
      return Response.json(
        { error: "Invalid QR link" },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    /*
     * First get the table.
     * table_id is unique, so this is a very fast lookup.
     * We also get the restaurant_id from the same query.
     */
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id,name,is_active,restaurant_id")
      .eq("id", tableId)
      .single();

    if (tableError || !table) {
      return Response.json(
        { error: "Table unavailable" },
        { status: 404 }
      );
    }

    if (!table.is_active) {
      return Response.json(
        { error: "Table unavailable" },
        { status: 404 }
      );
    }

    /*
     * Get restaurant and menu in parallel.
     * This removes unnecessary waiting between requests.
     */
    const [restaurantResult, menuResult] = await Promise.all([
      supabase
        .from("restaurants")
        .select("id,name,slug,description,is_active")
        .eq("id", table.restaurant_id)
        .eq("slug", slug)
        .single(),

      supabase
        .from("menu_items")
        .select(
          "id,name,description,price,image,is_available,category_id"
        )
        .eq("restaurant_id", table.restaurant_id)
        .eq("is_available", true)
        .order("created_at"),
    ]);

    const { data: restaurant, error: restaurantError } =
      restaurantResult;

    const { data: items, error: menuError } = menuResult;

    if (
      restaurantError ||
      !restaurant ||
      !restaurant.is_active
    ) {
      return Response.json(
        { error: "Restaurant unavailable" },
        { status: 404 }
      );
    }

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
        items: items || [],
      },
      {
        headers: {
          /*
           * Browser can reuse it briefly.
           * Vercel/CDN can cache it longer.
           */
          "Cache-Control":
            "public, max-age=5, s-maxage=30, stale-while-revalidate=120",

          "CDN-Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=120",
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