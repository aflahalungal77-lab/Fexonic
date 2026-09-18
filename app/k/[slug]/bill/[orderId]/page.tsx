"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

type BillItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Bill = {
  id: string;
  order_id: string;
  bill_number: number | string;
  total: number;
  status: string;
  printed: boolean;
  printed_at?: string | null;
  created_at: string;
  orders?: {
    id: string;
    status: string;
    table_id: string;
    tables?: {
      name: string;
    } | null;
    order_items?: BillItem[];
  } | null;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

export default function BillPage() {
  const params = useParams();

  const slug = String(params?.slug || "");
  const orderId = String(params?.orderId || "");

  const [bill, setBill] = useState<Bill | null>(null);
  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !orderId) return;

    loadBill();
  }, [slug, orderId]);

  async function loadBill() {
    try {
      setLoading(true);
      setError("");

      const s = supabaseBrowser();

      /* ---------------- RESTAURANT ---------------- */

      const {
        data: restaurantData,
        error: restaurantError,
      } = await s
        .from("restaurants")
        .select("id,name,slug")
        .eq("slug", slug)
        .single();

      if (restaurantError || !restaurantData) {
        throw new Error("Restaurant not found");
      }

      setRestaurant(restaurantData);

      /* ---------------- BILL ---------------- */

      const { data, error: billError } = await s
        .from("bills")
        .select(
          `
          id,
          order_id,
          bill_number,
          total,
          status,
          printed,
          printed_at,
          created_at,
          orders(
            id,
            status,
            table_id,
            tables(name),
            order_items(
              id,
              name,
              price,
              quantity
            )
          )
        `
        )
        .eq("order_id", orderId)
        .eq("restaurant_id", restaurantData.id)
        .single();

      if (billError || !data) {
        throw new Error("Bill not found");
      }

      setBill(data as Bill);
    } catch (err: any) {
      console.error("Bill loading error:", err);

      setError(
        err?.message ||
          "Unable to load this bill"
      );
    } finally {
      setLoading(false);
    }
  }

  async function printBill() {
    if (!bill) return;

    try {
      const s = supabaseBrowser();

      /*
       * Mark bill as printed.
       */
      await s
        .from("bills")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      setBill((prev) =>
        prev
          ? {
              ...prev,
              printed: true,
              printed_at:
                new Date().toISOString(),
            }
          : prev
      );

      /*
       * Small delay so print status updates
       * before browser print dialog opens.
       */
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (err) {
      console.error(
        "Print status update failed:",
        err
      );

      /*
       * Even if print status update fails,
       * allow browser printing.
       */
      window.print();
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  if (loading) {
    return (
      <main className="bill-page">
        <div className="bill-loading">
          <div className="bill-loading-title">
            Loading bill...
          </div>

          <div className="bill-loading-text">
            Preparing your customer bill.
          </div>
        </div>
      </main>
    );
  }

  if (error || !bill || !restaurant) {
    return (
      <main className="bill-page">
        <div className="bill-error">
          <h2>Bill unavailable</h2>

          <p>
            {error || "Bill not found"}
          </p>

          <a
            href={`/k/${slug}/billing`}
            className="bill-back-button"
          >
            ← Back to billing
          </a>
        </div>
      </main>
    );
  }

  const order = bill.orders;

  const items = order?.order_items || [];

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        Number(item.quantity),
    0
  );

  const total = Number(
    bill.total ?? subtotal
  );

  const tableName =
    order?.tables?.name || "Table";

  const orderStatus =
    order?.status || bill.status || "OPEN";

  const printStatus = bill.printed
    ? "PRINTED"
    : "NOT PRINTED";

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f4f2;
          color: #111;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .bill-page {
          min-height: 100vh;
          padding: 50px 20px;
          display: flex;
          justify-content: center;
        }

        .bill-wrapper {
          width: 100%;
          max-width: 820px;
        }

        .bill-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .bill-back {
          text-decoration: none;
          color: #111;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #ddd;
          background: white;
          padding: 11px 16px;
          border-radius: 10px;
        }

        .bill-print {
          border: 0;
          background: #111;
          color: white;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 18px;
          border-radius: 10px;
          cursor: pointer;
        }

        .bill-paper {
          background: #fff;
          padding: 60px 58px 45px;
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9e9e7;
        }

        .bill-header {
          text-align: center;
        }

        .restaurant-name {
          font-size: 42px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .restaurant-tagline {
          margin-top: 16px;
          font-size: 12px;
          letter-spacing: 0.34em;
          font-weight: 600;
          color: #555;
        }

        .bill-divider {
          height: 1px;
          background: #111;
          margin: 38px 0;
        }

        .bill-details {
          display: grid;
          grid-template-columns: 150px 20px 1fr;
          row-gap: 15px;
          font-size: 15px;
        }

        .bill-detail-label {
          color: #555;
        }

        .bill-detail-colon {
          text-align: center;
          color: #777;
        }

        .bill-detail-value {
          font-weight: 700;
          word-break: break-word;
        }

        .items-section {
          margin-top: 40px;
        }

        .items-head {
          display: grid;
          grid-template-columns: 1fr 80px 110px 120px;
          gap: 10px;
          padding: 14px 16px;
          background: #f1f1ef;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .items-head div:not(:first-child) {
          text-align: right;
        }

        .bill-item {
          display: grid;
          grid-template-columns: 1fr 80px 110px 120px;
          gap: 10px;
          align-items: center;
          padding: 20px 16px;
          border-bottom: 1px dashed #cfcfcb;
          font-size: 15px;
        }

        .bill-item div:not(:first-child) {
          text-align: right;
        }

        .item-name {
          font-weight: 600;
        }

        .totals {
          width: 390px;
          max-width: 100%;
          margin-left: auto;
          margin-top: 30px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          font-size: 16px;
        }

        .total-row.subtotal {
          border-bottom: 1px solid #ddd;
        }

        .total-row.final {
          font-size: 24px;
          font-weight: 900;
          padding-top: 18px;
        }

        .status-box {
          margin-top: 45px;
          padding: 22px;
          background: #f1f1ef;
          border-radius: 14px;
          display: grid;
          grid-template-columns: 1fr 1px 1fr;
          gap: 22px;
          text-align: center;
        }

        .status-divider {
          background: #bbb;
        }

        .status-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #666;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .status-value {
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.06em;
        }

        .thank-you {
          text-align: center;
          margin-top: 55px;
        }

        .thank-you-main {
          font-size: 14px;
          letter-spacing: 0.28em;
          font-weight: 700;
        }

        .thank-line {
          width: 45px;
          height: 2px;
          background: #111;
          margin: 22px auto 18px;
        }

        .powered {
          font-size: 12px;
          color: #777;
          letter-spacing: 0.08em;
        }

        .bill-loading,
        .bill-error {
          width: 100%;
          max-width: 820px;
          background: white;
          padding: 35px;
          border-radius: 16px;
          border: 1px solid #e7e7e4;
        }

        .bill-loading-title,
        .bill-error h2 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }

        .bill-loading-text,
        .bill-error p {
          color: #777;
          margin-top: 10px;
        }

        .bill-back-button {
          display: inline-block;
          margin-top: 15px;
          text-decoration: none;
          background: #111;
          color: white;
          padding: 11px 16px;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .bill-page {
            padding: 15px 10px;
          }

          .bill-paper {
            padding: 35px 20px 30px;
          }

          .restaurant-name {
            font-size: 27px;
            letter-spacing: 0.08em;
          }

          .restaurant-tagline {
            font-size: 9px;
            letter-spacing: 0.22em;
          }

          .bill-divider {
            margin: 27px 0;
          }

          .bill-details {
            grid-template-columns: 105px 15px 1fr;
            font-size: 13px;
            row-gap: 12px;
          }

          .items-head {
            grid-template-columns: 1fr 45px 75px 80px;
            font-size: 9px;
            padding: 11px 8px;
          }

          .bill-item {
            grid-template-columns: 1fr 45px 75px 80px;
            font-size: 12px;
            padding: 16px 8px;
          }

          .total-row.final {
            font-size: 21px;
          }

          .status-box {
            gap: 10px;
            padding: 18px 10px;
          }

          .status-label {
            font-size: 8px;
          }

          .status-value {
            font-size: 11px;
          }

          .thank-you-main {
            font-size: 10px;
            letter-spacing: 0.18em;
          }

          .bill-actions {
            gap: 8px;
          }

          .bill-back,
          .bill-print {
            font-size: 12px;
            padding: 10px 12px;
          }
        }

        @media print {
          body {
            background: white !important;
          }

          .bill-page {
            padding: 0 !important;
            min-height: auto !important;
          }

          .bill-wrapper {
            max-width: none !important;
          }

          .bill-actions {
            display: none !important;
          }

          .bill-paper {
            width: 100%;
            max-width: none;
            border: 0 !important;
            box-shadow: none !important;
            padding: 30px 35px 25px;
          }

          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>

      <main className="bill-page">
        <div className="bill-wrapper">

          {/* ACTIONS */}

          <div className="bill-actions">
            <a
              href={`/k/${slug}/billing`}
              className="bill-back"
            >
              ← Back to billing
            </a>

            <button
              className="bill-print"
              onClick={printBill}
            >
              🖨 Print Bill
            </button>
          </div>

          {/* BILL */}

          <section className="bill-paper">

            {/* HEADER */}

            <header className="bill-header">
              <div className="restaurant-name">
                {restaurant.name}
              </div>

              <div className="restaurant-tagline">
                GOOD FOOD&nbsp; • &nbsp;HAPPY PEOPLE
              </div>
            </header>

            <div className="bill-divider" />

            {/* DETAILS */}

            <section className="bill-details">

              <div className="bill-detail-label">
                Bill No.
              </div>

              <div className="bill-detail-colon">
                :
              </div>

              <div className="bill-detail-value">
                #{bill.bill_number}
              </div>


              <div className="bill-detail-label">
                Order No.
              </div>

              <div className="bill-detail-colon">
                :
              </div>

              <div className="bill-detail-value">
                #{order?.id || bill.order_id}
              </div>


              <div className="bill-detail-label">
                Table
              </div>

              <div className="bill-detail-colon">
                :
              </div>

              <div className="bill-detail-value">
                {tableName}
              </div>


              <div className="bill-detail-label">
                Date & Time
              </div>

              <div className="bill-detail-colon">
                :
              </div>

              <div className="bill-detail-value">
                {formatDate(
                  bill.created_at
                )}
              </div>

            </section>

            {/* ITEMS */}

            <section className="items-section">

              <div className="items-head">
                <div>ITEM</div>
                <div>QTY</div>
                <div>PRICE</div>
                <div>AMOUNT</div>
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
                    <div className="item-name">
                      {item.name}
                    </div>

                    <div>
                      {item.quantity}
                    </div>

                    <div>
                      ₹
                      {Number(
                        item.price
                      ).toFixed(2)}
                    </div>

                    <div>
                      ₹
                      {amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}

            </section>

            {/* TOTALS */}

            <section className="totals">

              <div className="total-row subtotal">
                <span>Subtotal</span>

                <span>
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="total-row final">
                <span>Total</span>

                <span>
                  ₹{total.toFixed(2)}
                </span>
              </div>

            </section>

            {/* STATUS */}

            <section className="status-box">

              <div>
                <div className="status-label">
                  ORDER STATUS
                </div>

                <div className="status-value">
                  {orderStatus}
                </div>
              </div>

              <div className="status-divider" />

              <div>
                <div className="status-label">
                  PRINT STATUS
                </div>

                <div className="status-value">
                  {printStatus}
                </div>
              </div>

            </section>

            {/* FOOTER */}

            <footer className="thank-you">

              <div className="thank-you-main">
                THANK YOU FOR DINING WITH US
              </div>

              <div className="thank-line" />

              <div className="powered">
                Powered by Fexonic
              </div>

            </footer>

          </section>
        </div>
      </main>
    </>
  );
}