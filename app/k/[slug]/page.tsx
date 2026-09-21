"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  table_id: string | null;
  device_id?: string | null;
  tables?: {
    name: string;
  } | null;
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
  status: "PENDING" | "DONE";
  created_at: string;
  table_id: string;
  tables?: {
    name: string;
  } | null;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type IconName =
  | "home"
  | "orders"
  | "bell"
  | "table"
  | "menu"
  | "qr"
  | "staff"
  | "settings"
  | "reports"
  | "history"
  | "feedback"
  | "logout"
  | "arrow"
  | "document"
  | "chef"
  | "ready"
  | "people"
  | "close"
  | "menuDots"
  | "refresh";

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="M3 10.8 12 3l9 7.8" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),

    orders: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    table: (
      <>
        <path d="M4 7h16" />
        <path d="M6 7v13" />
        <path d="M18 7v13" />
        <path d="M3 20h18" />
        <path d="M7 4h10v3H7z" />
      </>
    ),

    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),

    qr: (
      <>
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <path d="M14 14h3v3h-3z" />
        <path d="M20 14v6" />
        <path d="M14 20h3" />
      </>
    ),

    staff: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3.2 2.6-5 6-5s6 1.8 6 5" />
        <path d="M15 15c3.2 0 5 1.6 5 4" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6.4v-2.6h.1A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1A1.7 1.7 0 0 0 19.4 10c.2.6.7 1 1.5 1h.1v2.6h-.1c-.8 0-1.3.5-1.5 1.4Z" />
      </>
    ),

    reports: (
      <>
        <path d="M5 20V10" />
        <path d="M12 20V4" />
        <path d="M19 20v-7" />
      </>
    ),

    history: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
        <path d="M4 5v4h4" />
      </>
    ),

    feedback: (
      <>
        <path d="M5 5h14v11H9l-4 4z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>
    ),

    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),

    document: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h3" />
      </>
    ),

    chef: (
      <>
        <path d="M7 11h10v9H7z" />
        <path d="M5 11h14" />
        <path d="M7 11a4 4 0 1 1 2-7 4 4 0 0 1 6 0 4 4 0 1 1 2 7" />
      </>
    ),

    ready: (
      <>
        <path d="M5 17h14" />
        <path d="M7 17a5 5 0 0 1 10 0" />
        <path d="M4 21h16" />
      </>
    ),

    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
        <path d="M15 15c3 0 5 1.5 5 4" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    menuDots: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.5-4L4 9" />
        <path d="M4 5v4h4" />
        <path d="M4 13a8 8 0 0 0 14.5 4L20 15" />
        <path d="M20 19v-4h-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function sameDay(date: string) {
  const a = new Date(date);
  const b = new Date();

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatCurrentTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function KitchenDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);

  const [todayOrders, setTodayOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    params.then((value) => {
      setSlug(value.slug);
    });
  }, [params]);

  const loadDashboard = useCallback(async () => {
    if (!slug) return;

    const supabase = supabaseBrowser();

    setRefreshing(true);

    try {
      const { data: restaurantData, error: restaurantError } =
        await supabase
          .from("restaurants")
          .select("id,name,slug")
          .eq("slug", slug)
          .single();

      if (restaurantError || !restaurantData) {
        router.replace("/kitchen");
        return;
      }

      setRestaurant(restaurantData);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          "id,status,total,created_at,table_id,device_id,tables(name)"
        )
        .eq("restaurant_id", restaurantData.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (orderError) throw orderError;

      const { data: requestData, error: requestError } =
        await supabase
          .from("customer_requests")
          .select("id,type,status,created_at,table_id,tables(name)")
          .eq("restaurant_id", restaurantData.id)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(100);

      if (requestError) throw requestError;

      const allOrders = (orderData || []) as Order[];

      setOrders(allOrders);
      setRequests((requestData || []) as CustomerRequest[]);

      setTodayOrders(
        allOrders.filter((order) => sameDay(order.created_at))
      );
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, slug]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /*
   * Polling fallback.
   * This keeps the dashboard live even when Supabase Realtime
   * is not enabled in the project.
   */
  useEffect(() => {
    if (!restaurant?.id) return;

    const interval = window.setInterval(() => {
      loadDashboard();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [loadDashboard, restaurant?.id]);

  /*
   * Optional Realtime listener.
   * If Realtime is enabled in Supabase, changes appear immediately.
   * Polling remains as a fallback.
   */
  useEffect(() => {
    if (!restaurant?.id) return;

    const supabase = supabaseBrowser();

    const channel = supabase
      .channel(`kitchen-dashboard-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_requests",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, loadDashboard]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.status === "NEW" ||
        order.status === "PREPARING" ||
        order.status === "READY"
    );

    const newOrders = orders.filter(
      (order) => order.status === "NEW"
    );

    const preparing = orders.filter(
      (order) => order.status === "PREPARING"
    );

    const ready = orders.filter(
      (order) => order.status === "READY"
    );

    const nonCancelledToday = todayOrders.filter(
      (order) => order.status !== "CANCELLED"
    );

    const totalSales = nonCancelledToday.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    /*
     * Orders created from the same browser/device are counted
     * as one customer when device_id is available.
     */
    const deviceCustomers = new Set(
      todayOrders
        .map((order) => order.device_id)
        .filter(Boolean)
    );

    const customers =
      deviceCustomers.size > 0
        ? deviceCustomers.size
        : todayOrders.length;

    const newOrderTables = [
      ...new Set(
        newOrders.map(
          (order) => order.tables?.name || "Table"
        )
      ),
    ];

    return {
      activeOrders: activeOrders.length,
      newOrders: newOrders.length,
      preparing: preparing.length,
      ready: ready.length,
      requests: requests.length,
      totalOrders: todayOrders.length,
      customers,
      totalSales,
      newOrderTables,
    };
  }, [orders, requests, todayOrders]);

  const go = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const openOrders = () => {
    go(`/k/${slug}/orders`);
  };

  const openRequests = () => {
    go(`/k/${slug}/requests`);
  };

  const openTables = () => {
    go(`/k/${slug}/manage`);
  };

  if (loading && !restaurant) {
    return (
      <main className="fx-kitchen-root">
        <div className="fx-loading-screen">
          <div className="fx-loading-mark">F</div>
          <strong>FEXONIC</strong>
          <span>Preparing kitchen workspace…</span>
        </div>
      </main>
    );
  }

  if (!restaurant) return null;

  return (
    <main className="fx-kitchen-root">
      {/* =========================================================
          MOBILE / TABLET DRAWER
      ========================================================== */}

      {drawerOpen && (
        <button
          type="button"
          className="fx-drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside
        className={`fx-navigation-drawer ${
          drawerOpen ? "is-open" : ""
        }`}
      >
        <div className="fx-drawer-header">
          <div>
            <strong>{restaurant.name}</strong>
            <span>Restaurant Workspace</span>
          </div>

          <button
            type="button"
            className="fx-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="fx-drawer-scroll">
          <NavigationSection
            title="WORKSPACE"
            items={[
              {
                label: "Dashboard",
                icon: "home",
                active: true,
                onClick: () => go(`/k/${slug}`),
              },
              {
                label: "Orders",
                icon: "orders",
                badge: stats.newOrders,
                onClick: openOrders,
              },
              {
                label: "Requests",
                icon: "bell",
                badge: stats.requests,
                onClick: openRequests,
              },
              {
                label: "Tables",
                icon: "table",
                onClick: openTables,
              },
            ]}
          />

          <NavigationSection
            title="MANAGEMENT"
            items={[
              {
                label: "Menu",
                icon: "menu",
                onClick: openTables,
              },
              {
                label: "Tables & QR",
                icon: "qr",
                onClick: openTables,
              },
              {
                label: "Staff",
                icon: "staff",
                onClick: () => {},
              },
              {
                label: "Settings",
                icon: "settings",
                onClick: () => {},
              },
            ]}
          />

          <NavigationSection
            title="BUSINESS"
            items={[
              {
                label: "Reports",
                icon: "reports",
                onClick: () => {},
              },
              {
                label: "Order History",
                icon: "history",
                onClick: openOrders,
              },
              {
                label: "Feedback",
                icon: "feedback",
                onClick: () => {},
              },
            ]}
          />
        </div>

        <div className="fx-drawer-profile">
          <div className="fx-profile-avatar">
            {restaurant.name
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="fx-profile-info">
            <strong>{restaurant.name}</strong>
            <span>View Restaurant Profile</span>
          </div>

          <span className="fx-profile-arrow">›</span>
        </div>

        <a
          href="/api/auth/signout"
          className="fx-drawer-logout"
        >
          <Icon name="logout" size={18} />
          <span>Logout</span>
        </a>
      </aside>

      {/* =========================================================
          DESKTOP SIDEBAR
      ========================================================== */}

      <aside className="fx-desktop-sidebar">
        <div className="fx-desktop-brand">
          <strong>{restaurant.name}</strong>
          <span>Restaurant Workspace</span>
        </div>

        <div className="fx-desktop-scroll">
          <NavigationSection
            title="WORKSPACE"
            items={[
              {
                label: "Dashboard",
                icon: "home",
                active: true,
                onClick: () => go(`/k/${slug}`),
              },
              {
                label: "Orders",
                icon: "orders",
                badge: stats.newOrders,
                onClick: openOrders,
              },
              {
                label: "Requests",
                icon: "bell",
                badge: stats.requests,
                onClick: openRequests,
              },
              {
                label: "Tables",
                icon: "table",
                onClick: openTables,
              },
            ]}
          />

          <NavigationSection
            title="MANAGEMENT"
            items={[
              {
                label: "Menu",
                icon: "menu",
                onClick: openTables,
              },
              {
                label: "Tables & QR",
                icon: "qr",
                onClick: openTables,
              },
              {
                label: "Staff",
                icon: "staff",
                onClick: () => {},
              },
              {
                label: "Settings",
                icon: "settings",
                onClick: () => {},
              },
            ]}
          />

          <NavigationSection
            title="BUSINESS"
            items={[
              {
                label: "Reports",
                icon: "reports",
                onClick: () => {},
              },
              {
                label: "Order History",
                icon: "history",
                onClick: openOrders,
              },
              {
                label: "Feedback",
                icon: "feedback",
                onClick: () => {},
              },
            ]}
          />
        </div>

        <div className="fx-desktop-profile">
          <div className="fx-profile-avatar">
            {restaurant.name
              .slice(0, 1)
              .toUpperCase()}
          </div>

          <div className="fx-profile-info">
            <strong>{restaurant.name}</strong>
            <span>View Restaurant Profile</span>
          </div>

          <span className="fx-profile-arrow">›</span>
        </div>

        <a
          href="/api/auth/signout"
          className="fx-desktop-logout"
        >
          <Icon name="logout" size={18} />
          <span>Logout</span>
        </a>
      </aside>

      {/* =========================================================
          MAIN
      ========================================================== */}

      <section className="fx-kitchen-main">
        {/* TOP MOBILE HEADER */}

        <header className="fx-mobile-topbar">
          <div className="fx-mobile-brand">
            <strong>{restaurant.name}</strong>
            <span>Powered by FEXONIC</span>
          </div>

          <div className="fx-mobile-top-actions">
            <button
              type="button"
              className="fx-notification-button"
              onClick={openRequests}
              aria-label="Requests"
            >
              <Icon name="bell" size={21} />

              {stats.requests > 0 && (
                <span className="fx-notification-dot" />
              )}
            </button>

            <button
              type="button"
              className="fx-hamburger-button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" size={23} />
            </button>
          </div>
        </header>

        {/* DESKTOP TOPBAR */}

        <header className="fx-desktop-topbar">
          <div>
            <span>Kitchen Workspace</span>
            <strong>Dashboard</strong>
          </div>

          <div className="fx-desktop-top-actions">
            <button
              type="button"
              className="fx-refresh-button"
              onClick={loadDashboard}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <Icon
                name="refresh"
                size={17}
              />
            </button>

            <button
              type="button"
              className="fx-desktop-account"
              onClick={() => setDrawerOpen(true)}
            >
              <span className="fx-account-avatar">
                {restaurant.name
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <span>
                <strong>{restaurant.name}</strong>
                <small>Restaurant</small>
              </span>
            </button>
          </div>
        </header>

        {/* =====================================================
            DASHBOARD
        ====================================================== */}

        <div className="fx-dashboard-page">
          <section className="fx-dashboard-heading">
            <div>
              <h1>Kitchen Dashboard</h1>
              <p>{getGreeting()}!</p>
            </div>

            <div className="fx-dashboard-date">
              <strong>{formatDate()}</strong>
              <span>{formatCurrentTime()}</span>
            </div>
          </section>

          {/* ACTION NEEDED */}

          <section
            className={`fx-action-needed ${
              stats.newOrders > 0
                ? "has-new-orders"
                : "no-new-orders"
            }`}
          >
            <div className="fx-action-icon">
              <Icon name="bell" size={27} />
            </div>

            <div className="fx-action-copy">
              <span>ACTION NEEDED</span>

              <strong>
                {stats.newOrders} new{" "}
                {stats.newOrders === 1
                  ? "order"
                  : "orders"}
              </strong>

              <small>
                {stats.newOrders > 0
                  ? `Tables ${stats.newOrderTables.join(
                      ", "
                    )}`
                  : "No new orders right now"}
              </small>
            </div>

            <button
              type="button"
              className="fx-action-arrow"
              onClick={openOrders}
              aria-label="View orders"
            >
              <Icon name="arrow" size={20} />
            </button>

            <button
              type="button"
              className="fx-view-orders-button"
              onClick={openOrders}
            >
              View Orders
            </button>
          </section>

          {/* FOUR STATUS CARDS */}

          <section className="fx-status-grid">
            <button
              type="button"
              className="fx-status-card fx-status-blue"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=NEW`
                )
              }
            >
              <div className="fx-status-card-icon">
                <Icon name="document" size={19} />
              </div>

              <span>New Orders</span>
              <strong>{stats.newOrders}</strong>
            </button>

            <button
              type="button"
              className="fx-status-card fx-status-orange"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=PREPARING`
                )
              }
            >
              <div className="fx-status-card-icon">
                <Icon name="chef" size={19} />
              </div>

              <span>Preparing</span>
              <strong>{stats.preparing}</strong>
            </button>

            <button
              type="button"
              className="fx-status-card fx-status-green"
              onClick={() =>
                go(
                  `/k/${slug}/orders?status=READY`
                )
              }
            >
              <div className="fx-status-card-icon">
                <Icon name="ready" size={19} />
              </div>

              <span>Ready</span>
              <strong>{stats.ready}</strong>
            </button>

            <button
              type="button"
              className="fx-status-card fx-status-purple"
              onClick={openRequests}
            >
              <div className="fx-status-card-icon">
                <Icon name="people" size={19} />
              </div>

              <span>Requests</span>
              <strong>{stats.requests}</strong>
            </button>
          </section>

          {/* TODAY OVERVIEW */}

          <section className="fx-today-overview">
            <div className="fx-overview-header">
              <div>
                <div className="fx-overview-title">
                  <Icon name="reports" size={21} />
                  <strong>Today’s Overview</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {}}
                className="fx-view-reports"
              >
                View Reports
                <Icon name="arrow" size={16} />
              </button>
            </div>

            <div className="fx-overview-metrics">
              <div>
                <strong>
                  {stats.totalOrders}
                </strong>
                <span>Total Orders</span>
              </div>

              <div>
                <strong>
                  {stats.customers}
                </strong>
                <span>Customers</span>
              </div>

              <div>
                <strong>
                  ₹
                  {stats.totalSales.toLocaleString(
                    "en-IN"
                  )}
                </strong>
                <span>Total Sales</span>
              </div>
            </div>
          </section>

          {/* QUOTE */}

          <section className="fx-dashboard-quote">
            <p>
              “Good food brings people together.”
            </p>

            <span>— Man.ko</span>
          </section>
        </div>

        {/* MOBILE BOTTOM NAV */}

        <nav className="fx-mobile-bottom-nav">
          <button
            type="button"
            className="active"
            onClick={() => go(`/k/${slug}`)}
          >
            <Icon name="home" size={19} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={openOrders}
          >
            <Icon name="orders" size={19} />

            <span>Orders</span>

            {stats.newOrders > 0 && (
              <b>{stats.newOrders}</b>
            )}
          </button>

          <button
            type="button"
            onClick={openRequests}
          >
            <Icon name="bell" size={19} />

            <span>Requests</span>

            {stats.requests > 0 && (
              <b>{stats.requests}</b>
            )}
          </button>

          <button
            type="button"
            onClick={openTables}
          >
            <Icon name="table" size={19} />
            <span>Tables</span>
          </button>
        </nav>
      </section>
    </main>
  );
}

/* ============================================================
   NAVIGATION COMPONENT
============================================================ */

function NavigationSection({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    icon: IconName;
    active?: boolean;
    badge?: number;
    onClick: () => void;
  }>;
}) {
  return (
    <section className="fx-nav-section">
      <span className="fx-nav-section-title">
        {title}
      </span>

      <div className="fx-nav-items">
        {items.map((item) => (
          <button
            type="button"
            key={item.label}
            className={`fx-nav-item ${
              item.active ? "active" : ""
            }`}
            onClick={item.onClick}
          >
            <span className="fx-nav-item-icon">
              <Icon
                name={item.icon}
                size={18}
              />
            </span>

            <span className="fx-nav-item-label">
              {item.label}
            </span>

            {!!item.badge && item.badge > 0 && (
              <b className="fx-nav-badge">
                {item.badge}
              </b>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}