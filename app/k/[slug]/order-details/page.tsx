"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";

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

  /*
   * Historical unique customer count.
   *
   * This remains even after Done.
   */
  customerOrderCount: number;
};

type TableCard = {
  table: Table;
  orders: Order[];
  total: number;
  itemCount: number;
  orderCount: number;
  lastOrderAt: string;
};

type BillItem = {
  name: string;
  price: number;
  quantity: number;
  total: number;
};

function money(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatTime(value: string) {
  return new Date(
    value
  ).toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function formatDateTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function statusText(
  status: string
) {
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
  tableOrders: Order[]
): TableCard {
  let total = 0;

  let itemCount = 0;

  for (const order of tableOrders) {
    total += Number(
      order.total || 0
    );

    for (
      const item of
        order.order_items || []
    ) {
      itemCount += Number(
        item.quantity || 0
      );
    }
  }

  const sortedOrders =
    [...tableOrders].sort(
      (a, b) =>
        new Date(
          a.created_at
        ).getTime() -
        new Date(
          b.created_at
        ).getTime()
    );

  return {
    table,

    orders:
      sortedOrders,

    total:
      Number(
        total.toFixed(2)
      ),

    itemCount,

    orderCount:
      sortedOrders.length,

    lastOrderAt:
      sortedOrders[
        sortedOrders.length - 1
      ]?.created_at ||
      new Date().toISOString(),
  };
}

export default function OrderDetailsPage() {
  const params =
    useParams();

  const slug =
    String(
      params.slug || ""
    );

  const [
    restaurant,
    setRestaurant,
  ] =
    useState<Restaurant | null>(
      null
    );

  const [
    orders,
    setOrders,
  ] =
    useState<Order[]>([]);

  /*
   * IMPORTANT:
   *
   * This is NOT calculated from
   * the current `orders` state.
   *
   * It comes from the database
   * and therefore survives Done.
   */
  const [
    customerOrderCount,
    setCustomerOrderCount,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    selectedTable,
    setSelectedTable,
  ] =
    useState<TableCard | null>(
      null
    );

  const selectedTableRef =
    useRef<TableCard | null>(
      null
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState("ALL");

  // =====================================================
  // KEEP SELECTED TABLE REF
  // =====================================================

  useEffect(() => {
    selectedTableRef.current =
      selectedTable;
  }, [
    selectedTable,
  ]);

  // =====================================================
  // LOAD ORDERS
  // =====================================================

  const loadOrders =
    useCallback(
      async (
        silent = false
      ) => {
        if (!slug) return;

        try {
          if (silent) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          const response =
            await fetch(
              `/api/order-details?slug=${encodeURIComponent(
                slug
              )}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const data: ApiResponse =
            await response.json();

          if (!response.ok) {
            throw new Error(
              (data as any)
                ?.error ||
                "Failed to load orders"
            );
          }

          setRestaurant(
            data.restaurant
          );

          // =================================================
          // PERSISTENT CUSTOMER COUNT
          // =================================================

          setCustomerOrderCount(
            Number(
              data.customerOrderCount ||
                0
            )
          );

          const freshOrders =
            data.orders || [];

          setOrders(
            freshOrders
          );

          // =================================================
          // UPDATE OPEN DRAWER
          // =================================================

          const currentSelected =
            selectedTableRef.current;

          if (
            currentSelected
          ) {
            const updatedOrders =
              freshOrders.filter(
                (order) =>
                  order.table_id ===
                  currentSelected
                    .table
                    .id
              );

            if (
              updatedOrders.length >
              0
            ) {
              const updatedCard =
                buildTableCard(
                  currentSelected.table,
                  updatedOrders
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
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [slug]
    );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadOrders(false);
  }, [
    loadOrders,
  ]);

  // =====================================================
  // POLLING
  // =====================================================

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          loadOrders(true);
        },
        5000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    loadOrders,
  ]);

  // =====================================================
  // GROUP BY TABLE
  // =====================================================

  const tableCards =
    useMemo(() => {
      const tableMap =
        new Map<
          string,
          Order[]
        >();

      for (
        const order of orders
      ) {
        if (
          !order.table
        ) {
          continue;
        }

        const existing =
          tableMap.get(
            order.table_id
          );

        if (existing) {
          existing.push(
            order
          );
        } else {
          tableMap.set(
            order.table_id,
            [order]
          );
        }
      }

      const cards: TableCard[] =
        [];

      for (
        const [
          ,
          tableOrders,
        ] of tableMap
      ) {
        const table =
          tableOrders[0]
            ?.table;

        if (!table) {
          continue;
        }

        cards.push(
          buildTableCard(
            table,
            tableOrders
          )
        );
      }

      return cards.sort(
        (a, b) =>
          a.table.name.localeCompare(
            b.table.name,
            undefined,
            {
              numeric:
                true,
            }
          )
      );
    }, [orders]);

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredCards =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return tableCards.filter(
        (card) => {
          const matchesSearch =
            !query ||
            card.table.name
              .toLowerCase()
              .includes(
                query
              );

          const matchesFilter =
            filter ===
              "ALL" ||
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

  // =====================================================
  // COMBINED BILL ITEMS
  // =====================================================

  const billItems =
    useMemo(() => {
      if (
        !selectedTable
      ) {
        return [];
      }

      const itemMap =
        new Map<
          string,
          BillItem
        >();

      for (
        const order of
          selectedTable.orders
      ) {
        for (
          const item of
            order.order_items ||
            []
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
              Number(
                item.price
              ) *
              Number(
                item.quantity
              );
          } else {
            itemMap.set(
              item.name,
              {
                name:
                  item.name,

                price:
                  Number(
                    item.price
                  ),

                quantity:
                  Number(
                    item.quantity
                  ),

                total:
                  Number(
                    item.price
                  ) *
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
    }, [
      selectedTable,
    ]);

  // =====================================================
  // GLOBAL STATS
  // =====================================================

  const stats =
    useMemo(() => {
      const itemCount =
        orders.reduce(
          (
            sum,
            order
          ) => {
            return (
              sum +
              (
                order.order_items ||
                []
              ).reduce(
                (
                  itemSum,
                  item
                ) =>
                  itemSum +
                  Number(
                    item.quantity ||
                      0
                  ),
                0
              )
            );
          },
          0
        );

      const totalValue =
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            Number(
              order.total ||
                0
            ),
          0
        );

      return {
        tables:
          tableCards.length,

        orders:
          orders.length,

        items:
          itemCount,

        value:
          Number(
            totalValue.toFixed(
              2
            )
          ),

        /*
         * THIS IS THE IMPORTANT ONE.
         *
         * It comes from ALL historical
         * customer orders.
         */
        customerOrders:
          customerOrderCount,
      };
    }, [
      tableCards,
      orders,
      customerOrderCount,
    ]);

  // =====================================================
  // CLOSE BILL
  // =====================================================

  function closeBill() {
    setSelectedTable(
      null
    );
  }

  // =====================================================
  // DONE
  // =====================================================

  async function handleDone() {
    if (
      !selectedTable
    ) {
      return;
    }

    const billingSessionId =
      selectedTable
        .orders[0]
        ?.billing_session_id;

    if (
      !billingSessionId
    ) {
      console.error(
        "Billing session ID missing"
      );

      return;
    }

    try {
      const response =
        await fetch(
          "/api/order-details",
          {
            method:
              "PATCH",

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

      // =================================================
      // REMOVE ONLY CURRENT OPEN ORDERS
      //
      // IMPORTANT:
      // customerOrderCount is NOT touched.
      // =================================================

      const completedOrderIds =
        selectedTable.orders.map(
          (order) =>
            order.id
        );

      setOrders(
        (
          currentOrders
        ) =>
          currentOrders.filter(
            (order) =>
              !completedOrderIds.includes(
                order.id
              )
          )
      );

      // =================================================
      // CLOSE DRAWER
      // =================================================

      setSelectedTable(
        null
      );

      /*
       * DO NOT set customerOrderCount(0)
       *
       * The count is historical
       * and must remain.
       */
    } catch (error) {
      console.error(
        "Done action failed:",
        error
      );
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

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

  return (
    <>
      <div className="fx-order-details-page">
        {/* HEADER */}

        <header className="fx-od-header">
          <div>
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

          <button
            type="button"
            className="fx-od-refresh"
            onClick={() =>
              loadOrders(false)
            }
            disabled={
              refreshing
            }
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

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {/* STATS */}

        <section className="fx-od-summary-grid">
          <div className="fx-od-summary-card">
            <span>
              Active Tables
            </span>

            <strong>
              {stats.tables}
            </strong>
          </div>

          <div className="fx-od-summary-card">
            <span>
              Orders
            </span>

            <strong>
              {stats.orders}
            </strong>
          </div>

          <div className="fx-od-summary-card">
            <span>
              Items
            </span>

            <strong>
              {stats.items}
            </strong>
          </div>

          <div className="fx-od-summary-card highlight">
            <span>
              Orders by Customer
            </span>

            <strong>
              {
                stats.customerOrders
              }
            </strong>
          </div>
        </section>

        {/* TOOLBAR */}

        <section className="fx-od-toolbar">
          <div className="fx-od-search">
            <span>
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search table..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
            />
          </div>

          <select
            className="fx-od-select"
            value={filter}
            onChange={(
              event
            ) =>
              setFilter(
                event.target
                  .value
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

        {/* ERROR */}

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
                loadOrders(
                  false
                )
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!error &&
          filteredCards.length ===
            0 && (
            <div className="fx-od-empty">
              <div className="fx-od-empty-icon">
                ⌂
              </div>

              <h3>
                No table orders
              </h3>

              <p>
                New customer orders
                will appear here
                automatically.
              </p>
            </div>
          )}

        {/* TABLE CARDS */}

        {!error &&
          filteredCards.length >
            0 && (
            <section className="fx-od-table-grid">
              {filteredCards.map(
                (
                  card
                ) => (
                  <button
                    type="button"
                    key={
                      card
                        .table
                        .id
                    }
                    className="fx-table-bill-card active"
                    onClick={() => {
                      setSelectedTable(
                        card
                      );
                    }}
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
                        {
                          card.orderCount
                        }{" "}
                        {
                          card.orderCount ===
                          1
                            ? "order"
                            : "orders"
                        }
                      </span>

                      <span>
                        {
                          card.itemCount
                        }{" "}
                        {
                          card.itemCount ===
                          1
                            ? "item"
                            : "items"
                        }
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
          onClick={
            closeBill
          }
        >
          <aside
            className="fx-bill-drawer"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            {/* BILL HEADER */}

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
                      .orderCount
                  }{" "}
                  orders ·{" "}
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
                onClick={
                  closeBill
                }
                aria-label="Close bill"
              >
                ×
              </button>
            </div>

            {/* BILL CONTENT */}

            <div className="fx-bill-paper">
              {/* RESTAURANT */}

              <div className="fx-bill-brand">
                {restaurant?.name ||
                  "Restaurant"}

                <small>
                  ORDER SUMMARY
                </small>
              </div>

              {/* BILL INFO */}

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
                    ORDERS
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

              {/* COMBINED FOOD */}

              <div className="fx-bill-items">
                {billItems.map(
                  (
                    item
                  ) => (
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

              {/* TOTAL */}

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

              {/* ORDER TIMELINE */}

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
                        {
                          index +
                          1
                        }
                      </div>

                      <div className="fx-bill-order-content">
                        <div className="fx-bill-order-top">
                          <strong>
                            Order #
                            {
                              index +
                              1
                            }
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
                            ? order.customer
                                .label
                            : "Customer"}
                        </span>

                        <span>
                          {formatDateTime(
                            order.created_at
                          )}
                        </span>

                        <div className="fx-bill-order-items">
                          {(
                            order.order_items ||
                            []
                          ).map(
                            (
                              item
                            ) => (
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
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="fx-bill-note">
                All orders from this
                table are combined
                into this billing
                summary.
              </div>
            </div>

            {/* FOOTER */}

            <div className="fx-bill-footer">
              <button
                type="button"
                className="fx-bill-primary"
                onClick={
                  handleDone
                }
              >
                ✓ Done
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}