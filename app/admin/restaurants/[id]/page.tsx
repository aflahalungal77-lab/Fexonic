import { redirect, notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";

const ADMIN_EMAIL = "aflahalungal77@gmail.com";

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SERVICE_ROLE_KEY_MISSING");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export default async function AdminRestaurantDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await supabaseServer();

  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (
    user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  ) {
    redirect("/");
  }

  const { id } = await params;
  const db = adminDb();

  const { data: restaurant } = await db
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();

  if (!restaurant) {
    notFound();
  }

  const [{ data: orders }, { data: devices }, { data: items }] =
    await Promise.all([
      db
        .from("orders")
        .select("id,status,total,created_at")
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false })
        .limit(5000),

      db
        .from("devices")
        .select(
          "id,name,kind,last_seen_at,created_at"
        )
        .eq("restaurant_id", id)
        .order("last_seen_at", {
          ascending: false,
        }),

      db
        .from("order_items")
        .select("name,quantity,price")
        .eq("restaurant_id", id)
        .limit(10000),
    ]);

  const allOrders = orders || [];

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const totalOrderValue = allOrders
    .filter((order) => order.status !== "CANCELLED")
    .reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

  const todayOrderValue = allOrders
    .filter(
      (order) =>
        now - new Date(order.created_at).getTime() < day &&
        order.status !== "CANCELLED"
    )
    .reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

  const weekOrderValue = allOrders
    .filter(
      (order) =>
        now - new Date(order.created_at).getTime() <
          7 * day &&
        order.status !== "CANCELLED"
    )
    .reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

  const monthOrderValue = allOrders
    .filter(
      (order) =>
        now - new Date(order.created_at).getTime() <
          30 * day &&
        order.status !== "CANCELLED"
    )
    .reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

  const itemsSold = (items || []).reduce(
    (sum, item) => sum + Number(item.quantity),
    0
  );

  const activeDevices = (devices || []).filter(
    (device) =>
      now -
        new Date(device.last_seen_at).getTime() <
      15 * 60 * 1000
  ).length;

  return (
    <main className="container">
      <header className="top">
        <a className="brand" href="/admin">
          FEXONIC ADMIN
        </a>

        <a className="btn light" href="/admin">
          Back
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">
          RESTAURANT OVERVIEW
        </div>

        <h1>{restaurant.name}</h1>

        <p className="muted">
          /{restaurant.slug} ·{" "}
          {restaurant.is_active ? "ACTIVE" : "INACTIVE"}
        </p>
      </section>

      <section className="grid grid4">
        <div className="card stat">
          <span className="muted smalltext">
            All-time order value
          </span>
          <strong>
            ₹{totalOrderValue.toFixed(0)}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Today
          </span>
          <strong>
            ₹{todayOrderValue.toFixed(0)}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            30 days
          </span>
          <strong>
            ₹{monthOrderValue.toFixed(0)}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Orders
          </span>
          <strong>{allOrders.length}</strong>
        </div>
      </section>

      <section className="grid grid3 dashboard-section">
        <div className="card stat">
          <span className="muted smalltext">
            Orders
          </span>
          <strong>{allOrders.length}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Items sold
          </span>
          <strong>{itemsSold}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Active devices
          </span>
          <strong>{activeDevices}</strong>
        </div>
      </section>

      <section className="grid grid2 dashboard-section">
        <div className="card">
          <div className="eyebrow">
            ORDER VALUE
          </div>

          <h2>Order value snapshot</h2>

          <div className="list">
            <div className="item">
              <div className="row">
                <span>Today</span>
                <b>
                  ₹{todayOrderValue.toFixed(2)}
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Last 7 days</span>
                <b>
                  ₹{weekOrderValue.toFixed(2)}
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Last 30 days</span>
                <b>
                  ₹{monthOrderValue.toFixed(2)}
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>All time</span>
                <b>
                  ₹{totalOrderValue.toFixed(2)}
                </b>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">
            ORDERS
          </div>

          <h2>Order activity</h2>

          <div className="list">
            <div className="item">
              <div className="row">
                <span>Total orders</span>
                <b>{allOrders.length}</b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>New</span>
                <b>
                  {
                    allOrders.filter(
                      (order) =>
                        order.status === "NEW"
                    ).length
                  }
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Preparing</span>
                <b>
                  {
                    allOrders.filter(
                      (order) =>
                        order.status === "PREPARING"
                    ).length
                  }
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Ready</span>
                <b>
                  {
                    allOrders.filter(
                      (order) =>
                        order.status === "READY"
                    ).length
                  }
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Served</span>
                <b>
                  {
                    allOrders.filter(
                      (order) =>
                        order.status === "SERVED"
                    ).length
                  }
                </b>
              </div>
            </div>

            <div className="item">
              <div className="row">
                <span>Cancelled</span>
                <b>
                  {
                    allOrders.filter(
                      (order) =>
                        order.status === "CANCELLED"
                    ).length
                  }
                </b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card dashboard-section">
        <div className="eyebrow">
          DEVICES
        </div>

        <h2>Ordering devices</h2>

        <div className="list">
          {(devices || []).length === 0 ? (
            <p className="muted">
              No devices recorded yet.
            </p>
          ) : (
            (devices || []).map((device) => {
              const online =
                now -
                  new Date(
                    device.last_seen_at
                  ).getTime() <
                15 * 60 * 1000;

              return (
                <div
                  className="item"
                  key={device.id}
                >
                  <div className="row">
                    <div>
                      <b>{device.name}</b>

                      <div className="muted smalltext">
                        {device.kind}
                      </div>
                    </div>

                    <span className="pill">
                      {online
                        ? "ONLINE"
                        : "OFFLINE"}
                    </span>
                  </div>

                  <p className="muted smalltext">
                    Last active:{" "}
                    {new Date(
                      device.last_seen_at
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}