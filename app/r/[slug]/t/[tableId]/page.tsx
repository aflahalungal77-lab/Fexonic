"use client";

import { useEffect, useState } from "react";

type CustomerParams = {
  slug: string;
  tableId: string;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image?: {
    path?: string;
    url?: string;
    alt?: string;
  } | null;
  is_available: boolean;
  category_id?: string | null;
};

export default function Customer({
  params,
}: {
  params: Promise<CustomerParams>;
}) {
  const [p, setP] = useState<CustomerParams | null>(null);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);

  const [cart, setCart] =
    useState<Record<string, number>>({});

  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(true);

  const [ordering, setOrdering] = useState(false);

  // Get QR parameters once
  useEffect(() => {
    let mounted = true;

    params.then((value) => {
      if (mounted) {
        setP(value);
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  // Load menu once after parameters are ready
  useEffect(() => {
    if (!p) return;

    const currentParams = p;

    let cancelled = false;

    async function loadMenu() {
      try {
        setLoading(true);
        setMsg("");

        const response = await fetch(
          `/api/menu?slug=${encodeURIComponent(
            currentParams.slug
          )}&table=${encodeURIComponent(
            currentParams.tableId
          )}`,
          {
            method: "GET",
            cache: "force-cache",
          }
        );

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok || data.error) {
          setMsg(
            data.error || "Failed to load menu"
          );
          return;
        }

        setRestaurant(data.restaurant);
        setItems(data.items || []);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMsg("Failed to load menu");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, [p]);

  function add(id: string) {
    setCart((current) => ({
      ...current,
      [id]: (current[id] || 0) + 1,
    }));
  }

  function remove(id: string) {
    setCart((current) => {
      const next = { ...current };

      if (!next[id]) {
        return next;
      }

      if (next[id] <= 1) {
        delete next[id];
      } else {
        next[id] -= 1;
      }

      return next;
    });
  }

  function total() {
    return items.reduce(
      (sum, item) =>
        sum +
        (cart[item.id] || 0) *
          Number(item.price),
      0
    );
  }

  function cartCount() {
    return Object.values(cart).reduce(
      (sum, quantity) => sum + quantity,
      0
    );
  }

  async function order() {
    if (!restaurant || !p || ordering) {
      return;
    }

    const currentRestaurant = restaurant;
    const currentParams = p;

    const rows = items
      .filter((item) => cart[item.id])
      .map((item) => ({
        menu_item_id: item.id,
        quantity: cart[item.id],
      }));

    if (!rows.length) {
      setMsg(
        "Add something to your cart first."
      );
      return;
    }

    try {
      setOrdering(true);
      setMsg("");

      const response = await fetch(
        "/api/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id:
              currentRestaurant.id,
            table_id:
              currentParams.tableId,
            items: rows,
          }),
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        throw new Error(
          "Server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "Order failed"
        );
      }

      setCart({});

      setMsg(
        `Order placed • #${String(
          data.id
        ).slice(0, 8)}`
      );
    } catch (error: any) {
      console.error(
        "Order error:",
        error
      );

      setMsg(
        error?.message ||
          "Order failed"
      );
    } finally {
      setOrdering(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <main className="container">
        <header className="top">
          <b className="brand">
            FEXONIC
          </b>

          <span className="pill">
            TABLE
          </span>
        </header>

        <section className="hero">
          <div className="eyebrow">
            TABLE ORDERING
          </div>

          <div
            className="card"
            style={{
              marginTop: 20,
              textAlign: "center",
              padding: 40,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Loading menu...
            </div>

            <p className="muted">
              Please wait a moment.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // Error / unavailable
  if (msg && !restaurant) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            marginTop: 70,
            textAlign: "center",
          }}
        >
          <h1>
            Unavailable
          </h1>

          <p className="muted">
            {msg}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="top">
        <b className="brand">
          {restaurant?.name ||
            "FEXONIC"}
        </b>

        <span className="pill">
          TABLE
        </span>
      </header>

      <section className="hero">
        <div className="eyebrow">
          TABLE ORDERING
        </div>

        <h1>
          {restaurant?.name}
        </h1>

        <p className="muted">
          {restaurant?.description ||
            "Scan. Choose. Order."}
        </p>
      </section>

      {items.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
          }}
        >
          <h3>
            Menu unavailable
          </h3>

          <p className="muted">
            This restaurant has no
            available items right now.
          </p>
        </div>
      ) : (
        <div className="grid grid3">
          {items.map(
            (item, index) => {
              const quantity =
                cart[item.id] || 0;

              return (
                <article
                  className="card food-card"
                  key={item.id}
                >
                  {item.image?.url ? (
                    <img
                      className="foodimg"
                      src={
                        item.image.url
                      }
                      alt={
                        item.image.alt ||
                        item.name
                      }
                      loading={
                        index < 2
                          ? "eager"
                          : "lazy"
                      }
                      decoding="async"
                      fetchPriority={
                        index === 0
                          ? "high"
                          : "auto"
                      }
                    />
                  ) : (
                    <div className="foodimg" />
                  )}

                  <div
                    className="row"
                    style={{
                      marginTop: 12,
                    }}
                  >
                    <b>
                      {item.name}
                    </b>

                    <b>
                      ₹{item.price}
                    </b>
                  </div>

                  {item.description && (
                    <p className="muted">
                      {item.description}
                    </p>
                  )}

                  {quantity === 0 ? (
                    <button
                      className="btn"
                      type="button"
                      style={{
                        width: "100%",
                        marginTop: 8,
                      }}
                      onClick={() =>
                        add(item.id)
                      }
                    >
                      Add
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        marginTop: 8,
                      }}
                    >
                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          remove(item.id)
                        }
                      >
                        −
                      </button>

                      <b>
                        {quantity}
                      </b>

                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          add(item.id)
                        }
                      >
                        +
                      </button>
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}

      <section
        className="card"
        style={{
          position: "sticky",
          bottom: 12,
          margin: "22px 0",
          zIndex: 20,
        }}
      >
        <div className="row">
          <div>
            <b>
              Cart
            </b>

            <div className="muted">
              {cartCount()} item
              {cartCount() !== 1
                ? "s"
                : ""}{" "}
              • ₹{total()}
            </div>
          </div>

          <button
            className="btn"
            type="button"
            onClick={order}
            disabled={
              ordering ||
              cartCount() === 0
            }
          >
            {ordering
              ? "Placing..."
              : "Place order"}
          </button>
        </div>

        {msg && (
          <p
            style={{
              marginBottom: 0,
              marginTop: 12,
            }}
          >
            {msg}
          </p>
        )}
      </section>
    </main>
  );
}