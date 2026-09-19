"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: string;
  total: number;
  created_at: string;
  tables?: {
    name: string;
  } | null;
  order_items?: OrderItem[];
};

type CustomerRequest = {
  id: string;
  restaurant_id: string;
  table_id: string;
  type: string;
  message: string | null;
  status: "PENDING" | "DONE";
  created_at: string;
  tables?: {
    name: string;
  } | null;
};

const ORDER_PAGE_SIZE = 50;

const ORDER_STATUSES = [
  "NEW",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
];

const REQUEST_LABELS: Record<string, string> = {
  TISSUE: "🧻 Tissue",
  CUTLERY: "🍴 Cutlery",
  WATER: "💧 Water",
  EXTRA_FOOD: "🍽️ Extra Food",
  CALL_WAITER: "👨‍🍳 Call Waiter",
  OTHER: "💬 Other",
};

export default function OrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] =
    useState<CustomerRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [ordersOffset, setOrdersOffset] = useState(0);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);

  const [error, setError] = useState("");

  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newRequestCount, setNewRequestCount] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioContextRef =
    useRef<AudioContext | null>(null);

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
   * Notification sound
   */
  function playNotificationSound() {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      const ctx = audioContextRef.current;

      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        ctx.currentTime
      );

      oscillator.frequency.setValueAtTime(
        1100,
        ctx.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.16,
        ctx.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.35
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.36);
    } catch (error) {
      console.error(
        "Notification sound failed:",
        error
      );
    }
  }

  /*
   * Load restaurant
   */
  const loadRestaurant = useCallback(async () => {
    if (!slug) return null;

    const supabase = supabaseBrowser();

    const { data, error } = await supabase
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
   * Load orders
   *
   * All orders are kept in the database.
   * We load them in pages so the browser does not
   * become slow when the restaurant has thousands
   * of historical orders.
   */
  const loadOrders = useCallback(
    async (
      restaurantId: string,
      offset = 0,
      append = false
    ) => {
      const supabase = supabaseBrowser();

      const from = offset;
      const to =
        offset + ORDER_PAGE_SIZE - 1;

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select(
          `
          id,
          restaurant_id,
          table_id,
          status,
          total,
          created_at,
          tables(name),
          order_items(
            id,
            name,
            price,
            quantity
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", {
          ascending: false,
        })
        .range(from, to);

      if (error) {
        throw error;
      }

      const rows =
        (data || []) as unknown as Order[];

      if (append) {
        setOrders((current) => [
          ...current,
          ...rows,
        ]);
      } else {
        setOrders(rows);
      }

      setHasMoreOrders(
        rows.length === ORDER_PAGE_SIZE
      );

      setOrdersOffset(
        offset + rows.length
      );
    },
    []
  );

  /*
   * Load customer requests
   *
   * Only pending requests are displayed.
   * DONE requests remain in the database.
   */
  const loadRequests = useCallback(
    async (restaurantId: string) => {
      const supabase = supabaseBrowser();

      const {
        data,
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
        .eq("restaurant_id", restaurantId)
        .eq("status", "PENDING")
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw error;
      }

      setRequests(
        (data || []) as unknown as CustomerRequest[]
      );
    },
    []
  );

  /*
   * Initial loading
   */
  const loadEverything = useCallback(
    async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError("");

        const r = await loadRestaurant();

        if (!r) return;

        await Promise.all([
          loadOrders(r.id, 0, false),
          loadRequests(r.id),
        ]);
      } catch (error: any) {
        console.error(error);

        setError(
          error?.message ||
            "Failed to load restaurant data."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      slug,
      loadRestaurant,
      loadOrders,
      loadRequests,
    ]
  );

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  /*
   * Realtime
   *
   * One restaurant-specific channel.
   *
   * orders:
   * INSERT -> new order
   * UPDATE -> order status changed
   *
   * customer_requests:
   * INSERT -> new request
   * UPDATE -> request completed
   */
  useEffect(() => {
    if (!restaurant?.id) return;

    const supabase = supabaseBrowser();

    const restaurantId = restaurant.id;

    const channel =
      supabase.channel(
        `restaurant-orders-${restaurantId}`
      );

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async () => {
          /*
           * Reload the first page so the newest order
           * appears at the top.
           */
          try {
            await loadOrders(
              restaurantId,
              0,
              false
            );

            setNewOrderCount(
              (current) => current + 1
            );

            playNotificationSound();
          } catch (error) {
            console.error(
              "Realtime order refresh failed:",
              error
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async () => {
          try {
            await loadOrders(
              restaurantId,
              0,
              false
            );
          } catch (error) {
            console.error(
              "Realtime order update failed:",
              error
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_requests",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async () => {
          try {
            await loadRequests(
              restaurantId
            );

            setNewRequestCount(
              (current) => current + 1
            );

            playNotificationSound();
          } catch (error) {
            console.error(
              "Realtime request refresh failed:",
              error
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "customer_requests",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async () => {
          try {
            await loadRequests(
              restaurantId
            );
          } catch (error) {
            console.error(
              "Realtime request update failed:",
              error
            );
          }
        }
      )
      .subscribe((status: string) => {
        console.log(
          "Fexonic realtime:",
          status
        );
      });

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    restaurant?.id,
    loadOrders,
    loadRequests,
    soundEnabled,
  ]);

  /*
   * Load more historical orders
   */
  async function loadMoreOrders() {
    if (
      !restaurant ||
      loadingMore ||
      !hasMoreOrders
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      await loadOrders(
        restaurant.id,
        ordersOffset,
        true
      );
    } catch (error) {
      console.error(
        "Load more orders failed:",
        error
      );
    } finally {
      setLoadingMore(false);
    }
  }

  /*
   * Change order status
   */
  async function updateOrderStatus(
    orderId: string,
    status: string
  ) {
    if (!restaurant) return;

    const supabase = supabaseBrowser();

    const {
      error,
    } = await supabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", orderId)
      .eq(
        "restaurant_id",
        restaurant.id
      );

    if (error) {
      alert(error.message);
      return;
    }

    /*
     * Optimistic UI update.
     * Realtime will also send the database update.
     */
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status,
            }
          : order
      )
    );
  }

  /*
   * Complete customer request
   */
  async function completeRequest(
    requestId: string
  ) {
    if (!restaurant) return;

    const supabase = supabaseBrowser();

    const {
      error,
    } = await supabase
      .from("customer_requests")
      .update({
        status: "DONE",
      })
      .eq("id", requestId)
      .eq(
        "restaurant_id",
        restaurant.id
      );

    if (error) {
      alert(error.message);
      return;
    }

    /*
     * Optimistic removal from pending list.
     */
    setRequests((current) =>
      current.filter(
        (request) =>
          request.id !== requestId
      )
    );
  }

  /*
   * Clear notification counter
   */
  function clearOrderNotifications() {
    setNewOrderCount(0);
  }

  function clearRequestNotifications() {
    setNewRequestCount(0);
  }

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
            RESTAURANT ORDERS
          </div>

          <h1>
            Loading orders...
          </h1>

          <p className="muted">
            Connecting to your restaurant
            workspace.
          </p>
        </section>
      </main>
    );
  }

  /*
   * Error
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
            Unable to load orders
          </h2>

          <p className="muted">
            {error ||
              "Restaurant not found."}
          </p>

          <button
            className="btn"
            onClick={() =>
              void loadEverything()
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
            {restaurant.name}
          </div>
        </div>

        <div className="nav">
          <button
            className="btn light small"
            onClick={() => {
              setSoundEnabled(
                (current) => !current
              );
            }}
          >
            {soundEnabled
              ? "🔔 Sound ON"
              : "🔕 Sound OFF"}
          </button>

          <a
            className="btn light small"
            href={`/k/${restaurant.slug}/manage`}
          >
            Menu & QR
          </a>

          <a
            className="btn light small"
            href="/api/auth/signout"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* PAGE HEADER */}

      <section className="dashboard-hero">
        <div className="eyebrow">
          LIVE RESTAURANT OPERATIONS
        </div>

        <h1>
          Orders & Requests
        </h1>

        <p className="muted">
          Orders and customer requests
          update automatically.
        </p>
      </section>

      {/* NOTIFICATION BAR */}

      {(newOrderCount > 0 ||
        newRequestCount > 0) && (
        <section
          className="card"
          style={{
            marginBottom: 18,
            border:
              "1px solid #111",
          }}
        >
          <div className="row">
            <div>
              <b>
                🔔 New activity
              </b>

              <div
                className="muted smalltext"
                style={{
                  marginTop: 5,
                }}
              >
                {newOrderCount > 0 &&
                  `${newOrderCount} new order${
                    newOrderCount === 1
                      ? ""
                      : "s"
                  }`}

                {newOrderCount > 0 &&
                  newRequestCount > 0 &&
                  " • "}

                {newRequestCount > 0 &&
                  `${newRequestCount} new request${
                    newRequestCount === 1
                      ? ""
                      : "s"
                  }`}
              </div>
            </div>

            <div className="actions">
              {newOrderCount > 0 && (
                <button
                  className="btn small"
                  onClick={
                    clearOrderNotifications
                  }
                >
                  Clear orders
                </button>
              )}

              {newRequestCount > 0 && (
                <button
                  className="btn light small"
                  onClick={
                    clearRequestNotifications
                  }
                >
                  Clear requests
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MAIN TWO COLUMN AREA */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.65fr) minmax(300px, 0.9fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* ORDERS */}

        <section className="card">
          <div className="row">
            <div>
              <div className="eyebrow">
                ORDERS
              </div>

              <h2
                style={{
                  marginTop: 7,
                  marginBottom: 0,
                }}
              >
                All Orders
              </h2>

              <p className="muted smalltext">
                {orders.length}
                {hasMoreOrders
                  ? "+ "
                  : " "}
                orders loaded
              </p>
            </div>

            <span className="pill">
              LIVE
            </span>
          </div>

          <div
            className="list"
            style={{
              marginTop: 20,
            }}
          >
            {orders.length === 0 ? (
              <div
                className="item"
                style={{
                  textAlign: "center",
                  padding: 35,
                }}
              >
                <b>
                  No orders yet
                </b>

                <p className="muted smalltext">
                  New customer orders
                  will appear here
                  automatically.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <article
                  className="item"
                  key={order.id}
                >
                  <div className="row">
                    <div>
                      <b>
                        #
                        {order.id.slice(
                          0,
                          8
                        )}
                      </b>

                      <div
                        className="muted smalltext"
                        style={{
                          marginTop: 5,
                        }}
                      >
                        {order.tables
                          ?.name ||
                          "Table"}{" "}
                        •{" "}
                        {new Date(
                          order.created_at
                        ).toLocaleString()}
                      </div>
                    </div>

                    <span className="pill">
                      {order.status}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      padding:
                        "12px 0",
                      borderTop:
                        "1px solid var(--line)",
                      borderBottom:
                        "1px solid var(--line)",
                    }}
                  >
                    {order.order_items?.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="row"
                          style={{
                            marginBottom: 7,
                          }}
                        >
                          <span>
                            {item.name}
                            {" × "}
                            {item.quantity}
                          </span>

                          <span>
                            ₹
                            {(
                              Number(
                                item.price
                              ) *
                              item.quantity
                            ).toFixed(0)}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  <div
                    className="row"
                    style={{
                      marginTop: 13,
                    }}
                  >
                    <b>
                      Total
                    </b>

                    <b>
                      ₹
                      {Number(
                        order.total
                      ).toFixed(0)}
                    </b>
                  </div>

                  <div
                    className="actions"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    {ORDER_STATUSES.map(
                      (status) => (
                        <button
                          key={status}
                          className={
                            order.status ===
                            status
                              ? "btn small"
                              : "btn light small"
                          }
                          onClick={() =>
                            void updateOrderStatus(
                              order.id,
                              status
                            )
                          }
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {hasMoreOrders && (
            <div
              style={{
                textAlign: "center",
                marginTop: 18,
              }}
            >
              <button
                className="btn light"
                disabled={loadingMore}
                onClick={() =>
                  void loadMoreOrders()
                }
              >
                {loadingMore
                  ? "Loading..."
                  : "Load more orders"}
              </button>
            </div>
          )}
        </section>

        {/* CUSTOMER REQUESTS */}

        <section className="card">
          <div className="row">
            <div>
              <div className="eyebrow">
                CUSTOMER REQUESTS
              </div>

              <h2
                style={{
                  marginTop: 7,
                  marginBottom: 0,
                }}
              >
                Requests
              </h2>

              <p className="muted smalltext">
                {requests.length} pending
              </p>
            </div>

            <span className="pill">
              {requests.length}
            </span>
          </div>

          <div
            className="list"
            style={{
              marginTop: 20,
            }}
          >
            {requests.length === 0 ? (
              <div
                className="item"
                style={{
                  textAlign: "center",
                  padding: 35,
                }}
              >
                <b>
                  No pending requests
                </b>

                <p className="muted smalltext">
                  Customer requests
                  will appear here
                  instantly.
                </p>
              </div>
            ) : (
              requests.map(
                (request) => (
                  <article
                    className="item"
                    key={request.id}
                  >
                    <div className="row">
                      <div>
                        <b>
                          {REQUEST_LABELS[
                            request.type
                          ] ||
                            request.type}
                        </b>

                        <div
                          className="muted smalltext"
                          style={{
                            marginTop: 5,
                          }}
                        >
                          {request.tables
                            ?.name ||
                            "Table"}{" "}
                          •{" "}
                          {new Date(
                            request.created_at
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </div>
                      </div>

                      <span className="pill">
                        NEW
                      </span>
                    </div>

                    {request.message && (
                      <p
                        className="muted"
                        style={{
                          marginTop: 12,
                        }}
                      >
                        {request.message}
                      </p>
                    )}

                    <button
                      className="btn"
                      style={{
                        width: "100%",
                        marginTop: 12,
                      }}
                      onClick={() =>
                        void completeRequest(
                          request.id
                        )
                      }
                    >
                      ✓ Mark as Done
                    </button>
                  </article>
                )
              )
            )}
          </div>
        </section>
      </section>

      <footer className="footer">
        Fexonic Kitchen ·{" "}
        {restaurant.name}
      </footer>

      {/* RESPONSIVE STYLE */}

      <style jsx>{`
        @media (max-width: 850px) {
          section[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}