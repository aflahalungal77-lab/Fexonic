"use client";

import { useCallback, useEffect, useState } from "react";
import KitchenShell from "@/components/KitchenShell";
import { supabaseBrowser } from "@/lib/supabase";

type RequestItem = {
  id: string;
  type: "TISSUE" | "CUTLERY" | "WATER" | "EXTRA_FOOD" | "CALL_WAITER" | "OTHER";
  message: string | null;
  status: "PENDING" | "DONE";
  created_at: string;
  table_id: string;
  tables?: { name: string } | null;
};

const labels: Record<RequestItem["type"], string> = {
  TISSUE: "Tissue needed",
  CUTLERY: "Cutlery needed",
  WATER: "Water needed",
  EXTRA_FOOD: "Extra food",
  CALL_WAITER: "Call waiter",
  OTHER: "Customer request",
};

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | RequestItem["type"]>("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ slug: currentSlug }) => setSlug(currentSlug));
  }, [params]);

  const load = useCallback(async () => {
    if (!slug) return;

    const s = supabaseBrowser();

    const { data: r } = await s
      .from("restaurants")
      .select("id,name,slug")
      .eq("slug", slug)
      .single();

    if (!r) return;
    setRestaurant(r);

    const { data } = await s
      .from("customer_requests")
      .select("id,type,message,status,created_at,table_id,tables(name)")
      .eq("restaurant_id", r.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(50);

    setRequests(data || []);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [load, restaurant?.id]);

  async function done(id: string) {
    setBusy(id);

    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "DONE" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not complete request");
      await load();
    } catch (error: any) {
      window.alert(error?.message || "Could not complete request");
    } finally {
      setBusy(null);
    }
  }

  if (!restaurant) {
    return (
      <main className="fx-app">
        <div className="fx-loading-screen">
          <div className="fx-loading-card">
            <div className="fx-logo-mark">F</div>
            <strong>Loading requests</strong>
            <p>Preparing your workspace…</p>
          </div>
        </div>
      </main>
    );
  }

  const visible =
    filter === "ALL"
      ? requests
      : requests.filter((request) => request.type === filter);

  const groups: Array<["ALL" | RequestItem["type"], string]> = [
    ["ALL", "All"],
    ["CALL_WAITER", "Call staff"],
    ["WATER", "Water"],
    ["TISSUE", "Tissue"],
    ["CUTLERY", "Cutlery"],
    ["EXTRA_FOOD", "Extra food"],
  ];

  return (
    <KitchenShell
      slug={slug}
      restaurant={restaurant}
      active="requests"
      requests={requests.length}
    >
      <section className="fx-welcome-row">
        <div>
          <p className="fx-kicker">CUSTOMER SUPPORT</p>
          <h1>Requests<span>.</span></h1>
          <p className="fx-muted">
            Live requests from guests at your tables.
          </p>
        </div>

        <button className="fx-button fx-button-light" onClick={load}>
          ↻ Refresh
        </button>
      </section>

      <div className="fx-request-tabs">
        {groups.map(([key, label]) => (
          <button
            key={key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="fx-request-page-grid">
        {loading ? (
          <div className="fx-empty-card">
            <strong>Loading requests…</strong>
          </div>
        ) : visible.length === 0 ? (
          <div className="fx-empty-card">
            <div className="fx-empty-icon">✓</div>
            <strong>No pending requests</strong>
            <p className="fx-muted">You are all caught up.</p>
          </div>
        ) : (
          visible.map((request) => (
            <article className="fx-request-card fx-request-page-card" key={request.id}>
              <div className="fx-request-icon">♧</div>

              <div className="fx-request-content">
                <div className="fx-request-title-row">
                  <strong>{request.tables?.name || "Table"}</strong>
                  <span>{time(request.created_at)}</span>
                </div>
                <span>{labels[request.type]}</span>
                {request.message && <small>{request.message}</small>}

                <button
                  className="fx-button fx-button-dark"
                  disabled={busy === request.id}
                  onClick={() => done(request.id)}
                >
                  {busy === request.id ? "Completing…" : "✓ Completed"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </KitchenShell>
  );
}
