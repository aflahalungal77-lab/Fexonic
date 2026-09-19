"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type Stats = {
  orders: number;
  newOrders: number;
  preparingOrders: number;
  pendingRequests: number;
  menuItems: number;
  tables: number;
};

const EMPTY_STATS: Stats = {
  orders: 0,
  newOrders: 0,
  preparingOrders: 0,
  pendingRequests: 0,
  menuItems: 0,
  tables: 0,
};

export default function RestaurantDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [stats, setStats] =
    useState<Stats>(EMPTY_STATS);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Resolve slug
   */
  useEffect(() => {
    let mounted = true;

    params.then((value) => {
      if (mounted) {
        setSlug(value.slug);
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  /*
   * Load restaurant
   */
  const loadRestaurant =
    useCallback(async () => {
      if (!slug) return null;

      const supabase =
        supabaseBrowser();

      const {
        data,
        error,
      } = await supabase
        .from("restaurants")
        .select("id,name,slug")
        .eq("slug", slug)
        .single();

      if (error) {
        throw error;
      }

      setRestaurant(data);

      return data as Restaurant;
    }, [slug]);

  /*
   * Load lightweight dashboard stats.
   *
   * IMPORTANT:
   * We do NOT load the actual orders/menu/table
   * rows here.
   *
   * This keeps the dashboard fast even when the
   * restaurant has thousands of orders.
   */
  const loadStats =
    useCallback(
      async (restaurantId: string) => {
        const supabase =
          supabaseBrowser();

        const [
          ordersResult,
          newOrdersResult,
          preparingOrdersResult,
          requestsResult,
          menuResult,
          tablesResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            ),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            )
            .eq("status", "NEW"),

          supabase
            .from("orders")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            )
            .eq(
              "status",
              "PREPARING"
            ),

          supabase
            .from("customer_requests")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            )
            .eq(
              "status",
              "PENDING"
            ),

          supabase
            .from("menu_items")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            ),

          supabase
            .from("tables")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "restaurant_id",
              restaurantId
            ),
        ]);

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        if (newOrdersResult.error) {
          throw newOrdersResult.error;
        }

        if (
          preparingOrdersResult.error
        ) {
          throw preparingOrdersResult.error;
        }

        if (requestsResult.error) {
          throw requestsResult.error;
        }

        if (menuResult.error) {
          throw menuResult.error;
        }

        if (tablesResult.error) {
          throw tablesResult.error;
        }

        setStats({
          orders:
            ordersResult.count || 0,

          newOrders:
            newOrdersResult.count || 0,

          preparingOrders:
            preparingOrdersResult.count ||
            0,

          pendingRequests:
            requestsResult.count || 0,

          menuItems:
            menuResult.count || 0,

          tables:
            tablesResult.count || 0,
        });
      },
      []
    );

  /*
   * Initial page load
   */
  const loadDashboard =
    useCallback(async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError("");

        const restaurantData =
          await loadRestaurant();

        if (!restaurantData) {
          return;
        }

        await loadStats(
          restaurantData.id
        );
      } catch (error: any) {
        console.error(error);

        setError(
          error?.message ||
            "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }, [
      slug,
      loadRestaurant,
      loadStats,
    ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  /*
   * Loading
   */
  if (loading) {
    return (
      <main className="container">
        <header className="top">
          <div className="brand">
            FEXONIC
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">
            RESTAURANT WORKSPACE
          </div>

          <h1>
            Loading dashboard...
          </h1>

          <p className="muted">
            Preparing your restaurant
            workspace.
          </p>
        </section>
      </main>
    );
  }

  /*
   * Error / restaurant not found
   */
  if (error || !restaurant) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            marginTop: 60,
            textAlign: "center",
          }}
        >
          <div className="eyebrow">
            FEXONIC
          </div>

          <h2>
            Workspace unavailable
          </h2>

          <p className="muted">
            {error ||
              "Restaurant not found."}
          </p>

          <button
            className="btn"
            onClick={() =>
              void loadDashboard()
            }
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* HEADER */}

      <header className="top">
        <div>
          <div className="brand">
            FEXONIC
          </div>

          <div
            className="muted smalltext"
            style={{
              marginTop: 3,
            }}
          >
            Restaurant Workspace
          </div>
        </div>

        <div className="nav">
          <span className="pill">
            {restaurant.name}
          </span>

          <button
            className="btn light small"
            onClick={() =>
              void loadDashboard()
            }
          >
            Refresh
          </button>

          <a
            className="btn light small"
            href="/api/auth/signout"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="dashboard-hero">
        <div className="eyebrow">
          RESTAURANT WORKSPACE
        </div>

        <h1>
          {restaurant.name}
        </h1>

        <p className="muted">
          Manage your restaurant,
          receive orders and control
          your QR menu.
        </p>
      </section>

      {/* MAIN ACTIONS */}

      <section
        className="grid grid2"
        style={{
          marginTop: 20,
        }}
      >
        {/* ORDERS */}

        <a
          href={`/k/${restaurant.slug}/orders`}
          className="card"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            cursor: "pointer",
          }}
        >
          <div className="row">
            <div>
              <div className="eyebrow">
                LIVE OPERATIONS
              </div>

              <h2
                style={{
                  marginTop: 8,
                  marginBottom: 5,
                }}
              >
                Orders
              </h2>

              <p className="muted">
                View every customer
                order and customer
                request.
              </p>
            </div>

            <span
              style={{
                fontSize: 32,
              }}
            >
              →
            </span>
          </div>

          <div
            className="grid grid3"
            style={{
              marginTop: 20,
            }}
          >
            <div>
              <div className="muted smalltext">
                Total
              </div>

              <strong
                style={{
                  fontSize: 24,
                }}
              >
                {stats.orders}
              </strong>
            </div>

            <div>
              <div className="muted smalltext">
                New
              </div>

              <strong
                style={{
                  fontSize: 24,
                }}
              >
                {stats.newOrders}
              </strong>
            </div>

            <div>
              <div className="muted smalltext">
                Requests
              </div>

              <strong
                style={{
                  fontSize: 24,
                }}
              >
                {stats.pendingRequests}
              </strong>
            </div>
          </div>
        </a>

        {/* MENU */}

        <a
          href={`/k/${restaurant.slug}/manage`}
          className="card"
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            cursor: "pointer",
          }}
        >
          <div className="row">
            <div>
              <div className="eyebrow">
                MANAGEMENT
              </div>

              <h2
                style={{
                  marginTop: 8,
                  marginBottom: 5,
                }}
              >
                Menu & QR
              </h2>

              <p className="muted">
                Manage food items,
                tables and QR codes.
              </p>
            </div>

            <span
              style={{
                fontSize: 32,
              }}
            >
              →
            </span>
          </div>

          <div
            className="grid grid2"
            style={{
              marginTop: 20,
            }}
          >
            <div>
              <div className="muted smalltext">
                Menu items
              </div>

              <strong
                style={{
                  fontSize: 24,
                }}
              >
                {stats.menuItems}
              </strong>
            </div>

            <div>
              <div className="muted smalltext">
                Tables
              </div>

              <strong
                style={{
                  fontSize: 24,
                }}
              >
                {stats.tables}
              </strong>
            </div>
          </div>
        </a>
      </section>

      {/* LIVE SUMMARY */}

      <section
        className="card dashboard-section"
      >
        <div className="eyebrow">
          TODAY'S WORKSPACE
        </div>

        <h2
          style={{
            marginTop: 8,
          }}
        >
          Quick overview
        </h2>

        <div
          className="grid grid4"
          style={{
            marginTop: 20,
          }}
        >
          <div className="stat">
            <span className="muted smalltext">
              All orders
            </span>

            <strong>
              {stats.orders}
            </strong>
          </div>

          <div className="stat">
            <span className="muted smalltext">
              New orders
            </span>

            <strong>
              {stats.newOrders}
            </strong>
          </div>

          <div className="stat">
            <span className="muted smalltext">
              Preparing
            </span>

            <strong>
              {stats.preparingOrders}
            </strong>
          </div>

          <div className="stat">
            <span className="muted smalltext">
              Pending requests
            </span>

            <strong>
              {stats.pendingRequests}
            </strong>
          </div>
        </div>
      </section>

      {/* IMPORTANT NOTICE */}

      {(stats.newOrders > 0 ||
        stats.pendingRequests > 0) && (
        <section
          className="card dashboard-section"
          style={{
            border:
              "1px solid var(--ink)",
          }}
        >
          <div className="eyebrow">
            ACTION NEEDED
          </div>

          <h2
            style={{
              marginTop: 8,
            }}
          >
            You have new activity
          </h2>

          <p className="muted">
            {stats.newOrders > 0 &&
              `${stats.newOrders} new order${
                stats.newOrders === 1
                  ? ""
                  : "s"
              }`}

            {stats.newOrders > 0 &&
              stats.pendingRequests >
                0 &&
              " and "}

            {stats.pendingRequests >
              0 &&
              `${stats.pendingRequests} pending customer request${
                stats.pendingRequests === 1
                  ? ""
                  : "s"
              }`}
            .
          </p>

          <a
            className="btn"
            href={`/k/${restaurant.slug}/orders`}
          >
            Open Orders
          </a>
        </section>
      )}

      <footer className="footer">
        Fexonic · {restaurant.name}
      </footer>
    </main>
  );
}