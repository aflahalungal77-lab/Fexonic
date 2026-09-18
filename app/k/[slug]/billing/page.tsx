"use client";

import { useEffect, useState } from "react";
import QR from "@/components/QR";
import { supabaseBrowser } from "@/lib/supabase";

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
  tables?: {
    name: string;
  } | null;
};

const requestLabels: Record<
  CustomerRequest["type"],
  string
> = {
  TISSUE: "🧻 Tissue",
  CUTLERY: "🍴 Cutlery",
  WATER: "💧 Water",
  EXTRA_FOOD: "🍛 Extra food",
  CALL_WAITER: "🧑‍🍳 Call waiter",
  OTHER: "💬 Other",
};

export default function Kitchen({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");

  const [r, setR] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [requestsLoading, setRequestsLoading] =
    useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [tableName, setTableName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    params.then((x) => setSlug(x.slug));
  }, [params]);

  async function loadRequests(restaurantId: string) {
    try {
      setRequestsLoading(true);

      const response = await fetch(
        `/api/requests?restaurant_id=${encodeURIComponent(
          restaurantId
        )}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load requests");
      }

      const data = await response.json();

      setRequests(data.requests || []);
    } catch (error) {
      console.error("Request loading error:", error);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function load() {
    if (!slug) return;

    const s = supabaseBrowser();

    const { data: r0, error: restaurantError } =
      await s
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();

    if (restaurantError || !r0) return;

    setR(r0);

    const [
      { data: o },
      { data: i },
      { data: t },
    ] = await Promise.all([
      s
        .from("orders")
        .select("*,tables(name),order_items(*)")
        .eq("restaurant_id", r0.id)
        .order("created_at", { ascending: false })
        .limit(50),

      s
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", r0.id)
        .order("created_at", { ascending: false }),

      s
        .from("tables")
        .select("*")
        .eq("restaurant_id", r0.id)
        .order("sort_order"),
    ]);

    setOrders(o || []);
    setItems(i || []);
    setTables(t || []);

    await loadRequests(r0.id);
  }

  useEffect(() => {
    load();
  }, [slug]);

  // Refresh customer requests every 5 seconds.
  useEffect(() => {
    if (!r?.id) return;

    const interval = window.setInterval(() => {
      loadRequests(r.id);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [r?.id]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !price || !r) return;

    const s = supabaseBrowser();

    let image: any = null;

    if (file) {
      const ext =
        file.name.split(".").pop() || "jpg";

      const path = `${r.id}/${crypto.randomUUID()}.${ext}`;

      const up = await s.storage
        .from("food-images")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        });

      if (up.error) {
        return alert(up.error.message);
      }

      const { data } = s.storage
        .from("food-images")
        .getPublicUrl(path);

      image = {
        path,
        url: data.publicUrl,
        alt: name,
      };
    }

    const { error } = await s
      .from("menu_items")
      .insert({
        restaurant_id: r.id,
        name,
        price: Number(price),
        image,
      });

    if (error) {
      return alert(error.message);
    }

    setName("");
    setPrice("");
    setFile(null);

    await load();
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();

    if (!tableName || !r) return;

    const { error } = await supabaseBrowser()
      .from("tables")
      .insert({
        restaurant_id: r.id,
        name: tableName,
      });

    if (error) {
      return alert(error.message);
    }

    setTableName("");

    await load();
  }

  async function status(
    id: string,
    newStatus: string
  ) {
    const { error } = await supabaseBrowser()
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", id);

    if (error) {
      return alert(error.message);
    }

    await load();
  }

  async function del(id: string) {
    const confirmed = window.confirm(
      "Delete this menu item?"
    );

    if (!confirmed) return;

    const { error } = await supabaseBrowser()
      .from("menu_items")
      .delete()
      .eq("id", id);

    if (error) {
      return alert(error.message);
    }

    await load();
  }

  async function completeRequest(id: string) {
    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: "DONE",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to complete request"
        );
      }

      if (r?.id) {
        await loadRequests(r.id);
      }
    } catch (error: any) {
      alert(
        error?.message ||
          "Failed to complete request"
      );
    }
  }

  function formatRequestTime(
    value: string
  ) {
    return new Date(value).toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  if (!r) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ marginTop: 50 }}
        >
          <div className="eyebrow">FEXONIC</div>

          <h2 style={{ marginTop: 10 }}>
            Loading workspace...
          </h2>

          <p className="muted">
            Preparing your restaurant dashboard.
          </p>
        </div>
      </main>
    );
  }

  const revenue = orders
    .filter(
      (o) => o.status !== "CANCELLED"
    )
    .reduce(
      (a, o) => a + Number(o.total),
      0
    );

  const pendingRequests = requests.filter(
    (x) => x.status === "PENDING"
  );

  return (
    <main className="container">
      {/* HEADER */}

      <header className="top">
        <div className="brand">FEXONIC</div>

        <div className="nav">
          <span className="pill">
            {r.name}
          </span>

          <a
            className="btn light"
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

        <h1>{r.name}</h1>

        <p className="muted">
          Your menu, tables, QR codes and
          orders — all in one place.
        </p>
      </section>

      {/* STATS */}

      <section className="grid grid4">
        <div className="card stat">
          <span className="muted smalltext">
            Orders
          </span>

          <strong>{orders.length}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Revenue shown
          </span>

          <strong>
            ₹{revenue.toFixed(0)}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Menu items
          </span>

          <strong>{items.length}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Tables
          </span>

          <strong>{tables.length}</strong>
        </div>
      </section>

      {/* MENU + TABLES */}

      <section className="grid grid2 dashboard-section">
        {/* MENU */}

        <div className="card">
          <div className="eyebrow">
            MENU
          </div>

          <h2 style={{ marginTop: 7 }}>
            Add menu item
          </h2>

          <form onSubmit={addItem}>
            <div className="field">
              <label className="label">
                Food name
              </label>

              <input
                className="input"
                placeholder="Chicken biriyani"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />
            </div>

            <div className="field">
              <label className="label">
                Price
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="180"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                required
              />
            </div>

            <div className="field">
              <label className="label">
                Food image
              </label>

              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />
            </div>

            <button
              className="btn"
              type="submit"
            >
              Add item
            </button>
          </form>

          <div
            className="list"
            style={{ marginTop: 22 }}
          >
            {items.map((i) => (
              <div
                className="item"
                key={i.id}
              >
                <div className="row">
                  <div>
                    <b>{i.name}</b>

                    <div
                      className="muted"
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                      }}
                    >
                      ₹{i.price}
                    </div>
                  </div>

                  <button
                    className="btn danger small"
                    onClick={() =>
                      del(i.id)
                    }
                  >
                    Delete
                  </button>
                </div>

                {i.image?.url && (
                  <img
                    src={i.image.url}
                    alt=""
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: 150,
                      objectFit: "cover",
                      borderRadius: 13,
                      marginTop: 12,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TABLES */}

        <div className="card">
          <div className="eyebrow">
            TABLES
          </div>

          <h2 style={{ marginTop: 7 }}>
            QR ordering
          </h2>

          <form onSubmit={addTable}>
            <div className="row">
              <input
                className="input"
                placeholder="Table 1"
                value={tableName}
                onChange={(e) =>
                  setTableName(
                    e.target.value
                  )
                }
                required
              />

              <button
                className="btn"
                type="submit"
              >
                Add
              </button>
            </div>
          </form>

          <div
            className="list"
            style={{ marginTop: 22 }}
          >
            {tables.map((t) => (
              <div
                className="item"
                key={t.id}
              >
                <div className="row">
                  <div>
                    <b>{t.name}</b>

                    <div className="muted smalltext">
                      Customer QR
                    </div>
                  </div>

                  <a
                    className="btn light small"
                    href={`/r/${r.slug}/t/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open menu
                  </a>
                </div>

                <QR
                  value={`${location.origin}/r/${r.slug}/t/${t.id}`}
                />

                <div
                  style={{
                    textAlign: "center",
                  }}
                >
                  <span className="pill">
                    SCAN TO ORDER
                  </span>

                  <p className="muted smalltext">
                    Customers scan this
                    code to open the menu
                    for this table.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUSTOMER REQUESTS */}

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">
              CUSTOMER SUPPORT
            </div>

            <h2
              style={{
                marginTop: 7,
                marginBottom: 0,
              }}
            >
              Customer Requests
            </h2>

            <p
              className="muted smalltext"
              style={{
                marginTop: 6,
              }}
            >
              Requests from customers
              at your tables.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {pendingRequests.length > 0 && (
              <span
                className="pill"
                style={{
                  fontWeight: 700,
                }}
              >
                {pendingRequests.length} NEW
              </span>
            )}

            <button
              className="btn light small"
              onClick={() =>
                loadRequests(r.id)
              }
              disabled={requestsLoading}
            >
              {requestsLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        <div
          className="list"
          style={{ marginTop: 20 }}
        >
          {requests.length === 0 && (
            <div
              className="item"
              style={{
                textAlign: "center",
                padding: 35,
              }}
            >
              <b>
                No customer requests
              </b>

              <p className="muted smalltext">
                Requests such as tissue,
                water or calling a waiter
                will appear here.
              </p>
            </div>
          )}

          {requests.map((request) => (
            <div
              className="item"
              key={request.id}
              style={{
                border:
                  request.status ===
                  "PENDING"
                    ? "1px solid #000"
                    : undefined,
              }}
            >
              <div className="row">
                <div>
                  <b>
                    {requestLabels[
                      request.type
                    ]}
                  </b>

                  <div
                    className="muted smalltext"
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {request.tables?.name ||
                      "Table"}
                    {" · "}
                    {formatRequestTime(
                      request.created_at
                    )}
                  </div>
                </div>

                <span className="pill">
                  {request.status}
                </span>
              </div>

              {request.message && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "rgba(0,0,0,0.04)",
                    fontSize: 14,
                  }}
                >
                  {request.message}
                </div>
              )}

              {request.status ===
                "PENDING" && (
                <div
                  className="actions"
                  style={{
                    marginTop: 14,
                  }}
                >
                  <button
                    className="btn small"
                    onClick={() =>
                      completeRequest(
                        request.id
                      )
                    }
                  >
                    ✓ Mark as done
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ORDERS */}

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">
              LIVE OPERATIONS
            </div>

            <h2
              style={{
                marginTop: 7,
                marginBottom: 0,
              }}
            >
              Orders
            </h2>
          </div>

          <button
            className="btn light small"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        <div
          className="list"
          style={{ marginTop: 20 }}
        >
          {orders.length === 0 && (
            <div
              className="item"
              style={{
                textAlign: "center",
                padding: 35,
              }}
            >
              <b>No orders yet</b>

              <p className="muted smalltext">
                New customer orders will
                appear here.
              </p>
            </div>
          )}

          {orders.map((o) => (
            <div
              className="item"
              key={o.id}
            >
              <div className="row">
                <div>
                  <b>
                    #{o.id.slice(0, 8)}
                  </b>

                  <div
                    className="muted smalltext"
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {o.tables?.name ||
                      "Table"}
                    {o.devices?.name && (
                      <>
                        {" · "}
                        {o.devices.name}
                      </>
                    )}
                  </div>
                </div>

                <span className="pill">
                  {o.status}
                </span>
              </div>

              <ul
                style={{
                  margin: "15px 0",
                  paddingLeft: 19,
                  lineHeight: 1.8,
                  fontSize: 13,
                }}
              >
                {o.order_items?.map(
                  (x: any) => (
                    <li key={x.id}>
                      {x.name} ×{" "}
                      {x.quantity} — ₹
                      {Number(x.price) *
                        x.quantity}
                    </li>
                  )
                )}
              </ul>

              <div className="actions">
                {[
                  "NEW",
                  "PREPARING",
                  "READY",
                  "SERVED",
                  "CANCELLED",
                ].map((st) => (
                  <button
                    className="btn light small"
                    key={st}
                    onClick={() =>
                      status(
                        o.id,
                        st
                      )
                    }
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">BILLING</div>
            <h2 style={{ marginTop: 7, marginBottom: 0 }}>Bills</h2>
            <p className="muted smalltext">Generate and print customer bills from orders.</p>
          </div>
          <a className="btn light small" href={`/k/${r.slug}/billing`}>View billing</a>
        </div>
      </section>

      <footer className="footer">
        Fexonic Kitchen · {r.name}
      </footer>
    </main>
  );
}