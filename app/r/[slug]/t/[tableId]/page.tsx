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

type RequestType =
  | "TISSUE"
  | "CUTLERY"
  | "WATER"
  | "EXTRA_FOOD"
  | "CALL_WAITER"
  | "OTHER";

const requestOptions: {
  type: RequestType;
  icon: string;
  label: string;
}[] = [
  {
    type: "TISSUE",
    icon: "🧻",
    label: "Tissue",
  },
  {
    type: "CUTLERY",
    icon: "🍴",
    label: "Cutlery",
  },
  {
    type: "WATER",
    icon: "💧",
    label: "Water",
  },
  {
    type: "EXTRA_FOOD",
    icon: "🍛",
    label: "Extra food",
  },
  {
    type: "CALL_WAITER",
    icon: "🧑‍🍳",
    label: "Call waiter",
  },
  {
    type: "OTHER",
    icon: "💬",
    label: "Other",
  },
];

export default function Customer({
  params,
}: {
  params: Promise<CustomerParams>;
}) {
  const [p, setP] =
    useState<CustomerParams | null>(null);

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [items, setItems] =
    useState<MenuItem[]>([]);

  const [cart, setCart] =
    useState<Record<string, number>>({});

  const [msg, setMsg] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [ordering, setOrdering] =
    useState(false);

  const [orderSuccess, setOrderSuccess] =
    useState<{ id: string; total: number } | null>(null);

  const [supportOpen, setSupportOpen] =
    useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<RequestType | null>(null);

  const [customMessage, setCustomMessage] =
    useState("");

  const [sendingRequest, setSendingRequest] =
    useState(false);

  const [requestSent, setRequestSent] =
    useState(false);

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
    cache: "no-store",
  }
);
        const data =
          await response.json();

        if (cancelled) return;

        if (!response.ok || data.error) {
          setMsg(
            data.error ||
              "Failed to load menu"
          );
          return;
        }

        setRestaurant(data.restaurant);
        setItems(data.items || []);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setMsg(
            "Failed to load menu"
          );
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
      (sum, quantity) =>
        sum + quantity,
      0
    );
  }

  function playSuccessSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const now = audioContext.currentTime;

      const notes = [
        { frequency: 660, start: 0, duration: 0.11 },
        { frequency: 880, start: 0.09, duration: 0.16 },
      ];

      notes.forEach((note) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          note.frequency,
          now + note.start
        );

        gain.gain.setValueAtTime(
          0.0001,
          now + note.start
        );
        gain.gain.exponentialRampToValueAtTime(
          0.08,
          now + note.start + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + note.start + note.duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now + note.start);
        oscillator.stop(
          now + note.start + note.duration + 0.02
        );
      });

      window.setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 700);
    } catch {
      // Some browsers block audio until a user gesture.
    }
  }

  function getDeviceKey() {
    const keyName = "fexonic_device_key";
    let key = window.localStorage.getItem(keyName);
    if (!key) {
      key = crypto.randomUUID();
      window.localStorage.setItem(keyName, key);
    }
    return key;
  }

  async function order() {
    if (
      !restaurant ||
      !p ||
      ordering
    ) {
      return;
    }

    const currentRestaurant =
      restaurant;

    const currentParams = p;

    const rows = items
      .filter(
        (item) => cart[item.id]
      )
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
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            restaurant_id:
              currentRestaurant.id,
            table_id:
              currentParams.tableId,
            items: rows,
            device_key: getDeviceKey(),
            device_name: "Customer Device",
          }),
        }
      );

      const text =
        await response.text();

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
          data?.error ||
            "Order failed"
        );
      }

      setCart({});
      setMsg("");
      setOrderSuccess({
        id: String(data.id),
        total: Number(data.total ?? total()),
      });
      playSuccessSound();
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

  function openSupport() {
    setSupportOpen(true);
    setSelectedRequest(null);
    setCustomMessage("");
    setRequestSent(false);
  }

  function closeSupport() {
    if (sendingRequest) return;

    setSupportOpen(false);
    setSelectedRequest(null);
    setCustomMessage("");
  }

  async function sendSupportRequest() {
    if (
      !restaurant ||
      !p ||
      !selectedRequest ||
      sendingRequest
    ) {
      return;
    }

    if (
      selectedRequest === "OTHER" &&
      !customMessage.trim()
    ) {
      return;
    }

    try {
      setSendingRequest(true);

      const response = await fetch(
        "/api/requests",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            restaurant_id:
              restaurant.id,
            table_id: p.tableId,
            type: selectedRequest,
            message:
              customMessage.trim() ||
              null,
          }),
        }
      );

      const text =
        await response.text();

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
          data?.error ||
            "Failed to send request"
        );
      }

      setRequestSent(true);

      setTimeout(() => {
        setSupportOpen(false);
        setSelectedRequest(null);
        setCustomMessage("");
        setRequestSent(false);
      }, 1400);
    } catch (error: any) {
      console.error(
        "Support request error:",
        error
      );

      setMsg(
        error?.message ||
          "Failed to send request"
      );
    } finally {
      setSendingRequest(false);
    }
  }

  if (loading) {
    return (
      <main className="customer-shell">
        <div className="customer-loading">
          <div className="customer-loading-mark">F</div>
          <div className="loading-line loading-line-lg" />
          <div className="loading-line" />
          <div className="loading-card">
            <div className="loading-image" />
            <div className="loading-copy">
              <div className="loading-line loading-line-sm" />
              <div className="loading-line" />
            </div>
          </div>
          <p>Preparing your menu…</p>
        </div>
      </main>
    );
  }

  if (msg && !restaurant) {
    return (
      <main className="customer-shell">
        <div className="customer-unavailable">
          <div className="status-icon">!</div>
          <div className="eyebrow">FEXONIC</div>
          <h1>Menu unavailable</h1>
          <p>{msg}</p>
        </div>
      </main>
    );
  }

  const itemCount = cartCount();
  const cartTotal = total();

  return (
    <main className="customer-shell">
      <header className="customer-header">
        <div className="customer-header-inner">
          <div className="customer-brand">
            <span className="brand-dot" />
            <span>{restaurant?.name || "FEXONIC"}</span>
          </div>

          <div className="table-badge">
            <span className="table-badge-dot" />
            Table
            <strong>{p?.tableId?.slice(0, 6) || "—"}</strong>
          </div>
        </div>
      </header>

      <section className="customer-hero">
        <div className="customer-hero-inner">
          <div className="eyebrow">DIGITAL MENU</div>
          <h1>{restaurant?.name}</h1>
          <p>
            {restaurant?.description ||
              "Choose your favourites and order directly from your table."}
          </p>

          <div className="hero-meta">
            <span>
              <span className="meta-dot" />
              Open for orders
            </span>
            <span>•</span>
            <span>Table service</span>
          </div>
        </div>
      </section>

      <section className="customer-content">
        <div className="menu-toolbar">
          <div>
            <div className="eyebrow">MENU</div>
            <h2>What would you like?</h2>
          </div>
          <span className="menu-count">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="empty-menu">
            <div className="empty-menu-icon">—</div>
            <h3>Menu unavailable</h3>
            <p>No items are available right now.</p>
          </div>
        ) : (
          <div className="customer-menu-grid">
            {items.map((item, index) => {
              const quantity = cart[item.id] || 0;

              return (
                <article className="customer-food-card" key={item.id}>
                  <div className="food-image-wrap">
                    {item.image?.url ? (
                      <img
                        className="foodimg"
                        src={item.image.url}
                        alt={item.image.alt || item.name}
                        loading={index < 2 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={index === 0 ? "high" : "auto"}
                      />
                    ) : (
                      <div className="food-placeholder">
                        <span>FEXONIC</span>
                      </div>
                    )}

                    {quantity > 0 && (
                      <div className="food-selected-badge">
                        {quantity} in cart
                      </div>
                    )}
                  </div>

                  <div className="customer-food-body">
                    <div className="food-title-row">
                      <div>
                        <h3>{item.name}</h3>
                        {item.description && (
                          <p>{item.description}</p>
                        )}
                      </div>
                      <strong>₹{item.price}</strong>
                    </div>

                    {quantity === 0 ? (
                      <button
                        className="food-add-btn"
                        type="button"
                        onClick={() => add(item.id)}
                        aria-label={`Add ${item.name} to cart`}
                      >
                        <span>Add to cart</span>
                        <span className="add-plus">+</span>
                      </button>
                    ) : (
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          aria-label={`Remove one ${item.name}`}
                        >
                          −
                        </button>
                        <strong>{quantity}</strong>
                        <button
                          type="button"
                          onClick={() => add(item.id)}
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="support-card"
          onClick={openSupport}
        >
          <span className="support-icon">✦</span>
          <span className="support-copy">
            <strong>Need something?</strong>
            <small>Ask the waiter for water, cutlery, tissue & more.</small>
          </span>
          <span className="support-arrow">→</span>
        </button>
      </section>

      {itemCount > 0 && (
        <div className="cart-dock">
          <div className="cart-dock-inner">
            <div className="cart-summary">
              <span className="cart-item-count">{itemCount}</span>
              <div>
                <strong>Your order</strong>
                <small>₹{cartTotal}</small>
              </div>
            </div>

            <button
              className="place-order-btn"
              type="button"
              onClick={order}
              disabled={ordering}
            >
              <span>{ordering ? "Placing order…" : "Place order"}</span>
              <span className="place-order-arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {supportOpen && (
        <div
          className="modal-backdrop"
          onClick={closeSupport}
          role="presentation"
        >
          <div
            className="support-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {requestSent ? (
              <div className="success-state compact-success">
                <div className="success-check">✓</div>
                <div className="eyebrow">REQUEST SENT</div>
                <h2>Waiter notified</h2>
                <p>Your request has been sent to the kitchen.</p>
              </div>
            ) : (
              <>
                <div className="modal-head">
                  <div>
                    <div className="eyebrow">TABLE SUPPORT</div>
                    <h2>Need something?</h2>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={closeSupport}
                    aria-label="Close support"
                  >
                    ×
                  </button>
                </div>

                <p className="modal-subtitle">
                  Choose what you need. The waiter will be notified.
                </p>

                <div className="request-grid">
                  {requestOptions.map((option) => {
                    const active = selectedRequest === option.type;

                    return (
                      <button
                        key={option.type}
                        type="button"
                        className={`request-option ${
                          active ? "active" : ""
                        }`}
                        onClick={() => setSelectedRequest(option.type)}
                      >
                        <span className="request-option-icon">
                          {option.icon}
                        </span>
                        <span>{option.label}</span>
                        {active && <span className="request-check">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {selectedRequest === "OTHER" && (
                  <textarea
                    className="support-textarea"
                    value={customMessage}
                    onChange={(event) =>
                      setCustomMessage(event.target.value)
                    }
                    placeholder="Tell the waiter what you need…"
                    maxLength={500}
                    rows={4}
                  />
                )}

                <button
                  type="button"
                  className="send-request-btn"
                  disabled={
                    !selectedRequest ||
                    sendingRequest ||
                    (selectedRequest === "OTHER" &&
                      !customMessage.trim())
                  }
                  onClick={sendSupportRequest}
                >
                  {sendingRequest ? "Sending…" : "Send request"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="modal-backdrop order-success-backdrop">
          <div className="order-success-modal" role="dialog" aria-modal="true">
            <div className="success-orbit">
              <div className="success-check">✓</div>
            </div>

            <div className="eyebrow">ORDER CONFIRMED</div>
            <h2>Order placed!</h2>
            <p>
              Your order has been sent to the kitchen. Sit back and relax.
            </p>

            <div className="order-success-summary">
              <span>
                Order <strong>#{orderSuccess.id.slice(0, 8)}</strong>
              </span>
              <strong>₹{orderSuccess.total}</strong>
            </div>

            <button
              type="button"
              className="success-done-btn"
              onClick={() => setOrderSuccess(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
