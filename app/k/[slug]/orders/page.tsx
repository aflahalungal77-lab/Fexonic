"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import KitchenShell from "@/components/KitchenShell";
import { supabaseBrowser } from "@/lib/supabase";

type Status = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

type Order = {
  id: string;
  status: Status;
  total: number | string | null;
  created_at: string;
  table_id: string | null;
  tables?: { name: string } | null;
  order_items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number | string;
  }>;
};

const tabs: Array<{ key: "ALL" | Status; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
];

const statusLabel: Record<Status, string> = {
  NEW: "New",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ago(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  );
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

export default function OrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const searchParams = useSearchParams();
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ slug: currentSlug }) => setSlug(currentSlug));
  }, [params]);

  useEffect(() => {
    const requested = searchParams.get("status");
    if (
      requested === "NEW" ||
      requested === "PREPARING" ||
      requested === "READY"
    ) {
      setFilter(requested);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!slug) return;

    const s = supabaseBrowser();
    setLoading(true);

    const { data: r, error: restaurantError } = await s
      .from("restaurants")
      .select("id,name,slug")
      .eq("slug", slug)
      .single();

    if (restaurantError || !r) {
      setLoading(false);
      return;
    }

    setRestaurant(r);

    const { data, error } = await s
      .from("orders")
      .select(
        "id,status,total,created_at,table_id,tables(name),order_items(id,name,quantity,price)"
      )
      .eq("restaurant_id", r.id)
      .in("status", ["NEW", "PREPARING", "READY"])
      .order("created_at", { ascending: false })
      .limit(60);

    if (!error) setOrders(data || []);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const id = window.setInterval(load, 8000);
    return () => window.clearInterval(id);
  }, [load, restaurant?.id]);

  async function updateStatus(order: Order, next: Status) {
    setBusy(order.id);

    const { error } = await supabaseBrowser()
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .eq("restaurant_id", restaurant.id);

    if (error) window.alert(error.message);
    setBusy(null);
    setSelected(null);
    await load();
  }

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? orders
        : orders.filter((order) => order.status === filter),
    [filter, orders]
  );

  const counts = {
    NEW: orders.filter((x) => x.status === "NEW").length,
    PREPARING: orders.filter((x) => x.status === "PREPARING").length,
    READY: orders.filter((x) => x.status === "READY").length,
  };

  if (!restaurant) {
    return (
      <main className="fx-app">
        <div className="fx-loading-screen">
          <div className="fx-loading-card">
            <div className="fx-logo-mark">F</div>
            <strong>Loading orders</strong>
            <p>Preparing your kitchen workspace…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <KitchenShell
      slug={slug}
      restaurant={restaurant}
      active="orders"
      newOrders={counts.NEW}
    >
      <section className="fx-welcome-row">
        <div>
          <p className="fx-kicker">LIVE KITCHEN</p>
          <h1>Orders<span>.</span></h1>
          <p className="fx-muted">
            Every active order, in one focused workspace.
          </p>
        </div>

        <button className="fx-button fx-button-light" onClick={load}>
          ↻ Refresh
        </button>
      </section>

      <section className="fx-orders-summary">
        <div className="fx-orders-summary-card">
          <span>New</span>
          <strong>{counts.NEW}</strong>
        </div>
        <div className="fx-orders-summary-card">
          <span>Preparing</span>
          <strong>{counts.PREPARING}</strong>
        </div>
        <div className="fx-orders-summary-card">
          <span>Ready</span>
          <strong>{counts.READY}</strong>
        </div>
      </section>

      <div className="fx-order-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={filter === tab.key ? "active" : ""}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.key !== "ALL" && (
              <b>{counts[tab.key as "NEW" | "PREPARING" | "READY"]}</b>
            )}
          </button>
        ))}
      </div>

      <section className="fx-orders-layout">
        <div className="fx-orders-column">
          {loading ? (
            <div className="fx-empty-card">
              <strong>Loading orders…</strong>
            </div>
          ) : visible.length === 0 ? (
            <div className="fx-empty-card">
              <div className="fx-empty-icon">✓</div>
              <strong>No active orders</strong>
              <p className="fx-muted">
                New customer orders will appear here automatically.
              </p>
            </div>
          ) : (
            visible.map((order) => (
              <article className="fx-order-card" key={order.id}>
                <div className="fx-order-topline">
                  <span
                    className={`fx-status fx-status-${order.status.toLowerCase()}`}
                  >
                    {statusLabel[order.status]}
                  </span>
                  <span className="fx-order-time">{ago(order.created_at)}</span>
                </div>

                <button
                  className="fx-order-card-open"
                  onClick={() => setSelected(order)}
                >
                  <div>
                    <h3>{order.tables?.name || "Table"}</h3>
                    <p>
                      Order #{order.id.slice(0, 8).toUpperCase()} ·{" "}
                      {time(order.created_at)}
                    </p>
                  </div>
                  <strong>₹{Number(order.total || 0).toFixed(0)}</strong>
                </button>

                <ul className="fx-order-items">
                  {(order.order_items || []).slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <span>
                        ₹{(Number(item.price) * item.quantity).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="fx-order-actions">
                  {order.status === "NEW" && (
                    <>
                      <button
                        className="fx-button fx-button-light"
                        disabled={busy === order.id}
                        onClick={() => updateStatus(order, "CANCELLED")}
                      >
                        Reject
                      </button>
                      <button
                        className="fx-button fx-button-dark"
                        disabled={busy === order.id}
                        onClick={() => updateStatus(order, "PREPARING")}
                      >
                        Accept
                      </button>
                    </>
                  )}

                  {order.status === "PREPARING" && (
                    <button
                      className="fx-button fx-button-dark fx-button-full"
                      disabled={busy === order.id}
                      onClick={() => updateStatus(order, "READY")}
                    >
                      Mark as ready →
                    </button>
                  )}

                  {order.status === "READY" && (
                    <button
                      className="fx-button fx-button-dark fx-button-full"
                      disabled={busy === order.id}
                      onClick={() => updateStatus(order, "SERVED")}
                    >
                      Mark as served ✓
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="fx-order-detail-panel">
          {selected ? (
            <>
              <div className="fx-detail-top">
                <button
                  className="fx-back-button"
                  onClick={() => setSelected(null)}
                >
                  ← Back
                </button>
                <span
                  className={`fx-status fx-status-${selected.status.toLowerCase()}`}
                >
                  {statusLabel[selected.status]}
                </span>
              </div>

              <div className="fx-detail-title">
                <div>
                  <p className="fx-kicker">ORDER</p>
                  <h2>#{selected.id.slice(0, 8).toUpperCase()}</h2>
                  <p>{selected.tables?.name || "Table"}</p>
                </div>
                <span>{ago(selected.created_at)}</span>
              </div>

              <div className="fx-detail-items">
                {(selected.order_items || []).map((item) => (
                  <div key={item.id}>
                    <span>
                      <b>{item.quantity}</b> {item.name}
                    </span>
                    <strong>
                      ₹{(Number(item.price) * item.quantity).toFixed(0)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="fx-detail-total">
                <span>Total</span>
                <strong>₹{Number(selected.total || 0).toFixed(0)}</strong>
              </div>

              <div className="fx-detail-actions">
                {selected.status === "NEW" && (
                  <>
                    <button
                      className="fx-detail-danger"
                      onClick={() => updateStatus(selected, "CANCELLED")}
                    >
                      Reject order
                    </button>
                    <button
                      className="fx-detail-primary"
                      onClick={() => updateStatus(selected, "PREPARING")}
                    >
                      Accept order
                    </button>
                  </>
                )}
                {selected.status === "PREPARING" && (
                  <button
                    className="fx-detail-primary"
                    onClick={() => updateStatus(selected, "READY")}
                  >
                    Mark as ready
                  </button>
                )}
                {selected.status === "READY" && (
                  <button
                    className="fx-detail-primary"
                    onClick={() => updateStatus(selected, "SERVED")}
                  >
                    Mark as served
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="fx-detail-empty">
              <div>▤</div>
              <strong>Select an order</strong>
              <p>Order details and actions will appear here.</p>
            </div>
          )}
        </aside>
      </section>
    </KitchenShell>
  );
}
