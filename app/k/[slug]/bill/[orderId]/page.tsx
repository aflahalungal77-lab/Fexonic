"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

type Bill = {
  id: string;
  order_id: string;
  bill_number: number;
  total: number;
  status: string;
  printed: boolean;
  printed_at: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  status: string;
  total: number;
  table_id: string;
  created_at: string;
  tables?: {
    name: string;
  } | null;
  order_items?: OrderItem[];
};

export default function BillPage() {
  const params = useParams();

  const slug = String(params.slug);
  const orderId = String(params.orderId);

  const [bill, setBill] = useState<Bill | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBill() {
    try {
      setLoading(true);
      setError("");

      const s = supabaseBrowser();

      /* --------------------------------
         RESTAURANT
      -------------------------------- */

      const { data: restaurantData, error: restaurantError } =
        await s
          .from("restaurants")
          .select("*")
          .eq("slug", slug)
          .single();

      if (restaurantError || !restaurantData) {
        throw new Error("Restaurant not found");
      }

      setRestaurant(restaurantData);

      /* --------------------------------
         BILL
         IMPORTANT:
         URL contains ORDER ID
      -------------------------------- */

      const { data: billData, error: billError } =
        await s
          .from("bills")
          .select("*")
          .eq("order_id", orderId)
          .eq("restaurant_id", restaurantData.id)
          .maybeSingle();

      if (billError) {
        throw new Error(billError.message);
      }

      if (!billData) {
        throw new Error("Bill not found");
      }

      setBill(billData);

      /* --------------------------------
         ORDER
      -------------------------------- */

      const { data: orderData, error: orderError } =
        await s
          .from("orders")
          .select(
            "id,status,total,table_id,created_at,tables(name),order_items(*)"
          )
          .eq("id", orderId)
          .eq("restaurant_id", restaurantData.id)
          .single();

      if (orderError || !orderData) {
        throw new Error("Order not found");
      }

      setOrder(orderData as Order);
    } catch (err: any) {
      console.error("Bill loading error:", err);
      setError(err?.message || "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug || !orderId) return;

    loadBill();
  }, [slug, orderId]);

  async function printBill() {
    if (!bill) return;

    try {
      /*
       * Mark bill as printed.
       * We update through Supabase first.
       */

      const s = supabaseBrowser();

      const { error } = await s
        .from("bills")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      if (error) {
        console.error("Print status update error:", error);
      } else {
        setBill((current) =>
          current
            ? {
                ...current,
                printed: true,
                printed_at: new Date().toISOString(),
              }
            : current
        );
      }

      /*
       * Open browser print dialog
       */

      window.print();
    } catch (err) {
      console.error(err);
      window.print();
    }
  }

  if (loading) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            marginTop: 60,
            textAlign: "center",
            padding: 50,
          }}
        >
          <div className="eyebrow">FEXONIC BILLING</div>

          <h2 style={{ marginTop: 10 }}>
            Loading bill...
          </h2>

          <p className="muted">
            Preparing your customer bill.
          </p>
        </div>
      </main>
    );
  }

  if (error || !bill || !order) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            marginTop: 60,
            textAlign: "center",
            padding: 50,
          }}
        >
          <div className="eyebrow">FEXONIC BILLING</div>

          <h2 style={{ marginTop: 10 }}>
            Bill unavailable
          </h2>

          <p className="muted">
            {error || "Bill not found"}
          </p>

          <a
            className="btn light"
            href={`/k/${slug}/billing`}
            style={{ marginTop: 20 }}
          >
            ← Back to billing
          </a>
        </div>
      </main>
    );
  }

  const items = order.order_items || [];

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) * Number(item.quantity),
    0
  );

  const billTotal = Number(bill.total);

  const createdAt = new Date(
    bill.created_at
  ).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      {/* --------------------------------
          SCREEN UI
      -------------------------------- */}

      <main className="container bill-page">
        {/* TOP NAV */}

        <header
          className="top no-print"
          style={{ marginBottom: 25 }}
        >
          <div className="brand">
            FEXONIC
          </div>

          <div className="nav">
            <a
              className="btn light small"
              href={`/k/${slug}/billing`}
            >
              ← Billing
            </a>

            <button
              className="btn small"
              onClick={printBill}
            >
              🖨 Print Bill
            </button>
          </div>
        </header>

        {/* BILL */}

        <section className="bill-wrapper">
          <div className="bill-paper">
            {/* RESTAURANT HEADER */}

            <div className="bill-header">
              <div className="bill-logo">
                FEXONIC
              </div>

              <h1>
                {restaurant?.name}
              </h1>

              <p>
                Customer Bill
              </p>
            </div>

            <div className="bill-line" />

            {/* BILL META */}

            <div className="bill-meta">
              <div>
                <span>Bill No.</span>
                <strong>
                  #{bill.bill_number}
                </strong>
              </div>

              <div>
                <span>Order</span>
                <strong>
                  #{order.id.slice(0, 8)}
                </strong>
              </div>

              <div>
                <span>Table</span>
                <strong>
                  {order.tables?.name ||
                    "Table"}
                </strong>
              </div>

              <div>
                <span>Date</span>
                <strong>
                  {createdAt}
                </strong>
              </div>
            </div>

            <div className="bill-line" />

            {/* ITEMS */}

            <div className="bill-items">
              <div className="bill-item bill-item-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Amount</span>
              </div>

              {items.map((item) => {
                const amount =
                  Number(item.price) *
                  Number(item.quantity);

                return (
                  <div
                    className="bill-item"
                    key={item.id}
                  >
                    <span>
                      {item.name}
                    </span>

                    <span>
                      {item.quantity}
                    </span>

                    <span>
                      ₹
                      {amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bill-line" />

            {/* TOTAL */}

            <div className="bill-summary">
              <div>
                <span>Subtotal</span>
                <strong>
                  ₹{subtotal.toFixed(2)}
                </strong>
              </div>

              <div className="bill-total">
                <span>Total</span>

                <strong>
                  ₹{billTotal.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="bill-line" />

            {/* STATUS */}

            <div className="bill-status">
              <span
                className="bill-status-pill"
              >
                {bill.status}
              </span>

              {bill.printed && (
                <span className="bill-printed">
                  ✓ Printed
                </span>
              )}
            </div>

            {/* FOOTER */}

            <div className="bill-footer">
              <strong>
                Thank you for ordering!
              </strong>

              <span>
                Powered by Fexonic
              </span>

              <span>
                Order #{order.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </section>

        {/* BOTTOM ACTIONS */}

        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            margin: "25px 0 50px",
          }}
        >
          <a
            className="btn light"
            href={`/k/${slug}/billing`}
          >
            ← Back to billing
          </a>

          <button
            className="btn"
            onClick={printBill}
          >
            🖨 Print Bill
          </button>
        </div>

        <footer className="footer no-print">
          Fexonic Billing ·{" "}
          {restaurant?.name}
        </footer>
      </main>

      {/* --------------------------------
          BILL PRINT CSS
      -------------------------------- */}

      <style jsx global>{`
        .bill-page {
          padding-bottom: 20px;
        }

        .bill-wrapper {
          display: flex;
          justify-content: center;
        }

        .bill-paper {
          width: 100%;
          max-width: 760px;

          background: #fff;

          border: 1px solid #dfe3de;

          border-radius: 22px;

          padding: 45px;

          box-shadow:
            0 25px 70px rgba(0, 0, 0, 0.08);
        }

        .bill-header {
          text-align: center;
        }

        .bill-logo {
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.16em;
          margin-bottom: 18px;
        }

        .bill-header h1 {
          margin: 0;

          font-size: 36px;

          letter-spacing: -0.055em;
        }

        .bill-header p {
          margin: 7px 0 0;

          color: #707770;

          font-size: 13px;
        }

        .bill-line {
          height: 1px;

          background: #e2e5e1;

          margin: 28px 0;
        }

        .bill-meta {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 20px;
        }

        .bill-meta div {
          display: flex;

          flex-direction: column;

          gap: 5px;
        }

        .bill-meta span {
          color: #7a807a;

          font-size: 11px;

          text-transform: uppercase;

          letter-spacing: 0.08em;
        }

        .bill-meta strong {
          font-size: 14px;
        }

        .bill-item {
          display: grid;

          grid-template-columns:
            1fr 70px 120px;

          gap: 15px;

          padding: 13px 0;

          font-size: 14px;
        }

        .bill-item span:nth-child(2) {
          text-align: center;
        }

        .bill-item span:last-child {
          text-align: right;
        }

        .bill-item-head {
          padding-top: 0;

          color: #777d77;

          font-size: 10px;

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.08em;
        }

        .bill-summary {
          margin-left: auto;

          width: min(100%, 340px);
        }

        .bill-summary > div {
          display: flex;

          justify-content: space-between;

          gap: 20px;

          padding: 9px 0;

          font-size: 14px;
        }

        .bill-total {
          margin-top: 5px;

          padding-top: 17px !important;

          border-top: 2px solid #111;

          font-size: 20px !important;
        }

        .bill-status {
          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 10px;
        }

        .bill-status-pill {
          display: inline-flex;

          padding: 7px 11px;

          border-radius: 999px;

          background: #111;

          color: #fff;

          font-size: 10px;

          font-weight: 800;

          letter-spacing: 0.06em;
        }

        .bill-printed {
          color: #188038;

          font-size: 12px;

          font-weight: 700;
        }

        .bill-footer {
          display: flex;

          flex-direction: column;

          align-items: center;

          gap: 7px;

          margin-top: 35px;

          text-align: center;

          color: #777d77;

          font-size: 11px;
        }

        .bill-footer strong {
          color: #111;

          font-size: 13px;
        }

        @media (max-width: 700px) {
          .bill-paper {
            padding: 25px 18px;

            border-radius: 16px;
          }

          .bill-header h1 {
            font-size: 29px;
          }

          .bill-meta {
            grid-template-columns: 1fr 1fr;

            gap: 14px;
          }

          .bill-item {
            grid-template-columns:
              1fr 45px 90px;

            gap: 8px;

            font-size: 13px;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #fff !important;
          }

          body {
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .bill-wrapper {
            display: block !important;
          }

          .bill-paper {
            width: 100% !important;
            max-width: none !important;

            border: 0 !important;

            border-radius: 0 !important;

            box-shadow: none !important;

            padding: 0 !important;
          }

          .bill-line {
            background: #111 !important;
          }
        }
      `}</style>
    </>
  );
}