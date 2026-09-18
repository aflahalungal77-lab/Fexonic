"use client";

import { useEffect, useState } from "react";

type Bill = {
  id: string;
  bill_number: number;
  subtotal: number;
  total: number;
  status: string;
  printed: boolean;
  printed_at: string | null;
  created_at: string;
  orders: {
    id: string;
    status: string;
    total: number;
    created_at: string;
    tables?: { name: string } | null;
    order_items: { name: string; price: number; quantity: number }[];
  };
};

export default function BillPrint({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [slug, setSlug] = useState("");

  useEffect(() => {
    params.then(async ({ slug: currentSlug, orderId }) => {
      setSlug(currentSlug);
      try {
        const response = await fetch(`/api/bills?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Failed to load bill");
        setBill(data.bill);
      } catch (e: any) {
        setError(e?.message || "Failed to load bill");
      }
    });
  }, [params]);

  async function printBill() {
    if (!bill || printing) return;
    setPrinting(true);
    try {
      window.print();
      await fetch("/api/bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: bill.orders.id, printed: true }),
      });
      setBill({ ...bill, printed: true, printed_at: new Date().toISOString() });
    } finally {
      setPrinting(false);
    }
  }

  if (error) return <main className="container"><div className="card" style={{ marginTop: 40 }}><h2>Bill unavailable</h2><p className="muted">{error}</p></div></main>;
  if (!bill) return <main className="container"><div className="card" style={{ marginTop: 40 }}><p className="muted">Loading bill...</p></div></main>;

  return (
    <main className="bill-page">
      <div className="bill-toolbar no-print">
        <a className="btn light" href={`/k/${slug}`}>Back</a>
        <button className="btn" onClick={printBill}>{printing ? "Printing..." : "Print Bill"}</button>
      </div>

      <article className="receipt receipt-a4">
        <div className="receipt-head">
          <div className="eyebrow">FEXONIC BILL</div>
          <h1>Restaurant Bill</h1>
          <p className="muted">Bill #{bill.bill_number}</p>
        </div>

        <div className="receipt-meta">
          <div><span>Table</span><strong>{bill.orders.tables?.name || "—"}</strong></div>
          <div><span>Order</span><strong>#{bill.orders.id.slice(0, 8)}</strong></div>
          <div><span>Date</span><strong>{new Date(bill.created_at).toLocaleString("en-IN")}</strong></div>
        </div>

        <div className="receipt-lines">
          {bill.orders.order_items.map((item, index) => (
            <div className="receipt-line" key={`${item.name}-${index}`}>
              <div><strong>{item.name}</strong><span>{item.quantity} × ₹{Number(item.price).toFixed(2)}</span></div>
              <strong>₹{(Number(item.price) * item.quantity).toFixed(2)}</strong>
            </div>
          ))}
        </div>

        <div className="receipt-total"><span>Total</span><strong>₹{Number(bill.total).toFixed(2)}</strong></div>
        <p className="receipt-thanks">Thank you for dining with us.</p>
      </article>
    </main>
  );
}
