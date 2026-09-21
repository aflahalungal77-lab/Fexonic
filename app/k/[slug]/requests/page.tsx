"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase";
import KitchenShell from "@/components/KitchenShell";

type RequestType =
  | "TISSUE"
  | "CUTLERY"
  | "WATER"
  | "EXTRA_FOOD"
  | "CALL_WAITER"
  | "OTHER";

type CustomerRequest = {
  id: string;
  restaurant_id: string;
  table_id: string;
  type: RequestType;
  message: string | null;
  status: "PENDING" | "DONE";
  created_at: string;
  tables?: {
    name: string;
  } | null;
};

type RequestFilter =
  | "ALL"
  | "CALL_WAITER"
  | "WATER"
  | "TISSUE"
  | "CUTLERY"
  | "EXTRA_FOOD"
  | "OTHER";

const requestLabels: Record<
  RequestType,
  string
> = {
  CALL_WAITER: "Call staff",
  WATER: "Water",
  TISSUE: "Tissue",
  CUTLERY: "Cutlery",
  EXTRA_FOOD: "Extra food",
  OTHER: "Other request",
};

const requestIcons: Record<
  RequestType,
  string
> = {
  CALL_WAITER: "♧",
  WATER: "◉",
  TISSUE: "▤",
  CUTLERY: "✦",
  EXTRA_FOOD: "♨",
  OTHER: "•",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

export default function RequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] =
    useState<any>(null);

  const [requests, setRequests] = useState<
    CustomerRequest[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [busyRequest, setBusyRequest] =
    useState<string | null>(null);

  const [selectedRequest, setSelectedRequest] =
    useState<CustomerRequest | null>(null);

  const [filter, setFilter] =
    useState<RequestFilter>("ALL");

  useEffect(() => {
    params.then((value) => {
      setSlug(value.slug);
    });
  }, [params]);

  const loadRequests = useCallback(
    async () => {
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
          .eq(
            "restaurant_id",
            restaurantData.id
          )
          .eq("status", "PENDING")
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

        if (error) {
          throw error;
        }

        setRequests(data || []);
      } catch (error) {
        console.error(
          "Requests loading error:",
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, slug]
  );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!restaurant?.id) return;

    const interval = window.setInterval(
      loadRequests,
      5000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [loadRequests, restaurant?.id]);

  async function completeRequest(
    requestId: string
  ) {
    setBusyRequest(requestId);

    try {
      const response = await fetch(
        "/api/requests",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: requestId,
            status: "DONE",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not complete request"
        );
      }

      setSelectedRequest(null);

      await loadRequests();
    } catch (error: any) {
      window.alert(
        error?.message ||
          "Could not complete request"
      );
    } finally {
      setBusyRequest(null);
    }
  }

  const counts = useMemo(() => {
    return {
      all: requests.length,

      callWaiter: requests.filter(
        (item) =>
          item.type === "CALL_WAITER"
      ).length,

      water: requests.filter(
        (item) => item.type === "WATER"
      ).length,

      tissue: requests.filter(
        (item) => item.type === "TISSUE"
      ).length,

      cutlery: requests.filter(
        (item) => item.type === "CUTLERY"
      ).length,

      extraFood: requests.filter(
        (item) =>
          item.type === "EXTRA_FOOD"
      ).length,

      other: requests.filter(
        (item) => item.type === "OTHER"
      ).length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (filter === "ALL") {
      return requests;
    }

    return requests.filter(
      (request) =>
        request.type === filter
    );
  }, [filter, requests]);

  function changeFilter(
    nextFilter: RequestFilter
  ) {
    setFilter(nextFilter);
  }

  if (!restaurant && loading) {
    return (
      <main className="fx-app">
        <div className="kr-loading">
          <div className="kr-loading-card">
            <div className="kr-loading-mark">
              M
            </div>

            <strong>Man.ko</strong>

            <span>
              Loading customer requests…
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
      active="requests"
      newOrders={0}
      requests={requests.length}
    >
      <div className="kr-page">
        {/* HEADER */}

        <section className="kr-page-header">
          <div>
            <p className="kr-eyebrow">
              CUSTOMER SUPPORT
            </p>

            <h1>Requests</h1>

            <p className="kr-subtitle">
              Help guests quickly and keep
              every table taken care of.
            </p>
          </div>

          <button
            type="button"
            className="kr-refresh"
            onClick={loadRequests}
            disabled={refreshing}
          >
            <span
              className={
                refreshing
                  ? "kr-refresh-icon kr-spin"
                  : "kr-refresh-icon"
              }
            >
              ↻
            </span>

            <span className="kr-refresh-text">
              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </span>
          </button>
        </section>

        {/* ACTION NEEDED */}

        <section
          className={
            requests.length > 0
              ? "kr-action-card kr-action-active"
              : "kr-action-card"
          }
        >
          <div className="kr-action-icon">
            {requests.length > 0
              ? "!"
              : "✓"}
          </div>

          <div className="kr-action-content">
            <span>
              {requests.length > 0
                ? "ACTION NEEDED"
                : "ALL CLEAR"}
            </span>

            <strong>
              {requests.length > 0
                ? `${requests.length} pending ${
                    requests.length === 1
                      ? "request"
                      : "requests"
                  }`
                : "No pending requests"}
            </strong>

            <small>
              {requests.length > 0
                ? "Guests are waiting for assistance."
                : "You are all caught up."}
            </small>
          </div>

          {requests.length > 0 && (
            <div className="kr-action-count">
              {requests.length}
            </div>
          )}
        </section>

        {/* REQUEST SUMMARY */}

        <section className="kr-summary">
          <div className="kr-summary-card">
            <span className="kr-summary-icon">
              ♧
            </span>

            <div>
              <small>Call staff</small>
              <strong>
                {counts.callWaiter}
              </strong>
            </div>
          </div>

          <div className="kr-summary-card kr-water">
            <span className="kr-summary-icon">
              ◉
            </span>

            <div>
              <small>Water</small>
              <strong>
                {counts.water}
              </strong>
            </div>
          </div>

          <div className="kr-summary-card kr-tissue">
            <span className="kr-summary-icon">
              ▤
            </span>

            <div>
              <small>Tissue</small>
              <strong>
                {counts.tissue}
              </strong>
            </div>
          </div>

          <div className="kr-summary-card kr-food">
            <span className="kr-summary-icon">
              ♨
            </span>

            <div>
              <small>Extra food</small>
              <strong>
                {counts.extraFood}
              </strong>
            </div>
          </div>
        </section>

        {/* FILTERS */}

        <section className="kr-filter-wrap">
          <div className="kr-filter-scroll">
            <button
              type="button"
              className={
                filter === "ALL"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter("ALL")
              }
            >
              <span>All</span>
              <b>{counts.all}</b>
            </button>

            <button
              type="button"
              className={
                filter === "CALL_WAITER"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter(
                  "CALL_WAITER"
                )
              }
            >
              <span>Call staff</span>
              <b>
                {counts.callWaiter}
              </b>
            </button>

            <button
              type="button"
              className={
                filter === "WATER"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter("WATER")
              }
            >
              <span>Water</span>
              <b>{counts.water}</b>
            </button>

            <button
              type="button"
              className={
                filter === "TISSUE"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter("TISSUE")
              }
            >
              <span>Tissue</span>
              <b>{counts.tissue}</b>
            </button>

            <button
              type="button"
              className={
                filter === "CUTLERY"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter("CUTLERY")
              }
            >
              <span>Cutlery</span>
              <b>{counts.cutlery}</b>
            </button>

            <button
              type="button"
              className={
                filter === "EXTRA_FOOD"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter(
                  "EXTRA_FOOD"
                )
              }
            >
              <span>Extra food</span>
              <b>{counts.extraFood}</b>
            </button>

            <button
              type="button"
              className={
                filter === "OTHER"
                  ? "kr-filter active"
                  : "kr-filter"
              }
              onClick={() =>
                changeFilter("OTHER")
              }
            >
              <span>Other</span>
              <b>{counts.other}</b>
            </button>
          </div>
        </section>

        {/* REQUEST LIST */}

        <section className="kr-list-section">
          <div className="kr-section-heading">
            <div>
              <p className="kr-eyebrow">
                LIVE REQUESTS
              </p>

              <h2>
                {filter === "ALL"
                  ? "Customer requests"
                  : requestLabels[
                      filter as RequestType
                    ]}
              </h2>
            </div>

            <span className="kr-live">
              <i />
              Live
            </span>
          </div>

          {loading ? (
            <div className="kr-request-grid">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    className="kr-skeleton-card"
                    key={item}
                  >
                    <div className="kr-skeleton kr-sk-icon" />
                    <div className="kr-sk-body">
                      <div className="kr-skeleton kr-sk-title" />
                      <div className="kr-skeleton kr-sk-line" />
                      <div className="kr-skeleton kr-sk-line-small" />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="kr-empty">
              <div className="kr-empty-icon">
                ✓
              </div>

              <h3>
                {filter === "ALL"
                  ? "No pending requests"
                  : `No ${requestLabels[
                      filter as RequestType
                    ].toLowerCase()}`}
              </h3>

              <p>
                New customer requests will
                appear here automatically.
              </p>

              {filter !== "ALL" && (
                <button
                  type="button"
                  onClick={() =>
                    changeFilter("ALL")
                  }
                >
                  View all requests
                </button>
              )}
            </div>
          ) : (
            <div className="kr-request-grid">
              {filteredRequests.map(
                (request) => (
                  <article
                    className={`kr-request-card kr-request-${request.type.toLowerCase()}`}
                    key={request.id}
                  >
                    <div className="kr-request-top">
                      <div
                        className={`kr-request-type kr-type-${request.type.toLowerCase()}`}
                      >
                        <span>
                          {
                            requestIcons[
                              request.type
                            ]
                          }
                        </span>

                        {
                          requestLabels[
                            request.type
                          ]
                        }
                      </div>

                      <span className="kr-time">
                        {formatTime(
                          request.created_at
                        )}
                      </span>
                    </div>

                    <div className="kr-request-main">
                      <div className="kr-big-icon">
                        {
                          requestIcons[
                            request.type
                          ]
                        }
                      </div>

                      <div>
                        <h3>
                          {request.tables
                            ?.name ||
                            "Table"}
                        </h3>

                        <p>
                          {
                            requestLabels[
                              request.type
                            ]
                          }
                        </p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="kr-message">
                        <span>“</span>
                        {request.message}
                        <span>”</span>
                      </div>
                    )}

                    <div className="kr-request-meta">
                      <span>
                        {formatDate(
                          request.created_at
                        )}
                      </span>

                      <span>•</span>

                      <span>
                        {formatTime(
                          request.created_at
                        )}
                      </span>
                    </div>

                    <div className="kr-request-actions">
                      <button
                        type="button"
                        className="kr-button kr-button-light"
                        onClick={() =>
                          setSelectedRequest(
                            request
                          )
                        }
                      >
                        View
                      </button>

                      <button
                        type="button"
                        className="kr-button kr-button-dark"
                        disabled={
                          busyRequest ===
                          request.id
                        }
                        onClick={() =>
                          completeRequest(
                            request.id
                          )
                        }
                      >
                        {busyRequest ===
                        request.id
                          ? "Updating..."
                          : "Done ✓"}
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        <div className="kr-mobile-space" />
      </div>

      {/* REQUEST DETAIL */}

      {selectedRequest && (
        <div
          className="kr-detail-overlay"
          onClick={() =>
            setSelectedRequest(null)
          }
        >
          <div
            className="kr-detail-sheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="kr-detail-handle" />

            <div className="kr-detail-header">
              <div>
                <div
                  className={`kr-request-type kr-type-${selectedRequest.type.toLowerCase()}`}
                >
                  <span>
                    {
                      requestIcons[
                        selectedRequest.type
                      ]
                    }
                  </span>

                  {
                    requestLabels[
                      selectedRequest.type
                    ]
                  }
                </div>

                <h2>
                  {selectedRequest.tables
                    ?.name || "Table"}
                </h2>

                <p>
                  {formatDate(
                    selectedRequest.created_at
                  )}{" "}
                  •{" "}
                  {formatTime(
                    selectedRequest.created_at
                  )}
                </p>
              </div>

              <button
                type="button"
                className="kr-detail-close"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                ×
              </button>
            </div>

            <div className="kr-detail-content">
              <span className="kr-detail-label">
                REQUEST
              </span>

              <strong>
                {
                  requestLabels[
                    selectedRequest.type
                  ]
                }
              </strong>

              {selectedRequest.message && (
                <>
                  <span className="kr-detail-label kr-detail-message-label">
                    MESSAGE
                  </span>

                  <div className="kr-detail-message">
                    {selectedRequest.message}
                  </div>
                </>
              )}
            </div>

            <div className="kr-detail-actions">
              <button
                type="button"
                className="kr-button kr-button-light"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                Close
              </button>

              <button
                type="button"
                className="kr-button kr-button-dark"
                disabled={
                  busyRequest ===
                  selectedRequest.id
                }
                onClick={() =>
                  completeRequest(
                    selectedRequest.id
                  )
                }
              >
                {busyRequest ===
                selectedRequest.id
                  ? "Updating..."
                  : "Mark as done ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </KitchenShell>
  );
}