"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

type OrderStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type Order = {
  id: string;
  status: OrderStatus;
  total: number | string | null;
  created_at: string;
  table_id?: string | null;
  tables?: { name: string } | null;
  order_items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number | string;
  }>;
};

type CustomerRequest = {
  id: string;
  type:
    | "TISSUE"
    | "CUTLERY"
    | "WATER"
    | "EXTRA_FOOD"
    | "CALL_WAITER"
    | "OTHER";
  message: string | null;
  status: "PENDING" | "DONE";
  created_at: string;
  table_id: string;
  tables?: { name: string } | null;
};

type OrderCounts = {
  today: number;
  week: number;
  month: number;
  overall: number;
};

const requestLabels: Record<CustomerRequest["type"], string> = {
  TISSUE: "Tissue needed",
  CUTLERY: "Cutlery needed",
  WATER: "Water needed",
  EXTRA_FOOD: "Extra food",
  CALL_WAITER: "Call waiter",
  OTHER: "Customer request",
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function shortOrderId(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

/**
 * Returns the start of today in the restaurant's expected timezone.
 *
 * Fexonic currently targets Indian restaurants, so the dashboard
 * uses Asia/Kolkata for business-day calculations.
 */
function getIndiaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const result: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
  };
}

/**
 * Converts an India calendar date/time into a UTC Date.
 *
 * Example:
 * 2026-09-21 00:00 IST
 * becomes
 * 2026-09-20 18:30 UTC
 */
function indiaDateToUTC(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return new Date(
    Date.UTC(year, month - 1, day, hour - 5, minute - 30, second),
  );
}

/**
 * Get business-period boundaries:
 *
 * todayStart
 * weekStart (Monday)
 * monthStart
 * tomorrowStart
 */
function getOrderPeriodBounds() {
  const now = new Date();
  const india = getIndiaDateParts(now);

  const todayStart = indiaDateToUTC(
    india.year,
    india.month,
    india.day,
  );

  const tomorrowDate = new Date(todayStart);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

  const monthStart = indiaDateToUTC(
    india.year,
    india.month,
    1,
  );

  /**
   * JavaScript:
   * Sunday = 0
   * Monday = 1
   * ...
   *
   * We want Monday as the beginning of the business week.
   */
  const weekday = new Date(todayStart).getUTCDay();

  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;

  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(
    weekStart.getUTCDate() - daysSinceMonday,
  );

  return {
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowDate.toISOString(),
    weekStart: weekStart.toISOString(),
    monthStart: monthStart.toISOString(),
  };
}

export default function KitchenDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);

  const [orderCounts, setOrderCounts] = useState<OrderCounts>({
    today: 0,
    week: 0,
    month: 0,
    overall: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [busyRequest, setBusyRequest] = useState<string | null>(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  const loadDashboard = useCallback(async () => {
    if (!slug) return;

    const supabase = supabaseBrowser();

    setRefreshing(true);

    try {
      /**
       * ------------------------------------------------------------
       * 1. Load restaurant
       * ------------------------------------------------------------
       */
      const {
        data: restaurantData,
        error: restaurantError,
      } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (restaurantError || !restaurantData) {
        router.replace("/kitchen");
        return;
      }

      setRestaurant(restaurantData);

      /**
       * ------------------------------------------------------------
       * 2. Load live dashboard data + order counts in parallel
       * ------------------------------------------------------------
       *
       * Live orders:
       * NEW / PREPARING / READY
       *
       * Historical counts:
       * Today / Week / Month / Overall
       *
       * The historical queries use COUNT on the database instead
       * of downloading every order into the browser.
       */
      const {
        todayStart,
        tomorrowStart,
        weekStart,
        monthStart,
      } = getOrderPeriodBounds();

      const [
        { data: orderData, error: orderError },
        { data: requestData, error: requestError },

        todayCountResult,
        weekCountResult,
        monthCountResult,
        overallCountResult,
      ] = await Promise.all([
        /**
         * Live orders
         */
        supabase
          .from("orders")
          .select(
            "id,status,total,created_at,table_id,tables(name),order_items(id,name,quantity,price)",
          )
          .eq("restaurant_id", restaurantData.id)
          .in("status", ["NEW", "PREPARING", "READY"])
          .order("created_at", { ascending: false })
          .limit(30),

        /**
         * Pending customer requests
         */
        supabase
          .from("customer_requests")
          .select(
            "id,type,message,status,created_at,table_id,tables(name)",
          )
          .eq("restaurant_id", restaurantData.id)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(20),

        /**
         * TODAY
         */
        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("restaurant_id", restaurantData.id)
          .gte("created_at", todayStart)
          .lt("created_at", tomorrowStart),

        /**
         * THIS WEEK
         */
        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("restaurant_id", restaurantData.id)
          .gte("created_at", weekStart),

        /**
         * THIS MONTH
         */
        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("restaurant_id", restaurantData.id)
          .gte("created_at", monthStart),

        /**
         * OVERALL
         */
        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("restaurant_id", restaurantData.id),
      ]);

      /**
       * ------------------------------------------------------------
       * Error handling
       * ------------------------------------------------------------
       */
      if (orderError) {
        throw orderError;
      }

      if (requestError) {
        throw requestError;
      }

      if (todayCountResult.error) {
        throw todayCountResult.error;
      }

      if (weekCountResult.error) {
        throw weekCountResult.error;
      }

      if (monthCountResult.error) {
        throw monthCountResult.error;
      }

      if (overallCountResult.error) {
        throw overallCountResult.error;
      }

      /**
       * ------------------------------------------------------------
       * Update state
       * ------------------------------------------------------------
       */
      setOrders(orderData || []);
      setRequests(requestData || []);

      setOrderCounts({
        today: todayCountResult.count || 0,
        week: weekCountResult.count || 0,
        month: monthCountResult.count || 0,
        overall: overallCountResult.count || 0,
      });
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, slug]);

  /**
   * Initial dashboard load
   */
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /**
   * Auto refresh.
   *
   * This keeps the existing 8-second dashboard refresh behavior.
   */
  useEffect(() => {
    if (!restaurant?.id) return;

    const interval = window.setInterval(
      loadDashboard,
      8000,
    );

    return () => window.clearInterval(interval);
  }, [loadDashboard, restaurant?.id]);

  /**
   * ------------------------------------------------------------
   * Update order status
   * ------------------------------------------------------------
   */
  async function updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    if (!restaurant?.id) return;

    setBusyOrder(orderId);

    try {
      const { error } = await supabaseBrowser()
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .eq("restaurant_id", restaurant.id);

      if (error) {
        throw error;
      }

      /**
       * Refresh both live orders and historical counters.
       */
      await loadDashboard();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "Could not update order status",
      );
    } finally {
      setBusyOrder(null);
    }
  }

  /**
   * ------------------------------------------------------------
   * Complete customer request
   * ------------------------------------------------------------
   */
  async function completeRequest(requestId: string) {
    setBusyRequest(requestId);

    try {
      const response = await fetch(
        "/api/requests",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: requestId,
            status: "DONE",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not complete request",
        );
      }

      await loadDashboard();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "Could not complete request",
      );
    } finally {
      setBusyRequest(null);
    }
  }

  /**
   * ------------------------------------------------------------
   * Live dashboard stats
   * ------------------------------------------------------------
   */
  const stats = useMemo(() => {
    const newOrders = orders.filter(
      (order) => order.status === "NEW",
    ).length;

    const preparing = orders.filter(
      (order) => order.status === "PREPARING",
    ).length;

    const ready = orders.filter(
      (order) => order.status === "READY",
    ).length;

    return {
      newOrders,
      preparing,
      ready,
      requests: requests.length,
    };
  }, [orders, requests]);

  /**
   * Navigate inside kitchen workspace.
   */
  const go = (path: string) => {
    setMobileMenu(false);
    router.push(path);
  };

  /**
   * ------------------------------------------------------------
   * Loading state
   * ------------------------------------------------------------
   */
  if (loading && !restaurant) {
    return (
      <main className="fx-app">
        <div className="fx-loading-screen">
          <div className="fx-loading-card">
            <div className="fx-logo-mark">
              F
            </div>

            <strong>
              Fexonic Kitchen
            </strong>

            <p>
              Preparing your workspace…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <main className="fx-app">
      {/* =========================================================
          DESKTOP SIDEBAR
      ========================================================== */}
      <aside className="fx-sidebar">
        <div className="fx-sidebar-brand">
          <div className="fx-brand-mark">
            F
          </div>

          <div>
            <strong>Fexonic</strong>
            <span>
              Kitchen workspace
            </span>
          </div>
        </div>

        <div className="fx-restaurant-mini">
          <span className="fx-avatar">
            {String(
              restaurant.name || "R",
            )
              .slice(0, 1)
              .toUpperCase()}
          </span>

          <div>
            <strong>
              {restaurant.name}
            </strong>

            <span>
              Restaurant workspace
            </span>
          </div>
        </div>

        <nav className="fx-sidebar-nav">
          <button
            className="active"
            onClick={() =>
              go(`/k/${slug}`)
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/orders`)
            }
          >
            <span>▤</span>
            Orders

            {stats.newOrders > 0 && (
              <b>{stats.newOrders}</b>
            )}
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/requests`)
            }
          >
            <span>♧</span>
            Requests

            {stats.requests > 0 && (
              <b>{stats.requests}</b>
            )}
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/manage`)
            }
          >
            <span>▦</span>
            Menu & Tables
          </button>
        </nav>

        <div className="fx-sidebar-bottom">
          <button
            onClick={() =>
              go(`/k/${slug}/manage`)
            }
          >
            <span>⚙</span>
            Manage workspace
          </button>

          <a
            href="/api/auth/signout"
            className="fx-sidebar-logout"
          >
            <span>↪</span>
            Sign out
          </a>
        </div>
      </aside>

      {/* =========================================================
          MOBILE DRAWER
      ========================================================== */}
      {mobileMenu && (
        <div
          className="fx-mobile-overlay"
          onClick={() =>
            setMobileMenu(false)
          }
        >
          <aside
            className="fx-mobile-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="fx-drawer-top">
              <div>
                <strong>
                  {restaurant.name}
                </strong>

                <span>
                  Powered by Fexonic
                </span>
              </div>

              <button
                onClick={() =>
                  setMobileMenu(false)
                }
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="fx-drawer-links">
              <button
                onClick={() =>
                  go(`/k/${slug}`)
                }
              >
                ⌂ Dashboard
              </button>

              <button
                onClick={() =>
                  go(`/k/${slug}/orders`)
                }
              >
                ▤ Orders
              </button>

              <button
                onClick={() =>
                  go(`/k/${slug}/requests`)
                }
              >
                ♧ Requests
              </button>

              <button
                onClick={() =>
                  go(`/k/${slug}/manage`)
                }
              >
                ▦ Menu & Tables
              </button>
            </div>

            <a
              href="/api/auth/signout"
              className="fx-drawer-logout"
            >
              ↪ Sign out
            </a>
          </aside>
        </div>
      )}

      {/* =========================================================
          MAIN
      ========================================================== */}
      <div className="fx-main">
        {/* =======================================================
            TOP BAR
        ======================================================== */}
        <header className="fx-topbar">
          <div className="fx-topbar-title">
            <span className="fx-mobile-brand">
              FEXONIC
            </span>

            <span className="fx-desktop-context">
              Kitchen workspace / Dashboard
            </span>
          </div>

          <div className="fx-topbar-actions">
            <button
              className="fx-round-button"
              onClick={loadDashboard}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              {refreshing ? "…" : "↻"}
            </button>

            <button
              className="fx-round-button fx-mobile-only"
              onClick={() =>
                setMobileMenu(true)
              }
              aria-label="Open menu"
            >
              ☰
            </button>

            <a
              className="fx-topbar-profile"
              href="/api/auth/signout"
            >
              <span className="fx-avatar">
                {String(
                  restaurant.name || "R",
                )
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <span>
                <strong>
                  {restaurant.name}
                </strong>

                <small>
                  Restaurant
                </small>
              </span>
            </a>
          </div>
        </header>

        <div className="fx-content">
          {/* =====================================================
              WELCOME
          ====================================================== */}
          <section className="fx-welcome-row">
            <div>
              <p className="fx-kicker">
                KITCHEN DASHBOARD
              </p>

              <h1>
                Good morning<span>.</span>
              </h1>

              <p className="fx-muted">
                Keep orders moving and your
                guests happy.
              </p>
            </div>

            <div className="fx-date-block">
              <strong>
                {new Date().toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "long",
                  },
                )}
              </strong>

              <span>
                {new Date().toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </span>

              <small>
                {new Date().toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </small>
            </div>
          </section>

          {/* =====================================================
              ACTION NEEDED
          ====================================================== */}
          <section className="fx-action-card">
            <div className="fx-action-icon">
              !
            </div>

            <div className="fx-action-content">
              <span className="fx-action-label">
                ACTION NEEDED
              </span>

              <strong>
                {stats.newOrders} new{" "}
                {stats.newOrders === 1
                  ? "order"
                  : "orders"}
              </strong>

              <span>
                {stats.requests} pending
                customer{" "}
                {stats.requests === 1
                  ? "request"
                  : "requests"}
              </span>
            </div>

            <button
              className="fx-arrow-button"
              onClick={() =>
                go(`/k/${slug}/orders`)
              }
              aria-label="View orders"
            >
              →
            </button>

            <button
              className="fx-action-link"
              onClick={() =>
                go(`/k/${slug}/orders`)
              }
            >
              View orders
            </button>
          </section>

          {/* =====================================================
              LIVE STATUS STATS
          ====================================================== */}
          <section className="fx-stat-grid">
            <button
              className="fx-stat-card fx-stat-blue"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=NEW`,
                )
              }
            >
              <span>◫</span>

              <small>
                New orders
              </small>

              <strong>
                {stats.newOrders}
              </strong>
            </button>

            <button
              className="fx-stat-card fx-stat-orange"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=PREPARING`,
                )
              }
            >
              <span>♨</span>

              <small>
                Preparing
              </small>

              <strong>
                {stats.preparing}
              </strong>
            </button>

            <button
              className="fx-stat-card fx-stat-green"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=READY`,
                )
              }
            >
              <span>✓</span>

              <small>
                Ready
              </small>

              <strong>
                {stats.ready}
              </strong>
            </button>

            <button
              className="fx-stat-card fx-stat-purple"
              onClick={() =>
                go(
                  `/k/${slug}/requests`,
                )
              }
            >
              <span>♧</span>

              <small>
                Requests
              </small>

              <strong>
                {stats.requests}
              </strong>
            </button>
          </section>

          {/* =====================================================
              ORDER ANALYTICS
          ====================================================== */}
          <section className="fx-section-heading">
            <div>
              <p className="fx-kicker">
                ORDER ANALYTICS
              </p>

              <h2>
                Orders overview
              </h2>
            </div>
          </section>

          <section className="fx-stat-grid">
            {/* TODAY */}
            <div className="fx-stat-card fx-stat-blue">
              <span>◷</span>

              <small>
                Orders today
              </small>

              <strong>
                {orderCounts.today}
              </strong>

              <em>
                Since midnight
              </em>
            </div>

            {/* WEEK */}
            <div className="fx-stat-card fx-stat-orange">
              <span>▥</span>

              <small>
                Orders this week
              </small>

              <strong>
                {orderCounts.week}
              </strong>

              <em>
                Monday → today
              </em>
            </div>

            {/* MONTH */}
            <div className="fx-stat-card fx-stat-green">
              <span>▦</span>

              <small>
                Orders this month
              </small>

              <strong>
                {orderCounts.month}
              </strong>

              <em>
                Current month
              </em>
            </div>

            {/* OVERALL */}
            <div className="fx-stat-card fx-stat-purple">
              <span>∞</span>

              <small>
                Overall orders
              </small>

              <strong>
                {orderCounts.overall}
              </strong>

              <em>
                All time
              </em>
            </div>
          </section>

          {/* =====================================================
              DASHBOARD GRID
          ====================================================== */}
          <div className="fx-dashboard-grid">
            {/* ===================================================
                PRIMARY COLUMN
            ==================================================== */}
            <div className="fx-primary-column">
              <section className="fx-section-heading">
                <div>
                  <p className="fx-kicker">
                    LIVE OPERATIONS
                  </p>

                  <h2>
                    Recent orders
                  </h2>
                </div>

                <button
                  className="fx-text-button"
                  onClick={() =>
                    go(`/k/${slug}/orders`)
                  }
                >
                  View all →
                </button>
              </section>

              <section className="fx-order-list">
                {orders.length === 0 ? (
                  <div className="fx-empty-card">
                    <div className="fx-empty-icon">
                      ✓
                    </div>

                    <strong>
                      All clear for now
                    </strong>

                    <p className="fx-muted">
                      New customer orders will
                      appear here.
                    </p>
                  </div>
                ) : (
                  orders
                    .slice(0, 6)
                    .map((order) => (
                      <article
                        className="fx-order-card"
                        key={order.id}
                      >
                        <div className="fx-order-topline">
                          <span
                            className={`fx-status fx-status-${order.status.toLowerCase()}`}
                          >
                            {
                              statusLabels[
                                order.status
                              ]
                            }
                          </span>

                          <span className="fx-order-time">
                            {formatTime(
                              order.created_at,
                            )}
                          </span>
                        </div>

                        <div className="fx-order-mainline">
                          <div>
                            <h3>
                              {order.tables
                                ?.name ||
                                "Table"}
                            </h3>

                            <p>
                              {shortOrderId(
                                order.id,
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                order.created_at,
                              )}
                            </p>
                          </div>

                          <strong>
                            ₹
                            {Number(
                              order.total || 0,
                            ).toFixed(0)}
                          </strong>
                        </div>

                        <ul className="fx-order-items">
                          {(
                            order.order_items ||
                            []
                          )
                            .slice(0, 4)
                            .map((item) => (
                              <li
                                key={item.id}
                              >
                                <span>
                                  {
                                    item.quantity
                                  }{" "}
                                  ×{" "}
                                  {item.name}
                                </span>

                                <span>
                                  ₹
                                  {(
                                    Number(
                                      item.price,
                                    ) *
                                    item.quantity
                                  ).toFixed(0)}
                                </span>
                              </li>
                            ))}
                        </ul>

                        <div className="fx-order-actions">
                          {/* NEW */}
                          {order.status ===
                            "NEW" && (
                            <>
                              <button
                                className="fx-button fx-button-light"
                                disabled={
                                  busyOrder ===
                                  order.id
                                }
                                onClick={() =>
                                  updateOrderStatus(
                                    order.id,
                                    "CANCELLED",
                                  )
                                }
                              >
                                Reject
                              </button>

                              <button
                                className="fx-button fx-button-dark"
                                disabled={
                                  busyOrder ===
                                  order.id
                                }
                                onClick={() =>
                                  updateOrderStatus(
                                    order.id,
                                    "PREPARING",
                                  )
                                }
                              >
                                Accept order
                              </button>
                            </>
                          )}

                          {/* PREPARING */}
                          {order.status ===
                            "PREPARING" && (
                            <button
                              className="fx-button fx-button-dark fx-button-full"
                              disabled={
                                busyOrder ===
                                order.id
                              }
                              onClick={() =>
                                updateOrderStatus(
                                  order.id,
                                  "READY",
                                )
                              }
                            >
                              Mark as ready →
                            </button>
                          )}

                          {/* READY */}
                          {order.status ===
                            "READY" && (
                            <button
                              className="fx-button fx-button-dark fx-button-full"
                              disabled={
                                busyOrder ===
                                order.id
                              }
                              onClick={() =>
                                updateOrderStatus(
                                  order.id,
                                  "SERVED",
                                )
                              }
                            >
                              Mark as served ✓
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                )}
              </section>
            </div>

            {/* ===================================================
                SECONDARY COLUMN
            ==================================================== */}
            <aside className="fx-secondary-column">
              <section className="fx-section-heading">
                <div>
                  <p className="fx-kicker">
                    CUSTOMER SUPPORT
                  </p>

                  <h2>
                    Requests
                  </h2>
                </div>

                <button
                  className="fx-text-button"
                  onClick={() =>
                    go(
                      `/k/${slug}/requests`,
                    )
                  }
                >
                  View all →
                </button>
              </section>

              <section className="fx-request-list">
                {requests.length === 0 ? (
                  <div className="fx-empty-card fx-empty-card-small">
                    <strong>
                      No pending requests
                    </strong>

                    <p className="fx-muted">
                      You are all caught up.
                    </p>
                  </div>
                ) : (
                  requests
                    .slice(0, 5)
                    .map((request) => (
                      <article
                        className="fx-request-card"
                        key={request.id}
                      >
                        <div className="fx-request-icon">
                          ♧
                        </div>

                        <div className="fx-request-content">
                          <strong>
                            {request.tables
                              ?.name ||
                              "Table"}
                          </strong>

                          <span>
                            {
                              requestLabels[
                                request.type
                              ]
                            }
                          </span>

                          {request.message && (
                            <small>
                              {
                                request.message
                              }
                            </small>
                          )}
                        </div>

                        <div className="fx-request-actions">
                          <span>
                            {formatTime(
                              request.created_at,
                            )}
                          </span>

                          <button
                            className="fx-button fx-button-dark"
                            disabled={
                              busyRequest ===
                              request.id
                            }
                            onClick={() =>
                              completeRequest(
                                request.id,
                              )
                            }
                          >
                            Done
                          </button>
                        </div>
                      </article>
                    ))
                )}
              </section>

              {/* =================================================
                  SHIFT OVERVIEW
              ================================================== */}
              <section className="fx-overview-card">
                <p className="fx-kicker">
                  TODAY’S OVERVIEW
                </p>

                <h2>
                  Stay on top of the shift
                </h2>

                <div className="fx-overview-metrics">
                  <div>
                    <strong>
                      {orderCounts.today}
                    </strong>

                    <span>
                      Orders today
                    </span>
                  </div>

                  <div>
                    <strong>
                      {orders.length}
                    </strong>

                    <span>
                      Open orders
                    </span>
                  </div>

                  <div>
                    <strong>
                      {requests.length}
                    </strong>

                    <span>
                      Open requests
                    </span>
                  </div>
                </div>
              </section>

              {/* =================================================
                  ORDER COUNT SUMMARY
              ================================================== */}
              <section className="fx-overview-card">
                <p className="fx-kicker">
                  BUSINESS OVERVIEW
                </p>

                <h2>
                  Order activity
                </h2>

                <div className="fx-overview-metrics">
                  <div>
                    <strong>
                      {orderCounts.week}
                    </strong>

                    <span>
                      This week
                    </span>
                  </div>

                  <div>
                    <strong>
                      {orderCounts.month}
                    </strong>

                    <span>
                      This month
                    </span>
                  </div>

                  <div>
                    <strong>
                      {orderCounts.overall}
                    </strong>

                    <span>
                      All time
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>

        {/* =======================================================
            MOBILE BOTTOM NAV
        ======================================================== */}
        <nav
          className="fx-bottom-nav"
          aria-label="Kitchen navigation"
        >
          <button
            className="active"
            onClick={() =>
              go(`/k/${slug}`)
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/orders`)
            }
          >
            <span>▤</span>
            Orders
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/requests`)
            }
          >
            <span>♧</span>
            Requests
          </button>

          <button
            onClick={() =>
              go(`/k/${slug}/manage`)
            }
          >
            <span>▦</span>
            Manage
          </button>
        </nav>
      </div>
    </main>
  );
}