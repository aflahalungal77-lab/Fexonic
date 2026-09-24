"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type CustomerSlot = {
  id: string;
  slot_code: "A" | "B" | "C" | "D";
  label: string;
  is_active: boolean;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Table = {
  id: string;
  name: string;
};

type Device = {
  id: string;
  name: string;
  device_key: string;
};

type Order = {
  id: string;
  table_id: string;
  customer_slot_id: string | null;
  device_id: string | null;
  billing_session_id: string;
  total: number;
  status: string;
  need: string | null;
  created_at: string;

  table: Table | null;
  customer: CustomerSlot | null;
  device: Device | null;
  order_items: OrderItem[];
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ApiResponse = {
  restaurant: Restaurant;

  orders: Order[];

  customerOrderCount: number;

  tableOrderCounts: Record<string, number>;

  dailyCustomerOrderCount: number;

  dailyTableOrderCounts: Record<string, number>;

  monthlyCustomerOrderCount: number;

  monthlyTableOrderCounts: Record<string, number>;
};

type TableCard = {
  table: Table;

  orders: Order[];

  total: number;

  itemCount: number;

  orderCount: number;

  activeOrderCount: number;

  lastOrderAt: string;
};

type BillItem = {
  name: string;
  price: number;
  quantity: number;
  total: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusText(status: string) {
  switch (status) {
    case "NEW":
      return "New";

    case "PREPARING":
      return "Preparing";

    case "READY":
      return "Ready";

    case "SERVED":
      return "Served";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status;
  }
}

function buildTableCard(
  table: Table,
  tableOrders: Order[],
  cumulativeCustomerCount: number
): TableCard {
  let total = 0;
  let itemCount = 0;

  for (const order of tableOrders) {
    total += Number(order.total || 0);

    for (const item of order.order_items || []) {
      itemCount += Number(item.quantity || 0);
    }
  }

  const sortedOrders = [...tableOrders].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  return {
    table,

    orders: sortedOrders,

    total: Number(total.toFixed(2)),

    itemCount,

    orderCount: cumulativeCustomerCount,

    activeOrderCount: sortedOrders.length,

    lastOrderAt:
      sortedOrders[sortedOrders.length - 1]?.created_at ||
      new Date().toISOString(),
  };
}

/* ============================================================
   INLINE ICONS
============================================================ */

function BellIcon({
  size = 22,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ArrowLeftIcon({
  size = 21,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function ArrowRightIcon({
  size = 17,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function XIcon({
  size = 18,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params.slug || "");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [orders, setOrders] =
    useState<Order[]>([]);

  /* =====================================================
     TOTAL
     ===================================================== */

  const [
    customerOrderCount,
    setCustomerOrderCount,
  ] = useState(0);

  const [
    tableOrderCounts,
    setTableOrderCounts,
  ] = useState<Record<string, number>>({});

  /* =====================================================
     DAILY
     ===================================================== */

  const [
    dailyCustomerOrderCount,
    setDailyCustomerOrderCount,
  ] = useState(0);

  const [
    dailyTableOrderCounts,
    setDailyTableOrderCounts,
  ] = useState<Record<string, number>>({});

  /* =====================================================
     MONTHLY
     ===================================================== */

  const [
    monthlyCustomerOrderCount,
    setMonthlyCustomerOrderCount,
  ] = useState(0);

  const [
    monthlyTableOrderCounts,
    setMonthlyTableOrderCounts,
  ] = useState<Record<string, number>>({});

  const [finishingBill, setFinishingBill] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedTable, setSelectedTable] =
    useState<TableCard | null>(null);

  const selectedTableRef =
    useRef<TableCard | null>(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  /* =====================================================
     NOTIFICATIONS
     ===================================================== */

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notificationMessageVisible, setNotificationMessageVisible] =
    useState(false);

  const [previousNewOrderCount, setPreviousNewOrderCount] =
    useState<number | null>(null);

  const [hasNewOrderNotification, setHasNewOrderNotification] =
    useState(false);

  /* =====================================================
     SELECTED TABLE REF
     ===================================================== */

  useEffect(() => {
    selectedTableRef.current =
      selectedTable;
  }, [selectedTable]);

  /* =====================================================
     LOAD ORDERS
     ===================================================== */

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!slug) {
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          `/api/order-details?slug=${encodeURIComponent(
            slug
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data: ApiResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            (data as any)?.error ||
              "Failed to load orders"
          );
        }

        setRestaurant(data.restaurant);

        /* TOTAL */

        setCustomerOrderCount(
          Number(data.customerOrderCount || 0)
        );

        setTableOrderCounts(
          data.tableOrderCounts || {}
        );

        /* DAILY */

        setDailyCustomerOrderCount(
          Number(
            data.dailyCustomerOrderCount || 0
          )
        );

        setDailyTableOrderCounts(
          data.dailyTableOrderCounts || {}
        );

        /* MONTHLY */

        setMonthlyCustomerOrderCount(
          Number(
            data.monthlyCustomerOrderCount || 0
          )
        );

        setMonthlyTableOrderCounts(
          data.monthlyTableOrderCounts || {}
        );

        const freshOrders =
          data.orders || [];

        /* =================================================
           NEW ORDER NOTIFICATION
           ================================================= */

        const freshNewOrders =
          freshOrders.filter(
            (order) =>
              order.status === "NEW"
          );

        const newOrderCount =
          freshNewOrders.length;

        /*
         * First load:
         * Do not show a notification just because
         * old NEW orders already exist.
         */
        if (
          previousNewOrderCount === null
        ) {
          setPreviousNewOrderCount(
            newOrderCount
          );
        } else if (
          newOrderCount >
          previousNewOrderCount
        ) {
          setHasNewOrderNotification(true);
          setNotificationMessageVisible(true);

          /*
           * Automatically hide the small
           * notification message after 6 seconds.
           */
          window.setTimeout(() => {
            setNotificationMessageVisible(false);
          }, 6000);

          setPreviousNewOrderCount(
            newOrderCount
          );
        } else if (
          newOrderCount === 0
        ) {
          setPreviousNewOrderCount(0);
        } else {
          setPreviousNewOrderCount(
            newOrderCount
          );
        }

        setOrders(freshOrders);

        /* =================================================
           UPDATE OPEN DRAWER
           ================================================= */

        const currentSelected =
          selectedTableRef.current;

        if (currentSelected) {
          const updatedOrders =
            freshOrders.filter(
              (order) =>
                order.table_id ===
                currentSelected.table.id
            );

          if (updatedOrders.length > 0) {
            const updatedCard =
              buildTableCard(
                currentSelected.table,
                updatedOrders,
                Number(
                  (
                    data.tableOrderCounts ||
                    {}
                  )[
                    currentSelected
                      .table
                      .id
                  ] || 0
                )
              );

            setSelectedTable(
              updatedCard
            );
          }
        }

        setError("");
      } catch (err: any) {
        console.error(
          "Order details loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load order details"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      slug,
      previousNewOrderCount,
    ]
  );

  /* =====================================================
     INITIAL LOAD
     ===================================================== */

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  /* =====================================================
     POLLING
     ===================================================== */

  useEffect(() => {
    if (!slug) return;

    const interval =
      window.setInterval(() => {
        loadOrders(true);
      }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadOrders, slug]);

  /* =====================================================
     NEW ORDER COUNT
     ===================================================== */

  const newOrders = useMemo(() => {
    return orders
      .filter(
        (order) =>
          order.status === "NEW"
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
  }, [orders]);

  const newOrderCount =
    newOrders.length;

  /* =====================================================
     NOTIFICATION CLICK
     ===================================================== */

  function openLatestNewOrder() {
    const latestOrder =
      newOrders[0];

    if (!latestOrder) {
      setNotificationOpen(false);
      return;
    }

    if (latestOrder.table) {
      const tableOrders =
        orders.filter(
          (order) =>
            order.table_id ===
            latestOrder.table_id
        );

      const card =
        buildTableCard(
          latestOrder.table,
          tableOrders,
          Number(
            tableOrderCounts[
              latestOrder.table_id
            ] || 0
          )
        );

      setSelectedTable(card);
    }

    setNotificationOpen(false);
    setNotificationMessageVisible(false);
    setHasNewOrderNotification(false);
  }

  /* =====================================================
     GROUP BY TABLE
     ===================================================== */

  const tableCards =
    useMemo(() => {
      const tableMap =
        new Map<string, Order[]>();

      for (const order of orders) {
        if (!order.table) {
          continue;
        }

        const existing =
          tableMap.get(
            order.table_id
          );

        if (existing) {
          existing.push(order);
        } else {
          tableMap.set(
            order.table_id,
            [order]
          );
        }
      }

      const cards: TableCard[] = [];

      for (const [
        tableId,
        tableOrders,
      ] of tableMap) {
        const table =
          tableOrders[0]?.table;

        if (!table) {
          continue;
        }

        cards.push(
          buildTableCard(
            table,
            tableOrders,
            Number(
              tableOrderCounts[
                tableId
              ] || 0
            )
          )
        );
      }

      return cards.sort(
        (a, b) =>
          a.table.name.localeCompare(
            b.table.name,
            undefined,
            {
              numeric: true,
            }
          )
      );
    }, [
      orders,
      tableOrderCounts,
    ]);

  /* =====================================================
     SEARCH + FILTER
     ===================================================== */

  const filteredCards =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return tableCards.filter(
        (card) => {
          const matchesSearch =
            !query ||
            card.table.name
              .toLowerCase()
              .includes(query);

          const matchesFilter =
            filter === "ALL" ||
            card.orders.some(
              (order) =>
                order.status ===
                filter
            );

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      tableCards,
      search,
      filter,
    ]);

  /* =====================================================
     COMBINED BILL ITEMS
     ===================================================== */

  const billItems =
    useMemo(() => {
      if (!selectedTable) {
        return [];
      }

      const itemMap =
        new Map<string, BillItem>();

      for (
        const order of
          selectedTable.orders
      ) {
        for (
          const item of
            order.order_items || []
        ) {
          const existing =
            itemMap.get(
              item.name
            );

          if (existing) {
            existing.quantity +=
              Number(
                item.quantity
              );

            existing.total +=
              Number(item.price) *
              Number(
                item.quantity
              );
          } else {
            itemMap.set(
              item.name,
              {
                name: item.name,

                price:
                  Number(
                    item.price
                  ),

                quantity:
                  Number(
                    item.quantity
                  ),

                total:
                  Number(item.price) *
                  Number(
                    item.quantity
                  ),
              }
            );
          }
        }
      }

      return Array.from(
        itemMap.values()
      );
    }, [selectedTable]);

  /* =====================================================
     GLOBAL STATS
     ===================================================== */

  const stats = useMemo(() => {
    return {
      customerOrders:
        customerOrderCount,

      dailyCustomerOrders:
        dailyCustomerOrderCount,

      monthlyCustomerOrders:
        monthlyCustomerOrderCount,
    };
  }, [
    customerOrderCount,
    dailyCustomerOrderCount,
    monthlyCustomerOrderCount,
  ]);

  /* =====================================================
     CLOSE DRAWER
     ===================================================== */

  function closeBill() {
    setSelectedTable(null);
  }

  /* =====================================================
     DONE
     ===================================================== */

  async function handleDone() {
    if (finishingBill) {
      return;
    }

    if (!selectedTable) {
      return;
    }

    const billingSessionId =
      selectedTable.orders[0]
        ?.billing_session_id;

    if (!billingSessionId) {
      console.error(
        "Billing session ID missing"
      );

      return;
    }

    setFinishingBill(true);

    try {
      const response =
        await fetch(
          "/api/order-details",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              slug,
              billingSessionId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to complete bill"
        );
      }

      const completedOrderIds =
        selectedTable.orders.map(
          (order) => order.id
        );

      setOrders(
        (currentOrders) =>
          currentOrders.filter(
            (order) =>
              !completedOrderIds.includes(
                order.id
              )
          )
      );

      setSelectedTable(null);

      await loadOrders(true);
    } catch (error: any) {
      console.error(
        "Done action failed:",
        error
      );

      setError(
        error?.message ||
          "Failed to complete bill"
      );
    } finally {
      setFinishingBill(false);
    }
  }

  /* =====================================================
     LOADING
     ===================================================== */

  if (loading) {
    return (
      <div className="fx-order-details-page">
        <div className="fx-od-loading">
          <div className="fx-od-spinner" />

          <p>
            Loading table orders...
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     UI
     ===================================================== */

  return (
    <>
      {/* ===================================================
          NOTIFICATION MESSAGE
      =================================================== */}

      {notificationMessageVisible &&
        hasNewOrderNotification &&
        newOrderCount > 0 && (
          <button
            type="button"
            className="fx-od-new-order-toast"
            onClick={
              openLatestNewOrder
            }
          >
            <span className="fx-od-toast-icon">
              <BellIcon size={19} />
            </span>

            <span className="fx-od-toast-content">
              <strong>
                New order received
              </strong>

              <small>
                {newOrderCount}{" "}
                {newOrderCount === 1
                  ? "new order"
                  : "new orders"}{" "}
                waiting
              </small>
            </span>

            <span className="fx-od-toast-arrow">
              <ArrowRightIcon />
            </span>
          </button>
        )}

      <div className="fx-order-details-page">
        {/* =================================================
            HEADER
            ================================================= */}

        <header className="fx-od-header">
          <div className="fx-od-header-left">
            {/* BACK TO DASHBOARD */}

            <button
              type="button"
              className="fx-od-back-button"
              onClick={() =>
                router.push(
                  `/k/${slug}`
                )
              }
              aria-label="Back to dashboard"
            >
              <ArrowLeftIcon size={19} />

              <span>
                Dashboard
              </span>
            </button>

            <div className="fx-od-eyebrow">
              BILLING WORKSPACE
            </div>

            <h1>
              Order Details
            </h1>

            <p>
              {restaurant?.name ||
                "Restaurant"}{" "}
              · Live table billing
            </p>
          </div>

          {/* HEADER ACTIONS */}

          <div className="fx-od-header-actions">
            {/* NOTIFICATION */}

            <div className="fx-od-notification-wrap">
              <button
                type="button"
                className={`fx-od-notification-button ${
                  newOrderCount > 0
                    ? "has-new"
                    : ""
                }`}
                onClick={() => {
                  setNotificationOpen(
                    (current) =>
                      !current
                  );

                  setNotificationMessageVisible(
                    false
                  );
                }}
                aria-label="Order notifications"
                aria-expanded={
                  notificationOpen
                }
              >
                <BellIcon size={21} />

                {newOrderCount >
                  0 && (
                  <span className="fx-od-notification-badge">
                    {newOrderCount >
                    99
                      ? "99+"
                      : newOrderCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATION PANEL */}

              {notificationOpen && (
                <>
                  <button
                    type="button"
                    className="fx-od-notification-backdrop"
                    aria-label="Close notifications"
                    onClick={() =>
                      setNotificationOpen(
                        false
                      )
                    }
                  />

                  <div className="fx-od-notification-panel">
                    <div className="fx-od-notification-panel-head">
                      <div>
                        <strong>
                          Notifications
                        </strong>

                        <span>
                          Live order updates
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setNotificationOpen(
                            false
                          )
                        }
                        aria-label="Close notifications"
                      >
                        <XIcon size={17} />
                      </button>
                    </div>

                    {newOrderCount >
                    0 ? (
                      <div className="fx-od-notification-list">
                        {newOrders
                          .slice(
                            0,
                            5
                          )
                          .map(
                            (
                              order
                            ) => (
                              <button
                                type="button"
                                className="fx-od-notification-item"
                                key={
                                  order.id
                                }
                                onClick={
                                  openLatestNewOrder
                                }
                              >
                                <span className="fx-od-notification-item-dot" />

                                <span className="fx-od-notification-item-content">
                                  <strong>
                                    New order
                                  </strong>

                                  <small>
                                    {
                                      order
                                        .table
                                        ?.name
                                    }

                                    {order.customer
                                      ? ` · Customer ${order.customer.slot_code}`
                                      : ""}

                                    {" · "}

                                    {formatTime(
                                      order.created_at
                                    )}
                                  </small>
                                </span>

                                <ArrowRightIcon
                                  size={
                                    15
                                  }
                                />
                              </button>
                            )
                          )}
                      </div>
                    ) : (
                      <div className="fx-od-notification-empty">
                        <span>
                          ✓
                        </span>

                        <strong>
                          All caught up
                        </strong>

                        <small>
                          No new orders right
                          now.
                        </small>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* REFRESH */}

            <button
              type="button"
              className="fx-od-refresh"
              onClick={() =>
                loadOrders(false)
              }
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "fx-od-refresh-icon spinning"
                    : "fx-od-refresh-icon"
                }
              >
                ↻
              </span>

              <span className="fx-od-refresh-label">
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>
          </div>
        </header>

        {/* =================================================
            STATS
            ================================================= */}

        <section className="fx-od-summary-grid">
          {/* DAILY */}

          <div className="fx-od-summary-card highlight">
            <span>
              Daily Orders by Table
            </span>

            <strong>
              {
                stats.dailyCustomerOrders
              }
            </strong>

            <small>
              Today
            </small>
          </div>

          {/* MONTHLY */}

          <div className="fx-od-summary-card highlight">
            <span>
              Monthly Orders by Table
            </span>

            <strong>
              {
                stats.monthlyCustomerOrders
              }
            </strong>

            <small>
              Current month
            </small>
          </div>

          {/* TOTAL */}

          <div className="fx-od-summary-card highlight">
            <span>
              Total Orders by Table
            </span>

            <strong>
              {stats.customerOrders}
            </strong>

            <small>
              All time
            </small>
          </div>
        </section>

        {/* =================================================
            TOOLBAR
            ================================================= */}

        <section className="fx-od-toolbar">
          <div className="fx-od-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search table..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          <select
            className="fx-od-select"
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
              )
            }
          >
            <option value="ALL">
              All orders
            </option>

            <option value="NEW">
              New
            </option>

            <option value="PREPARING">
              Preparing
            </option>

            <option value="READY">
              Ready
            </option>

            <option value="SERVED">
              Served
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>
        </section>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="fx-od-error">
            <strong>
              Unable to load orders
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                loadOrders(false)
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* =================================================
            EMPTY
            ================================================= */}

        {!error &&
          filteredCards.length ===
            0 && (
            <div className="fx-od-empty">
              <div className="fx-od-empty-icon">
                ⌂
              </div>

              <h3>
                No active table orders
              </h3>

              <p>
                New customer orders
                will appear here
                automatically.
              </p>
            </div>
          )}

        {/* =================================================
            TABLE CARDS
            ================================================= */}

        {!error &&
          filteredCards.length >
            0 && (
            <section className="fx-od-table-grid">
              {filteredCards.map(
                (card) => (
                  <button
                    type="button"
                    key={
                      card.table.id
                    }
                    className="fx-table-bill-card active"
                    onClick={() =>
                      setSelectedTable(
                        card
                      )
                    }
                  >
                    <div className="fx-tbc-top">
                      <div className="fx-tbc-table">
                        <div className="fx-tbc-table-icon">
                          {card.table.name
                            .replace(
                              /table/i,
                              ""
                            )
                            .trim() ||
                            "T"}
                        </div>

                        <div>
                          <span>
                            TABLE
                          </span>

                          <h2>
                            {
                              card
                                .table
                                .name
                            }
                          </h2>
                        </div>
                      </div>

                      <span className="fx-tbc-live">
                        <i />
                        ACTIVE
                      </span>
                    </div>

                    <div className="fx-tbc-main">
                      <div>
                        <span>
                          Current bill
                        </span>

                        <strong>
                          {money(
                            card.total
                          )}
                        </strong>
                      </div>

                      <div className="fx-tbc-arrow">
                        →
                      </div>
                    </div>

                    <div className="fx-tbc-divider" />

                    <div className="fx-tbc-meta">
                      <span>
                        {card.orderCount}{" "}
                        {card.orderCount ===
                        1
                          ? "customer"
                          : "customers"}
                      </span>

                      <span>
                        {
                          card.activeOrderCount
                        }{" "}
                        {card.activeOrderCount ===
                        1
                          ? "active order"
                          : "active orders"}
                      </span>

                      <span>
                        Last{" "}
                        {formatTime(
                          card.lastOrderAt
                        )}
                      </span>
                    </div>
                  </button>
                )
              )}
            </section>
          )}
      </div>

      {/* =====================================================
          BILL DRAWER
          ===================================================== */}

      {selectedTable && (
        <div
          className="fx-bill-overlay"
          onClick={closeBill}
        >
          <aside
            className="fx-bill-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="fx-bill-header">
              <div>
                <span>
                  ACTIVE BILL
                </span>

                <h2>
                  {
                    selectedTable
                      .table
                      .name
                  }
                </h2>

                <p>
                  {
                    selectedTable
                      .activeOrderCount
                  }{" "}
                  active orders ·{" "}
                  {
                    selectedTable
                      .itemCount
                  }{" "}
                  items
                </p>
              </div>

              <button
                type="button"
                className="fx-bill-close"
                onClick={closeBill}
                aria-label="Close bill"
              >
                ×
              </button>
            </div>

            <div className="fx-bill-paper">
              <div className="fx-bill-brand">
                {restaurant?.name ||
                  "Restaurant"}

                <small>
                  ORDER SUMMARY
                </small>
              </div>

              <div className="fx-bill-info">
                <div>
                  <span>
                    TABLE
                  </span>

                  <strong>
                    {
                      selectedTable
                        .table
                        .name
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ORDERS BY TABLE
                  </span>

                  <strong>
                    {
                      selectedTable
                        .orderCount
                    }
                  </strong>
                </div>
              </div>

              <div className="fx-bill-line" />

              <div className="fx-bill-items">
                {billItems.map(
                  (item) => (
                    <div
                      className="fx-bill-item"
                      key={
                        item.name
                      }
                    >
                      <div className="fx-bill-item-left">
                        <strong>
                          {
                            item.name
                          }
                        </strong>

                        <span>
                          {money(
                            item.price
                          )}{" "}
                          ×{" "}
                          {
                            item.quantity
                          }
                        </span>
                      </div>

                      <strong>
                        {money(
                          item.total
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div className="fx-bill-line" />

              <div className="fx-bill-total-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  {money(
                    selectedTable.total
                  )}
                </strong>
              </div>

              <div className="fx-bill-grand-total">
                <span>
                  TOTAL
                </span>

                <strong>
                  {money(
                    selectedTable.total
                  )}
                </strong>
              </div>

              <div className="fx-bill-history">
                <h3>
                  Order Timeline
                </h3>

                {selectedTable.orders.map(
                  (
                    order,
                    index
                  ) => (
                    <div
                      className="fx-bill-order"
                      key={
                        order.id
                      }
                    >
                      <div className="fx-bill-order-dot">
                        {index + 1}
                      </div>

                      <div className="fx-bill-order-content">
                        <div className="fx-bill-order-top">
                          <strong>
                            Order #
                            {index + 1}
                          </strong>

                          <span
                            className={`fx-bill-status ${String(
                              order.status
                            ).toLowerCase()}`}
                          >
                            {statusText(
                              order.status
                            )}
                          </span>
                        </div>

                        {/* CUSTOMER */}

                        <span>
                          {order.customer
                            ? `Customer ${order.customer.slot_code}`
                            : "Customer"}
                        </span>

                        <span>
                          {formatDateTime(
                            order.created_at
                          )}
                        </span>

                        {/* ITEMS */}

                        <div className="fx-bill-order-items">
                          {(
                            order.order_items ||
                            []
                          ).map(
                            (item) => (
                              <span
                                key={
                                  item.id
                                }
                              >
                                {
                                  item.quantity
                                }{" "}
                                ×{" "}
                                {
                                  item.name
                                }
                              </span>
                            )
                          )}
                        </div>

                        {/* CUSTOMER NEED */}

                        {order.need && (
                          <div
                            style={{
                              marginTop:
                                "8px",
                              padding:
                                "9px 10px",
                              borderRadius:
                                "10px",
                              background:
                                "#fffdf5",
                              border:
                                "1px solid #eee7c9",
                            }}
                          >
                            <small
                              style={{
                                display:
                                  "block",
                                marginBottom:
                                  "3px",
                                fontSize:
                                  "9px",
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
                            </small>

                            <span
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "12px",
                                lineHeight:
                                  1.45,
                                fontWeight:
                                  600,
                                color:
                                  "#403b29",
                              }}
                            >
                              {order.need}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="fx-bill-note">
                Orders by Table counts
                each customer once per
                billing session.
              </div>
            </div>

            <div className="fx-bill-footer">
              <button
                type="button"
                className="fx-bill-primary"
                onClick={
                  handleDone
                }
                disabled={
                  finishingBill
                }
              >
                {finishingBill
                  ? "Closing..."
                  : "Done"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* =====================================================
          NOTIFICATION UI STYLES
          Self-contained for this page
          ===================================================== */}

      <style jsx>{`
        .fx-od-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .fx-od-header-left {
          min-width: 0;
        }

        .fx-od-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
        }

        .fx-od-back-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          padding: 0;
          margin-bottom: 13px;
          color: #626b78;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition:
            color 0.18s ease,
            transform 0.18s ease;
        }

        .fx-od-back-button:hover {
          color: #111827;
          transform: translateX(-2px);
        }

        .fx-od-notification-wrap {
          position: relative;
        }

        .fx-od-notification-button {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e7e9ed;
          border-radius: 13px;
          background: #fff;
          color: #4b5563;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .fx-od-notification-button:hover {
          transform: translateY(-1px);
          border-color: #d8dce2;
          background: #fafafa;
        }

        .fx-od-notification-button.has-new {
          color: #c62828;
          border-color: #f0caca;
        }

        .fx-od-notification-button.has-new svg {
          animation: fxBellPulse 1.8s ease-in-out
            infinite;
        }

        .fx-od-notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #dc2626;
          color: white;
          border: 2px solid #fff;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
        }

        .fx-od-notification-backdrop {
          display: none;
        }

        .fx-od-notification-panel {
          position: absolute;
          z-index: 100;
          top: calc(100% + 10px);
          right: 0;
          width: 330px;
          overflow: hidden;
          border: 1px solid #e7e9ed;
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 18px 50px rgba(17, 24, 39, 0.13),
            0 4px 14px rgba(17, 24, 39, 0.06);
          animation: fxNotificationIn 0.18s ease-out;
        }

        .fx-od-notification-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 15px;
          border-bottom: 1px solid #eef0f2;
        }

        .fx-od-notification-panel-head > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .fx-od-notification-panel-head strong {
          color: #111827;
          font-size: 13px;
          font-weight: 800;
        }

        .fx-od-notification-panel-head span {
          color: #89919c;
          font-size: 10px;
        }

        .fx-od-notification-panel-head button {
          width: 29px;
          height: 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 9px;
          background: #f5f6f7;
          color: #68707c;
          cursor: pointer;
        }

        .fx-od-notification-list {
          display: flex;
          flex-direction: column;
          max-height: 330px;
          overflow-y: auto;
        }

        .fx-od-notification-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 15px;
          border: 0;
          border-bottom: 1px solid #f0f1f3;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .fx-od-notification-item:hover {
          background: #fafafa;
        }

        .fx-od-notification-item:last-child {
          border-bottom: 0;
        }

        .fx-od-notification-item-dot {
          flex: 0 0 auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dc2626;
          box-shadow: 0 0 0 4px #fee2e2;
        }

        .fx-od-notification-item-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fx-od-notification-item-content strong {
          color: #1f2937;
          font-size: 12px;
          font-weight: 750;
        }

        .fx-od-notification-item-content small {
          overflow: hidden;
          color: #8a919b;
          font-size: 10px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .fx-od-notification-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          text-align: center;
        }

        .fx-od-notification-empty > span {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 9px;
          border-radius: 50%;
          background: #ecfdf3;
          color: #159447;
          font-size: 15px;
          font-weight: 800;
        }

        .fx-od-notification-empty strong {
          color: #27303b;
          font-size: 12px;
        }

        .fx-od-notification-empty small {
          margin-top: 4px;
          color: #9399a2;
          font-size: 10px;
        }

        .fx-od-new-order-toast {
          position: fixed;
          z-index: 1000;
          top: 18px;
          right: 20px;
          width: min(350px, calc(100vw - 32px));
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid #fecaca;
          border-radius: 15px;
          background: #fff;
          box-shadow:
            0 15px 40px rgba(127, 29, 29, 0.14),
            0 4px 12px rgba(17, 24, 39, 0.06);
          color: inherit;
          text-align: left;
          cursor: pointer;
          animation:
            fxToastIn 0.25s ease-out,
            fxToastGlow 1.8s ease-in-out 0.3s
              infinite;
        }

        .fx-od-toast-icon {
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #fef2f2;
          color: #dc2626;
        }

        .fx-od-toast-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fx-od-toast-content strong {
          color: #1f2937;
          font-size: 12px;
          font-weight: 800;
        }

        .fx-od-toast-content small {
          color: #8a919b;
          font-size: 10px;
        }

        .fx-od-toast-arrow {
          flex: 0 0 auto;
          color: #9aa1aa;
        }

        @keyframes fxNotificationIn {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fxToastIn {
          from {
            opacity: 0;
            transform: translateY(-10px)
              translateX(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0)
              translateX(0);
          }
        }

        @keyframes fxToastGlow {
          0%,
          100% {
            box-shadow:
              0 15px 40px rgba(
                127,
                29,
                29,
                0.14
              ),
              0 4px 12px rgba(
                17,
                24,
                39,
                0.06
              );
          }

          50% {
            box-shadow:
              0 15px 42px rgba(
                220,
                38,
                38,
                0.2
              ),
              0 4px 15px rgba(
                17,
                24,
                39,
                0.08
              );
          }
        }

        @keyframes fxBellPulse {
          0%,
          100% {
            transform: rotate(0deg);
          }

          10% {
            transform: rotate(8deg);
          }

          20% {
            transform: rotate(-8deg);
          }

          30% {
            transform: rotate(5deg);
          }

          40% {
            transform: rotate(-3deg);
          }

          50% {
            transform: rotate(0deg);
          }
        }

        @media (max-width: 700px) {
          .fx-od-header {
            align-items: flex-start;
            gap: 12px;
          }

          .fx-od-header-actions {
            flex: 0 0 auto;
            gap: 7px;
          }

          .fx-od-back-button {
            margin-bottom: 9px;
            font-size: 11px;
          }

          .fx-od-back-button svg {
            width: 17px;
            height: 17px;
          }

          .fx-od-notification-button {
            width: 39px;
            height: 39px;
            border-radius: 11px;
          }

          .fx-od-refresh {
            width: 39px;
            height: 39px;
            min-width: 39px;
            padding: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .fx-od-refresh-label {
            display: none;
          }

          .fx-od-notification-panel {
            position: fixed;
            z-index: 1100;
            top: 68px;
            left: 12px;
            right: 12px;
            width: auto;
            max-width: none;
            border-radius: 17px;
          }

          .fx-od-notification-backdrop {
            display: block;
            position: fixed;
            z-index: -1;
            inset: 0;
            width: 100vw;
            height: 100vh;
            border: 0;
            background: transparent;
          }

          .fx-od-notification-list {
            max-height: 55vh;
          }

          .fx-od-new-order-toast {
            top: 10px;
            left: 10px;
            right: 10px;
            width: auto;
            max-width: none;
            border-radius: 14px;
          }

          .fx-od-toast-icon {
            width: 34px;
            height: 34px;
          }
        }

        @media (max-width: 430px) {
          .fx-od-header {
            gap: 8px;
          }

          .fx-od-header h1 {
            font-size: 24px;
          }

          .fx-od-header p {
            font-size: 11px;
          }

          .fx-od-header-actions {
            gap: 5px;
          }

          .fx-od-back-button span {
            display: none;
          }

          .fx-od-notification-button,
          .fx-od-refresh {
            width: 37px;
            height: 37px;
            min-width: 37px;
          }

          .fx-od-notification-badge {
            min-width: 17px;
            height: 17px;
            font-size: 8px;
          }

          .fx-od-new-order-toast {
            padding: 10px;
          }
        }
      `}</style>
    </>
  );
}