"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import "./customer.css";

type CustomerParams = {
  slug: string;
  tableId: string;
};

type CustomerSlotCode = "A" | "B" | "C" | "D";

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

type PriceFilter =
  | "ALL"
  | "UNDER_200"
  | "200_500"
  | "OVER_500"
  | "WITH_IMAGE";

const requestOptions: {
  type: RequestType;
  icon: string;
  label: string;
  description: string;
}[] = [
  {
    type: "WATER",
    icon: "💧",
    label: "Water",
    description: "Ask for drinking water",
  },
  {
    type: "CUTLERY",
    icon: "🍴",
    label: "Cutlery",
    description: "Spoon, fork or knife",
  },
  {
    type: "TISSUE",
    icon: "🧻",
    label: "Tissue",
    description: "Ask for tissues",
  },
  {
    type: "EXTRA_FOOD",
    icon: "🍛",
    label: "Extra food",
    description: "Need another serving",
  },
  {
    type: "CALL_WAITER",
    icon: "👋",
    label: "Call waiter",
    description: "Someone needs to assist",
  },
  {
    type: "OTHER",
    icon: "💬",
    label: "Something else",
    description: "Tell us what you need",
  },
];

function isCustomerSlot(
  value: string | null
): value is CustomerSlotCode {
  return (
    value === "A" ||
    value === "B" ||
    value === "C" ||
    value === "D"
  );
}

export default function Customer({
  params,
}: {
  params: Promise<CustomerParams>;
}) {
  const [p, setP] =
    useState<CustomerParams | null>(null);

  const [customerSlot, setCustomerSlot] =
    useState<CustomerSlotCode | null>(null);

  const customerLabel = customerSlot
    ? `Customer ${customerSlot}`
    : "Customer";

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [items, setItems] =
    useState<MenuItem[]>([]);

  const [cart, setCart] =
    useState<Record<string, number>>({});

  const [msg, setMsg] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [ordering, setOrdering] =
    useState(false);

  const [orderSuccess, setOrderSuccess] =
    useState<{
      id: string;
      total: number;
    } | null>(null);

  /*
   * =========================================================
   * ORDER NEED / NOTE
   * =========================================================
   */

  const [needOpen, setNeedOpen] =
    useState(false);

  const [orderNeed, setOrderNeed] =
    useState("");

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

  const [search, setSearch] =
    useState("");

  const [priceFilter, setPriceFilter] =
    useState<PriceFilter>("ALL");

  const [filterOpen, setFilterOpen] =
    useState(false);

  /* =========================================================
     PARAMS
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    params.then((value) => {
      if (!mounted) return;

      setP(value);

      if (typeof window !== "undefined") {
        const query =
          new URLSearchParams(
            window.location.search
          );

        const customer =
          query.get("customer");

        if (isCustomerSlot(customer)) {
          setCustomerSlot(customer);
        } else {
          setCustomerSlot(null);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  /* =========================================================
     LOAD MENU
  ========================================================== */

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

        setRestaurant(
          data.restaurant
        );

        setItems(
          data.items || []
        );
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

  /* =========================================================
     CART
  ========================================================== */

  function add(id: string) {
    setCart((current) => ({
      ...current,
      [id]:
        (current[id] || 0) + 1,
    }));
  }

  function remove(id: string) {
    setCart((current) => {
      const next = {
        ...current,
      };

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

  const itemCount = useMemo(
    () =>
      Object.values(cart).reduce(
        (sum, quantity) =>
          sum + quantity,
        0
      ),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
            (cart[item.id] || 0),
        0
      ),
    [items, cart]
  );

  /* =========================================================
     SEARCH + FILTER
  ========================================================== */

  const visibleItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name
          .toLowerCase()
          .includes(query) ||
        item.description
          ?.toLowerCase()
          .includes(query);

      let matchesFilter = true;

      if (
        priceFilter === "UNDER_200"
      ) {
        matchesFilter =
          Number(item.price) < 200;
      }

      if (
        priceFilter === "200_500"
      ) {
        matchesFilter =
          Number(item.price) >= 200 &&
          Number(item.price) <= 500;
      }

      if (
        priceFilter === "OVER_500"
      ) {
        matchesFilter =
          Number(item.price) > 500;
      }

      if (
        priceFilter === "WITH_IMAGE"
      ) {
        matchesFilter =
          Boolean(item.image?.url);
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    items,
    search,
    priceFilter,
  ]);

  const activeFilterLabel =
    priceFilter === "ALL"
      ? "All items"
      : priceFilter ===
        "UNDER_200"
      ? "Under ₹200"
      : priceFilter ===
        "200_500"
      ? "₹200 – ₹500"
      : priceFilter ===
        "OVER_500"
      ? "Above ₹500"
      : "With photos";

  /* =========================================================
     SUCCESS SOUND
  ========================================================== */

  function playSuccessSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const audioContext =
        new AudioContextClass();

      const now =
        audioContext.currentTime;

      const notes = [
        {
          frequency: 660,
          start: 0,
          duration: 0.11,
        },
        {
          frequency: 880,
          start: 0.09,
          duration: 0.16,
        },
      ];

      notes.forEach((note) => {
        const oscillator =
          audioContext.createOscillator();

        const gain =
          audioContext.createGain();

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
          now +
            note.start +
            note.duration
        );

        oscillator.connect(gain);
        gain.connect(
          audioContext.destination
        );

        oscillator.start(
          now + note.start
        );

        oscillator.stop(
          now +
            note.start +
            note.duration +
            0.02
        );
      });

      window.setTimeout(() => {
        audioContext
          .close()
          .catch(() => {});
      }, 700);
    } catch {
      // Browser may block audio.
    }
  }

  /* =========================================================
     DEVICE KEY
  ========================================================== */

  function getDeviceKey() {
    const keyName =
      "fexonic_device_key";

    let key =
      window.localStorage.getItem(
        keyName
      );

    if (!key) {
      key = crypto.randomUUID();

      window.localStorage.setItem(
        keyName,
        key
      );
    }

    return key;
  }

  /* =========================================================
     OPEN ORDER NEED
  ========================================================== */

  function openOrderNeed() {
    if (!restaurant || !p || ordering) {
      return;
    }

    if (!customerSlot) {
      setMsg(
        "This table QR is missing a customer code. Please scan the correct Customer A, B, C or D QR."
      );
      return;
    }

    const rows = items
      .filter(
        (item) =>
          cart[item.id] > 0
      );

    if (rows.length === 0) {
      setMsg(
        "Add something to your cart first."
      );
      return;
    }

    setOrderNeed("");
    setNeedOpen(true);
  }

  function closeOrderNeed() {
    if (ordering) return;

    setNeedOpen(false);
  }

  /* =========================================================
     PLACE ORDER
  ========================================================== */

  async function order() {
    if (!restaurant || !p || ordering) {
      return;
    }

    if (!customerSlot) {
      setMsg(
        "This table QR is missing a customer code. Please scan the correct Customer A, B, C or D QR."
      );
      return;
    }

    const rows = items
      .filter(
        (item) =>
          cart[item.id] > 0
      )
      .map((item) => ({
        menu_item_id: item.id,
        quantity: cart[item.id],
      }));

    if (rows.length === 0) {
      setMsg(
        "Add something to your cart first."
      );
      return;
    }

    setOrdering(true);
    setMsg("");

    try {
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
              restaurant.id,

            table_id:
              p.tableId,

            customer:
              customerSlot,

            items: rows,

            need:
              orderNeed.trim() ||
              null,

            device_key:
              getDeviceKey(),

            device_name:
              "Customer Device",
          }),
          cache: "no-store",
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
          "Invalid server response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not place your order."
        );
      }

      setNeedOpen(false);
      setOrderNeed("");
      setCart({});

      setOrderSuccess({
        id: String(data.id),
        total: Number(
          data.total ?? cartTotal
        ),
      });

      playSuccessSound();
    } catch (error: any) {
      console.error(
        "Order error:",
        error
      );

      setMsg(
        error?.message ||
          "Could not place your order."
      );
    } finally {
      setOrdering(false);
    }
  }

  /* =========================================================
     SUPPORT
  ========================================================== */

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
      selectedRequest ===
        "OTHER" &&
      !customMessage.trim()
    ) {
      return;
    }

    if (!customerSlot) {
      setMsg(
        "This table QR is missing a customer code."
      );
      return;
    }

    try {
      setSendingRequest(true);

      const response =
        await fetch(
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

              table_id:
                p.tableId,

              customer:
                customerSlot,

              type:
                selectedRequest,

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

  /* =========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <main className="fxc-customer">
        <div className="fxc-loading">
          <div className="fxc-loading-mark">
            F
          </div>

          <div className="fxc-skeleton-title" />

          <div className="fxc-skeleton-subtitle" />

          <div className="fxc-skeleton-card">
            <div className="fxc-skeleton-image" />

            <div className="fxc-skeleton-copy">
              <span />
              <span />
              <span />
            </div>
          </div>

          <p>
            Preparing your menu…
          </p>
        </div>
      </main>
    );
  }

  if (msg && !restaurant) {
    return (
      <main className="fxc-customer">
        <div className="fxc-unavailable">
          <div className="fxc-error-icon">
            !
          </div>

          <span className="fxc-kicker">
            FEXONIC
          </span>

          <h1>
            Menu unavailable
          </h1>

          <p>{msg}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fxc-customer">

      {/* STICKY HEADER */}

      <header className="fxc-header">
        <div className="fxc-header-inner">

          <div className="fxc-brand">
            <span className="fxc-brand-mark">
              F
            </span>

            <div>
              <strong>
                {restaurant?.name ||
                  "FEXONIC"}
              </strong>

              <span>
                Digital ordering
              </span>
            </div>
          </div>

          <div className="fxc-header-actions">

            <div className="fxc-table-pill">
              <span className="fxc-live-dot" />

              <span>
                TABLE
              </span>

              <strong>
                {p?.tableId?.slice(
                  0,
                  6
                ) || "—"}
              </strong>
            </div>

            {customerSlot && (
              <div
                className="fxc-table-pill"
                title={`Ordering as ${customerLabel}`}
              >
                <span className="fxc-live-dot" />

                <span>
                  CUSTOMER
                </span>

                <strong>
                  {customerSlot}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="fxc-help-button"
              onClick={openSupport}
              aria-label="Need something? Ask the waiter"
            >
              <span className="fxc-help-icon">
                ✦
              </span>

              <span className="fxc-help-copy">
                <strong>
                  Need something?
                </strong>

                <small>
                  Ask waiter
                </small>
              </span>

              <span className="fxc-help-arrow">
                →
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="fxc-hero">
        <div className="fxc-hero-inner">

          <div className="fxc-hero-badge">
            <span className="fxc-hero-dot" />

            ORDER FROM YOUR TABLE

            {customerSlot && (
              <>
                <span>·</span>
                {customerLabel.toUpperCase()}
              </>
            )}
          </div>

          <h1>
            {restaurant?.name}
          </h1>

          <p>
            {restaurant?.description ||
              "Browse the menu, choose your favourites and order in seconds."}
          </p>

          <div className="fxc-trust-row">

            <span>
              <b>✓</b>
              No app needed
            </span>

            <span>
              <b>✓</b>
              Table-linked order
            </span>

            <span>
              <b>✓</b>
              Direct kitchen order
            </span>

          </div>

        </div>
      </section>

      {/* MENU */}

      <section className="fxc-content">

        <div className="fxc-menu-intro">

          <div>
            <span className="fxc-kicker">
              MENU
            </span>

            <h2>
              What are you craving?
            </h2>

            <p>
              Find something you like
              and add it instantly.
            </p>
          </div>

          <div className="fxc-item-total">
            <strong>
              {items.length}
            </strong>

            <span>
              {items.length === 1
                ? "item"
                : "items"}
            </span>
          </div>

        </div>

        {/* SEARCH + FILTER */}

        <div className="fxc-discovery">

          <div className="fxc-search-box">

            <span className="fxc-search-icon">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search dishes..."
              aria-label="Search menu"
            />

            {search && (
              <button
                type="button"
                className="fxc-search-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>

          <button
            type="button"
            className={`fxc-filter-button ${
              priceFilter !== "ALL"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilterOpen(
                (value) => !value
              )
            }
          >
            <span>☷</span>

            <strong>
              Filter
            </strong>

            {priceFilter !== "ALL" && (
              <b>1</b>
            )}
          </button>

        </div>

        {filterOpen && (
          <div className="fxc-filter-panel">

            <div className="fxc-filter-heading">
              <div>
                <span>
                  FILTER MENU
                </span>

                <strong>
                  Find your range
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFilterOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="fxc-filter-options">

              {[
                {
                  id: "ALL",
                  label: "All items",
                },
                {
                  id: "UNDER_200",
                  label: "Under ₹200",
                },
                {
                  id: "200_500",
                  label: "₹200 – ₹500",
                },
                {
                  id: "OVER_500",
                  label: "Above ₹500",
                },
                {
                  id: "WITH_IMAGE",
                  label: "With photos",
                },
              ].map((option) => {
                const active =
                  priceFilter ===
                  option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      active
                        ? "active"
                        : ""
                    }
                    onClick={() => {
                      setPriceFilter(
                        option.id as PriceFilter
                      );

                      setFilterOpen(
                        false
                      );
                    }}
                  >
                    <span>
                      {option.label}
                    </span>

                    {active && (
                      <b>✓</b>
                    )}
                  </button>
                );
              })}

            </div>

          </div>
        )}

        {priceFilter !== "ALL" && (
          <div className="fxc-active-filter">

            <span>
              Showing:
            </span>

            <strong>
              {activeFilterLabel}
            </strong>

            <button
              type="button"
              onClick={() =>
                setPriceFilter(
                  "ALL"
                )
              }
            >
              Clear
            </button>

          </div>
        )}

        {items.length === 0 ? (
          <div className="fxc-empty">
            <div className="fxc-empty-icon">
              —
            </div>

            <span className="fxc-kicker">
              MENU
            </span>

            <h3>
              Menu unavailable
            </h3>

            <p>
              No items are available
              right now.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="fxc-empty">

            <div className="fxc-empty-icon">
              ⌕
            </div>

            <span className="fxc-kicker">
              NO MATCH
            </span>

            <h3>
              Nothing found
            </h3>

            <p>
              Try another search or
              filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPriceFilter(
                  "ALL"
                );
              }}
            >
              Show all items
            </button>

          </div>
        ) : (
          <div className="fxc-food-grid">

            {visibleItems.map(
              (item, index) => {
                const quantity =
                  cart[item.id] || 0;

                return (
                  <article
                    key={item.id}
                    className={`fxc-food-card ${
                      quantity > 0
                        ? "selected"
                        : ""
                    }`}
                  >

                    <div className="fxc-food-image">

                      {item.image?.url ? (
                        <img
                          src={
                            item.image.url
                          }
                          alt={
                            item.image
                              .alt ||
                            item.name
                          }
                          loading={
                            index < 3
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
                        <div className="fxc-food-placeholder">
                          <span>
                            F
                          </span>
                        </div>
                      )}

                      {quantity > 0 && (
                        <div className="fxc-selected">
                          <span>✓</span>
                          {quantity}
                        </div>
                      )}

                    </div>

                    <div className="fxc-food-content">

                      <div className="fxc-food-heading">

                        <div>
                          <h3>
                            {item.name}
                          </h3>

                          {item.description && (
                            <p>
                              {
                                item.description
                              }
                            </p>
                          )}
                        </div>

                        <strong>
                          ₹
                          {Number(
                            item.price
                          ).toFixed(0)}
                        </strong>

                      </div>

                      {quantity ===
                      0 ? (
                        <button
                          type="button"
                          className="fxc-add"
                          onClick={() =>
                            add(
                              item.id
                            )
                          }
                        >
                          <span>
                            Add
                          </span>

                          <b>
                            +
                          </b>
                        </button>
                      ) : (
                        <div className="fxc-quantity">

                          <button
                            type="button"
                            onClick={() =>
                              remove(
                                item.id
                              )
                            }
                          >
                            −
                          </button>

                          <div>
                            <strong>
                              {quantity}
                            </strong>

                            <span>
                              added
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              add(
                                item.id
                              )
                            }
                          >
                            +
                          </button>

                        </div>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

        <div className="fxc-bottom-space" />

      </section>

      {/* STICKY CART */}

      {itemCount > 0 && (
        <div className="fxc-cart-bar">

          <div className="fxc-cart-inner">

            <div className="fxc-cart-info">

              <div className="fxc-cart-count">
                {itemCount}
              </div>

              <div className="fxc-cart-summary">

                <span>
                  {itemCount === 1
                    ? "1 item selected"
                    : `${itemCount} items selected`}
                </span>

                <strong>
                  ₹{cartTotal.toFixed(0)}
                </strong>

              </div>

            </div>

            <button
              type="button"
              className="fxc-order-button"
              onClick={openOrderNeed}
              disabled={ordering}
            >
              {ordering ? (
                <>
                  <span className="fxc-order-spinner" />

                  <span>
                    Placing order...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Place order
                  </span>

                  <b>
                    →
                  </b>
                </>
              )}
            </button>

          </div>

          <div className="fxc-cart-trust">
            <span>✓</span>
            Secure table-linked ordering · Sent directly to kitchen
          </div>

        </div>
      )}

      {/* =====================================================
          ORDER NEED MODAL
      ====================================================== */}

      {needOpen && (
        <div
          className="fxc-modal-backdrop"
          onClick={closeOrderNeed}
        >
          <div
            className="fxc-order-need-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
          >

            <div className="fxc-modal-top">

              <div>
                <span className="fxc-modal-label">
                  ORDER NOTE
                </span>

                <h2>
                  Anything we should know?
                </h2>

                <p>
                  Add a special request for
                  your order.
                </p>
              </div>

              <button
                type="button"
                className="fxc-modal-close"
                onClick={closeOrderNeed}
                disabled={ordering}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <textarea
              className="fxc-order-need-input"
              value={orderNeed}
              onChange={(event) =>
                setOrderNeed(
                  event.target.value
                )
              }
              placeholder='Example: "Less spicy", "No onion", "Extra sauce"...'
              maxLength={500}
              rows={5}
              autoFocus
            />

            <div className="fxc-order-need-meta">
              <span>
                Optional
              </span>

              <span>
                {orderNeed.length}/500
              </span>
            </div>

            <button
              type="button"
              className="fxc-send-request"
              onClick={order}
              disabled={ordering}
            >
              {ordering
                ? "Placing order…"
                : "Submit & place order"}

              <span>
                →
              </span>
            </button>

            <div className="fxc-support-note">
              <span>✓</span>

              <p>
                Your note will be sent with
                this order to the kitchen.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* SUPPORT MODAL */}

      {supportOpen && (
        <div
          className="fxc-modal-backdrop"
          onClick={closeSupport}
        >
          <div
            className="fxc-support-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            role="dialog"
            aria-modal="true"
          >

            {requestSent ? (
              <div className="fxc-request-success">

                <div className="fxc-success-icon">
                  ✓
                </div>

                <span className="fxc-kicker">
                  REQUEST SENT
                </span>

                <h2>
                  Waiter notified
                </h2>

                <p>
                  Your request has been
                  sent to the kitchen.
                </p>

              </div>
            ) : (
              <>

                <div className="fxc-modal-top">

                  <div>
                    <span className="fxc-modal-label">
                      TABLE SUPPORT
                    </span>

                    <h2>
                      Need something?
                    </h2>

                    <p>
                      Choose what you need.
                      We'll notify the waiter.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="fxc-modal-close"
                    onClick={
                      closeSupport
                    }
                    aria-label="Close"
                  >
                    ×
                  </button>

                </div>

                <div className="fxc-request-grid">

                  {requestOptions.map(
                    (option) => {
                      const active =
                        selectedRequest ===
                        option.type;

                      return (
                        <button
                          key={
                            option.type
                          }
                          type="button"
                          className={`fxc-request ${
                            active
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedRequest(
                              option.type
                            )
                          }
                        >

                          <span className="fxc-request-icon">
                            {
                              option.icon
                            }
                          </span>

                          <span className="fxc-request-copy">

                            <strong>
                              {
                                option.label
                              }
                            </strong>

                            <small>
                              {
                                option.description
                              }
                            </small>

                          </span>

                          <span className="fxc-request-check">
                            {active
                              ? "✓"
                              : "›"}
                          </span>

                        </button>
                      );
                    }
                  )}

                </div>

                {selectedRequest ===
                  "OTHER" && (
                  <textarea
                    className="fxc-support-input"
                    value={
                      customMessage
                    }
                    onChange={(event) =>
                      setCustomMessage(
                        event.target
                          .value
                      )
                    }
                    placeholder="Tell the waiter what you need…"
                    maxLength={500}
                    rows={4}
                  />
                )}

                <button
                  type="button"
                  className="fxc-send-request"
                  disabled={
                    !selectedRequest ||
                    sendingRequest ||
                    (selectedRequest ===
                      "OTHER" &&
                      !customMessage.trim())
                  }
                  onClick={
                    sendSupportRequest
                  }
                >
                  {sendingRequest
                    ? "Sending request…"
                    : "Notify waiter"}

                  <span>
                    →
                  </span>
                </button>

                <div className="fxc-support-note">

                  <span>✓</span>

                  <p>
                    Your request is linked
                    to Table{" "}
                    <strong>
                      {p?.tableId?.slice(
                        0,
                        6
                      )}
                    </strong>

                    {customerSlot && (
                      <>
                        {" · "}
                        <strong>
                          {customerLabel}
                        </strong>
                      </>
                    )}
                  </p>

                </div>

              </>
            )}

          </div>
        </div>
      )}

      {/* ORDER SUCCESS */}

      {orderSuccess && (
        <div className="fxc-modal-backdrop">

          <div
            className="fxc-order-success"
            role="dialog"
            aria-modal="true"
          >

            <div className="fxc-success-ring">
              <div>
                ✓
              </div>
            </div>

            <span className="fxc-kicker">
              ORDER CONFIRMED
            </span>

            <h2>
              You're all set.
            </h2>

            <p>
              Your order has been
              sent to the kitchen.
              Sit back and relax.
            </p>

            <div className="fxc-success-details">

              <div>
                <span>
                  Order
                </span>

                <strong>
                  #
                  {orderSuccess.id.slice(
                    0,
                    8
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Total
                </span>

                <strong>
                  ₹
                  {orderSuccess.total.toFixed(
                    0
                  )}
                </strong>
              </div>

            </div>

            <button
              type="button"
              className="fxc-success-done"
              onClick={() =>
                setOrderSuccess(
                  null
                )
              }
            >
              Continue
            </button>

          </div>

        </div>
      )}

      {/* ERROR TOAST */}

      {msg && restaurant && (
        <div className="fxc-error-toast">

          <span>!</span>

          <p>{msg}</p>

          <button
            type="button"
            onClick={() =>
              setMsg("")
            }
          >
            ×
          </button>

        </div>
      )}

    </main>
  );
}