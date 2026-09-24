"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import KitchenShell from "@/components/KitchenShell";

type OrderStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number | string;
};

type CustomerSlot = {
  slot_code: "A" | "B" | "C" | "D";
};

type Order = {
  id: string;
  status: OrderStatus;
  total: number | string | null;
  created_at: string;
  table_id: string | null;
  customer_slot_id: string | null;
  need: string | null;

  tables?: {
    name: string;
  } | null;

  customer_slots?: CustomerSlot | null;

  order_items?: OrderItem[];
};

type FilterStatus =
  | "ALL"
  | "NEW"
  | "PREPARING"
  | "READY";

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
    year: "numeric",
  });
}

function shortOrderId(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

function money(
  value: number | string | null | undefined
) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

export default function OrdersPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [slug, setSlug] = useState("");

  const [restaurant, setRestaurant] =
    useState<any>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [busyOrder, setBusyOrder] =
    useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [requestsCount, setRequestsCount] =
    useState(0);

  const [filter, setFilter] =
    useState<FilterStatus>("ALL");

  useEffect(() => {
    params.then((value) => {
      setSlug(value.slug);
    });
  }, [params]);

  useEffect(() => {
    const status = searchParams.get("status");

    if (
      status === "NEW" ||
      status === "PREPARING" ||
      status === "READY"
    ) {
      setFilter(status);
    } else {
      setFilter("ALL");
    }
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    if (!slug) return;

    setRefreshing(true);

    try {
      const supabase = supabaseBrowser();

      const {
        data: restaurantData,
        error: restaurantError,
      } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (
        restaurantError ||
        !restaurantData
      ) {
        router.replace("/kitchen");
        return;
      }

      setRestaurant(restaurantData);

      const [
        {
          data: orderData,
          error: orderError,
        },
        {
          count: requestCount,
          error: requestError,
        },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
              id,
              status,
              total,
              created_at,
              table_id,
              customer_slot_id,
              need,
              tables(name),
              customer_slots(
                slot_code
              ),
              order_items(
                id,
                name,
                quantity,
                price
              )
            `
          )
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .in("status", [
            "NEW",
            "PREPARING",
            "READY",
          ])
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("customer_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .eq(
            "status",
            "PENDING"
          ),
      ]);

      if (orderError) {
        throw orderError;
      }

      if (requestError) {
        console.error(
          "Request count error:",
          requestError
        );
      }

      setOrders(
        (orderData || []) as Order[]
      );

      setRequestsCount(
        requestCount || 0
      );
    } catch (error) {
      console.error(
        "Orders loading error:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, slug]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!restaurant?.id) return;

    const interval =
      window.setInterval(
        loadOrders,
        8000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    loadOrders,
    restaurant?.id,
  ]);

  async function updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ) {
    if (!restaurant?.id) return;

    setBusyOrder(orderId);

    try {
      const { error } =
        await supabaseBrowser()
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
        throw error;
      }

      setSelectedOrder(null);

      await loadOrders();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "Could not update order status"
      );
    } finally {
      setBusyOrder(null);
    }
  }

  const counts = useMemo(() => {
    return {
      all: orders.length,

      new: orders.filter(
        (order) =>
          order.status === "NEW"
      ).length,

      preparing: orders.filter(
        (order) =>
          order.status ===
          "PREPARING"
      ).length,

      ready: orders.filter(
        (order) =>
          order.status === "READY"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === "ALL") {
      return orders;
    }

    return orders.filter(
      (order) =>
        order.status === filter
    );
  }, [orders, filter]);

  function changeFilter(
    nextFilter: FilterStatus
  ) {
    setFilter(nextFilter);

    if (nextFilter === "ALL") {
      router.push(
        `/k/${slug}/orders`
      );
      return;
    }

    router.push(
      `/k/${slug}/orders?status=${nextFilter}`
    );
  }

  if (!restaurant && loading) {
    return (
      <main className="fx-app">
        <div className="ko-loading">
          <div className="ko-loading-card">
            <div className="ko-loading-mark">
              M
            </div>

            <strong>
              Man.ko
            </strong>

            <span>
              Loading kitchen orders…
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <KitchenShell
      slug={slug}
      restaurant={restaurant}
      active="orders"
      newOrders={counts.new}
      requests={requestsCount}
    >
      <div className="ko-page">

        {/* HEADER */}

        <section className="ko-page-header">
          <div>
            <p className="ko-eyebrow">
              KITCHEN WORKSPACE
            </p>

            <h1>
              Orders
            </h1>

            <p className="ko-subtitle">
              Manage incoming orders
              and keep the kitchen
              moving.
            </p>
          </div>

          <button
            type="button"
            className="ko-refresh"
            onClick={loadOrders}
            disabled={refreshing}
          >
            <span
              className={
                refreshing
                  ? "ko-refresh-icon ko-spin"
                  : "ko-refresh-icon"
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </section>

        {/* SUMMARY */}

        <section className="ko-summary">

          <div className="ko-summary-card">
            <span className="ko-summary-label">
              Total active
            </span>

            <strong>
              {counts.all}
            </strong>

            <small>
              Open orders
            </small>
          </div>

          <div className="ko-summary-card ko-summary-new">
            <span className="ko-summary-label">
              New
            </span>

            <strong>
              {counts.new}
            </strong>

            <small>
              Needs attention
            </small>
          </div>

          <div className="ko-summary-card ko-summary-preparing">
            <span className="ko-summary-label">
              Preparing
            </span>

            <strong>
              {counts.preparing}
            </strong>

            <small>
              In kitchen
            </small>
          </div>

          <div className="ko-summary-card ko-summary-ready">
            <span className="ko-summary-label">
              Ready
            </span>

            <strong>
              {counts.ready}
            </strong>

            <small>
              Waiting to serve
            </small>
          </div>

        </section>

        {/* FILTERS */}

        <section className="ko-filter-wrap">
          <div className="ko-filter-scroll">

            <button
              type="button"
              className={
                filter === "ALL"
                  ? "ko-filter active"
                  : "ko-filter"
              }
              onClick={() =>
                changeFilter("ALL")
              }
            >
              <span>
                All
              </span>

              <b>
                {counts.all}
              </b>
            </button>

            <button
              type="button"
              className={
                filter === "NEW"
                  ? "ko-filter active ko-filter-new"
                  : "ko-filter ko-filter-new"
              }
              onClick={() =>
                changeFilter("NEW")
              }
            >
              <span>
                New
              </span>

              <b>
                {counts.new}
              </b>
            </button>

            <button
              type="button"
              className={
                filter === "PREPARING"
                  ? "ko-filter active"
                  : "ko-filter"
              }
              onClick={() =>
                changeFilter(
                  "PREPARING"
                )
              }
            >
              <span>
                Preparing
              </span>

              <b>
                {counts.preparing}
              </b>
            </button>

            <button
              type="button"
              className={
                filter === "READY"
                  ? "ko-filter active"
                  : "ko-filter"
              }
              onClick={() =>
                changeFilter("READY")
              }
            >
              <span>
                Ready
              </span>

              <b>
                {counts.ready}
              </b>
            </button>

          </div>
        </section>

        {/* ORDERS */}

        <section className="ko-orders-section">

          <div className="ko-section-heading">
            <div>
              <p className="ko-eyebrow">
                LIVE ORDERS
              </p>

              <h2>
                {filter === "ALL"
                  ? "Current orders"
                  : `${statusLabels[filter]} orders`}
              </h2>
            </div>

            <span className="ko-live-indicator">
              <i />
              Live
            </span>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="ko-order-grid">

              {[1, 2, 3].map(
                (item) => (
                  <div
                    className="ko-skeleton-card"
                    key={item}
                  >
                    <div className="ko-skeleton ko-sk-small" />

                    <div className="ko-skeleton ko-sk-title" />

                    <div className="ko-skeleton ko-sk-line" />

                    <div className="ko-skeleton ko-sk-line" />

                    <div className="ko-skeleton ko-sk-button" />
                  </div>
                )
              )}

            </div>

          ) : filteredOrders.length === 0 ? (

            /* EMPTY */

            <div className="ko-empty">

              <div className="ko-empty-icon">
                ✓
              </div>

              <h3>
                {filter === "ALL"
                  ? "No active orders"
                  : `No ${statusLabels[
                      filter
                    ].toLowerCase()} orders`}
              </h3>

              <p>
                New customer orders
                will appear here
                automatically.
              </p>

              {filter !== "ALL" && (
                <button
                  type="button"
                  onClick={() =>
                    changeFilter("ALL")
                  }
                >
                  View all orders
                </button>
              )}

            </div>

          ) : (

            /* ORDER GRID */

            <div className="ko-order-grid">

              {filteredOrders.map(
                (order) => {

                  const itemCount =
                    order.order_items?.reduce(
                      (
                        total,
                        item
                      ) =>
                        total +
                        Number(
                          item.quantity || 0
                        ),
                      0
                    ) || 0;

                  const customerCode =
                    order
                      .customer_slots
                      ?.slot_code;

                  return (
                    <article
                      className={`ko-order-card ko-order-${order.status.toLowerCase()}`}
                      key={order.id}
                    >

                      {/* CARD TOP */}

                      <div className="ko-card-top">

                        <div
                          className={`ko-status ko-status-${order.status.toLowerCase()}`}
                        >
                          <span />

                          {
                            statusLabels[
                              order.status
                            ]
                          }
                        </div>

                        <span className="ko-order-time">
                          {formatTime(
                            order.created_at
                          )}
                        </span>

                      </div>

                      {/* ORDER HEADER */}

                      <div className="ko-order-heading">

                        <div>

                          <h3>
                            {order.tables?.name ||
                              "Table"}
                          </h3>

                          <p>
                            {shortOrderId(
                              order.id
                            )}

                            <span>
                              •
                            </span>

                            {formatDate(
                              order.created_at
                            )}
                          </p>

                        </div>

                        <strong>
                          {money(
                            order.total
                          )}
                        </strong>

                      </div>

                      {/* CUSTOMER */}

                      {customerCode && (
                        <div
                          className="ko-customer-info"
                          style={{
                            marginTop:
                              "10px",
                            marginBottom:
                              "10px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "8px",
                          }}
                        >

                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              minWidth:
                                "30px",
                              height:
                                "30px",
                              borderRadius:
                                "9px",
                              background:
                                "#eaf7ef",
                              color:
                                "#16734b",
                              fontSize:
                                "12px",
                              fontWeight:
                                800,
                            }}
                          >
                            {customerCode}
                          </span>

                          <div>

                            <small
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  700,
                                letterSpacing:
                                  ".08em",
                                textTransform:
                                  "uppercase",
                                color:
                                  "#89958f",
                              }}
                            >
                              Customer
                            </small>

                            <strong
                              style={{
                                fontSize:
                                  "13px",
                                color:
                                  "#26332e",
                              }}
                            >
                              Customer{" "}
                              {customerCode}
                            </strong>

                          </div>

                        </div>
                      )}

                      {/* CUSTOMER NEED */}

                      {order.need && (
                        <div
                          className="ko-order-need"
                          style={{
                            marginBottom:
                              "12px",
                            padding:
                              "11px 12px",
                            borderRadius:
                              "12px",
                            background:
                              "#f7faf8",
                            border:
                              "1px solid #e2ebe5",
                          }}
                        >

                          <span
                            style={{
                              display:
                                "block",
                              marginBottom:
                                "4px",
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              letterSpacing:
                                ".08em",
                              textTransform:
                                "uppercase",
                              color:
                                "#7a8982",
                            }}
                          >
                            Customer need
                          </span>

                          <p
                            style={{
                              margin: 0,
                              fontSize:
                                "13px",
                              lineHeight:
                                1.5,
                              color:
                                "#26332e",
                            }}
                          >
                            {order.need}
                          </p>

                        </div>
                      )}

                      {/* ITEMS */}

                      <div className="ko-items">

                        {(
                          order.order_items ||
                          []
                        ).map(
                          (item) => (
                            <div
                              className="ko-item"
                              key={item.id}
                            >

                              <div>

                                <b>
                                  {item.quantity}
                                </b>

                                <span>
                                  {item.name}
                                </span>

                              </div>

                              <strong>
                                {money(
                                  Number(
                                    item.price
                                  ) *
                                    Number(
                                      item.quantity
                                    )
                                )}
                              </strong>

                            </div>
                          )
                        )}

                      </div>

                      {/* META */}

                      <div className="ko-card-meta">

                        <span>
                          {itemCount}{" "}
                          {itemCount === 1
                            ? "item"
                            : "items"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                        >
                          View details

                          <span>
                            →
                          </span>
                        </button>

                      </div>

                      {/* ACTIONS */}

                      <div className="ko-actions">

                        {/* NEW */}

                        {order.status ===
                          "NEW" && (
                          <button
                            type="button"
                            className="ko-button ko-button-primary ko-button-full"
                            disabled={
                              busyOrder ===
                              order.id
                            }
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                "PREPARING"
                              )
                            }
                          >
                            {busyOrder ===
                            order.id
                              ? "Updating..."
                              : "Accept order"}
                          </button>
                        )}

                        {/* PREPARING */}

                        {order.status ===
                          "PREPARING" && (
                          <button
                            type="button"
                            className="ko-button ko-button-primary ko-button-full"
                            disabled={
                              busyOrder ===
                              order.id
                            }
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                "READY"
                              )
                            }
                          >
                            {busyOrder ===
                            order.id
                              ? "Updating..."
                              : "Mark as ready →"}
                          </button>
                        )}

                        {/* READY */}

                        {order.status ===
                          "READY" && (
                          <button
                            type="button"
                            className="ko-button ko-button-primary ko-button-full"
                            disabled={
                              busyOrder ===
                              order.id
                            }
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                "SERVED"
                              )
                            }
                          >
                            {busyOrder ===
                            order.id
                              ? "Updating..."
                              : "Mark as served ✓"}
                          </button>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        <div className="ko-mobile-bottom-space" />

      </div>

      {/* ORDER DETAILS */}

      {selectedOrder && (
        <div
          className="ko-detail-overlay"
          onClick={() =>
            setSelectedOrder(null)
          }
        >

          <div
            className="ko-detail-sheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="ko-detail-handle" />

            {/* DETAIL HEADER */}

            <div className="ko-detail-header">

              <div>

                <span
                  className={`ko-status ko-status-${selectedOrder.status.toLowerCase()}`}
                >
                  <span />

                  {
                    statusLabels[
                      selectedOrder.status
                    ]
                  }
                </span>

                <h2>
                  {selectedOrder.tables?.name ||
                    "Table"}
                </h2>

                <p>
                  {shortOrderId(
                    selectedOrder.id
                  )}{" "}
                  •{" "}
                  {formatDate(
                    selectedOrder.created_at
                  )}{" "}
                  •{" "}
                  {formatTime(
                    selectedOrder.created_at
                  )}
                </p>

              </div>

              <button
                type="button"
                className="ko-detail-close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>

            </div>

            {/* CUSTOMER */}

            {selectedOrder.customer_slots
              ?.slot_code && (
              <div
                style={{
                  marginBottom:
                    "16px",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "12px",
                  background:
                    "#f4faf6",
                  border:
                    "1px solid #dcebe1",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                }}
              >

                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius:
                      "10px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      "#dff3e7",
                    color:
                      "#176b46",
                    fontWeight:
                      800,
                  }}
                >
                  {
                    selectedOrder
                      .customer_slots
                      .slot_code
                  }
                </div>

                <div>

                  <small
                    style={{
                      display:
                        "block",
                      fontSize:
                        "10px",
                      fontWeight:
                        800,
                      textTransform:
                        "uppercase",
                      letterSpacing:
                        ".08em",
                      color:
                        "#829089",
                    }}
                  >
                    Customer
                  </small>

                  <strong
                    style={{
                      fontSize:
                        "14px",
                      color:
                        "#24322c",
                    }}
                  >
                    Customer{" "}
                    {
                      selectedOrder
                        .customer_slots
                        .slot_code
                    }
                  </strong>

                </div>

              </div>
            )}

            {/* NEED */}

            {selectedOrder.need && (
              <div
                style={{
                  marginBottom:
                    "18px",
                  padding:
                    "14px",
                  borderRadius:
                    "14px",
                  background:
                    "#fffdf5",
                  border:
                    "1px solid #eee7c9",
                }}
              >

                <span
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "6px",
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                    letterSpacing:
                      ".08em",
                    textTransform:
                      "uppercase",
                    color:
                      "#8b805c",
                  }}
                >
                  Customer need
                </span>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      "14px",
                    lineHeight:
                      1.55,
                    fontWeight:
                      600,
                    color:
                      "#403b29",
                  }}
                >
                  {selectedOrder.need}
                </p>

              </div>
            )}

            {/* DETAIL ITEMS */}

            <div className="ko-detail-items">

              {(
                selectedOrder.order_items ||
                []
              ).map(
                (item) => (
                  <div
                    className="ko-detail-item"
                    key={item.id}
                  >

                    <div>

                      <strong>
                        {item.quantity} ×
                      </strong>

                      <span>
                        {item.name}
                      </span>

                    </div>

                    <b>
                      {money(
                        Number(
                          item.price
                        ) *
                          Number(
                            item.quantity
                          )
                      )}
                    </b>

                  </div>
                )
              )}

            </div>

            {/* TOTAL */}

            <div className="ko-detail-total">

              <span>
                Total
              </span>

              <strong>
                {money(
                  selectedOrder.total
                )}
              </strong>

            </div>

            {/* DETAIL ACTIONS */}

            <div className="ko-detail-actions">

              {selectedOrder.status ===
                "NEW" && (
                <button
                  type="button"
                  className="ko-button ko-button-primary ko-button-full"
                  disabled={
                    busyOrder ===
                    selectedOrder.id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder.id,
                      "PREPARING"
                    )
                  }
                >
                  {busyOrder ===
                  selectedOrder.id
                    ? "Updating..."
                    : "Accept order"}
                </button>
              )}

              {selectedOrder.status ===
                "PREPARING" && (
                <button
                  type="button"
                  className="ko-button ko-button-primary ko-button-full"
                  disabled={
                    busyOrder ===
                    selectedOrder.id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder.id,
                      "READY"
                    )
                  }
                >
                  {busyOrder ===
                  selectedOrder.id
                    ? "Updating..."
                    : "Mark as ready →"}
                </button>
              )}

              {selectedOrder.status ===
                "READY" && (
                <button
                  type="button"
                  className="ko-button ko-button-primary ko-button-full"
                  disabled={
                    busyOrder ===
                    selectedOrder.id
                  }
                  onClick={() =>
                    updateOrderStatus(
                      selectedOrder.id,
                      "SERVED"
                    )
                  }
                >
                  {busyOrder ===
                  selectedOrder.id
                    ? "Updating..."
                    : "Mark as served ✓"}
                </button>
              )}

            </div>

          </div>
        </div>
      )}

    </KitchenShell>
  );
}