"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function Billing({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(currentSlug: string) {
    setLoading(true);

    try {
      const s = supabaseBrowser();

      // Find restaurant
      const { data: r, error: restaurantError } = await s
        .from("restaurants")
        .select("id,name,slug")
        .eq("slug", currentSlug)
        .single();

      if (restaurantError || !r) {
        console.error(
          "Restaurant loading error:",
          restaurantError
        );
        setLoading(false);
        return;
      }

      setRestaurant(r);

      // Load bills
      const { data, error } = await s
        .from("bills")
        .select(
          "*,orders(id,status,table_id,tables(name),order_items(name,price,quantity))"
        )
        .eq("restaurant_id", r.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        console.error(
          "Billing load error:",
          error
        );

        setBills([]);
        setLoading(false);
        return;
      }

      setBills(data || []);
    } catch (error) {
      console.error(
        "Billing page error:",
        error
      );

      setBills([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    params.then(({ slug: currentSlug }) => {
      setSlug(currentSlug);
      load(currentSlug);
    });
  }, [params]);

  const revenue = bills
    .filter(
      (bill) => bill.status !== "CANCELLED"
    )
    .reduce(
      (sum, bill) =>
        sum + Number(bill.total || 0),
      0
    );

  const printedBills = bills.filter(
    (bill) => bill.printed
  ).length;

  const openBills = bills.filter(
    (bill) => bill.status === "OPEN"
  ).length;

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ marginTop: 40 }}
        >
          <div className="eyebrow">
            BILLING
          </div>

          <h2 style={{ marginTop: 10 }}>
            Loading billing...
          </h2>

          <p className="muted">
            Loading customer bills.
          </p>
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="container">
        <div
          className="card"
          style={{ marginTop: 40 }}
        >
          <h2>
            Restaurant not found
          </h2>

          <p className="muted">
            We could not find this restaurant.
          </p>

          <a
            className="btn"
            href="/kitchen"
            style={{ marginTop: 15 }}
          >
            Back
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* HEADER */}

      <header className="top">
        <a
          className="brand"
          href={`/k/${slug}`}
        >
          FEXONIC
        </a>

        <a
          className="btn light"
          href={`/k/${slug}`}
        >
          Back to kitchen
        </a>
      </header>

      {/* HERO */}

      <section className="dashboard-hero">
        <div className="eyebrow">
          BILLING
        </div>

        <h1>{restaurant.name}</h1>

        <p className="muted">
          Customer bills generated from
          Fexonic orders.
        </p>
      </section>

      {/* STATS */}

      <section className="grid grid4">
        <div className="card stat">
          <span className="muted smalltext">
            Total bills
          </span>

          <strong>
            {bills.length}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Printed
          </span>

          <strong>
            {printedBills}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Open bills
          </span>

          <strong>
            {openBills}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Revenue
          </span>

          <strong>
            ₹{revenue.toFixed(0)}
          </strong>
        </div>
      </section>

      {/* BILL HISTORY */}

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">
              BILL HISTORY
            </div>

            <h2
              style={{
                marginTop: 7,
                marginBottom: 0,
              }}
            >
              Recent bills
            </h2>

            <p className="muted smalltext">
              View and print bills generated
              from customer orders.
            </p>
          </div>

          <button
            className="btn light small"
            onClick={() => load(slug)}
          >
            Refresh
          </button>
        </div>

        <div
          className="list"
          style={{ marginTop: 20 }}
        >
          {bills.length === 0 && (
            <div
              className="item"
              style={{
                textAlign: "center",
                padding: 35,
              }}
            >
              <b>No bills yet</b>

              <p className="muted smalltext">
                Bills will appear here after
                customer orders are created.
              </p>
            </div>
          )}

          {bills.map((bill) => (
            <div
              className="item"
              key={bill.id}
            >
              {/* BILL TOP */}

              <div className="row">
                <div>
                  <b>
                    Bill #{bill.bill_number}
                  </b>

                  <div
                    className="muted smalltext"
                    style={{
                      marginTop: 5,
                    }}
                  >
                    {bill.orders?.tables
                      ?.name ||
                      "Table"}{" "}
                    · Order #
                    {String(
                      bill.order_id
                    ).slice(0, 8)}
                  </div>
                </div>

                <strong>
                  ₹
                  {Number(
                    bill.total || 0
                  ).toFixed(2)}
                </strong>
              </div>

              {/* ORDER ITEMS */}

              {bill.orders
                ?.order_items
                ?.length > 0 && (
                <div
                  style={{
                    marginTop: 15,
                    padding: 13,
                    borderRadius: 12,
                    background:
                      "rgba(0,0,0,0.035)",
                  }}
                >
                  {bill.orders.order_items.map(
                    (item: any) => (
                      <div
                        key={item.id}
                        className="row"
                        style={{
                          padding:
                            "5px 0",
                        }}
                      >
                        <span>
                          {item.name} ×{" "}
                          {item.quantity}
                        </span>

                        <span>
                          ₹
                          {(
                            Number(
                              item.price
                            ) *
                            Number(
                              item.quantity
                            )
                          ).toFixed(2)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ACTIONS */}

              <div
                className="actions"
                style={{
                  marginTop: 15,
                }}
              >
                <span className="pill">
                  {bill.status}
                </span>

                <span className="pill">
                  {bill.printed
                    ? "PRINTED"
                    : "NOT PRINTED"}
                </span>

                <a
                  className="btn small"
                  href={`/k/${slug}/bill/${bill.order_id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🖨 Print Bill
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BACK */}

      <section
        className="dashboard-section"
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <a
          className="btn light"
          href={`/k/${slug}`}
        >
          ← Back to Kitchen
        </a>
      </section>

      <footer className="footer">
        Fexonic Billing · {restaurant.name}
      </footer>
    </main>
  );
}