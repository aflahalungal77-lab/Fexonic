'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export default function Customer({
  params,
}: {
  params: Promise<{ slug: string; tableId: string }>;
}) {
  const [p, setP] = useState<{
    slug: string;
    tableId: string;
  } | null>(null);

  const [r, setR] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    params.then(setP);
  }, [params]);

  useEffect(() => {
    if (!p) return;

    fetch(
      `/api/menu?slug=${encodeURIComponent(
        p.slug
      )}&table=${encodeURIComponent(p.tableId)}`
    )
      .then((x) => x.json())
      .then((x) => {
        if (x.error) {
          setMsg(x.error);
        } else {
          setR(x.restaurant);
          setItems(x.items);
        }
      });
  }, [p]);

  function add(id: string) {
    setCart((c) => ({
      ...c,
      [id]: (c[id] || 0) + 1,
    }));
  }

  function remove(id: string) {
    setCart((c) => {
      const next = { ...c };

      if (!next[id]) return next;

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
      (s, i) => s + (cart[i.id] || 0) * Number(i.price),
      0
    );
  }

  function cartCount() {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }

  async function order() {
    const rows = items
      .filter((i) => cart[i.id])
      .map((i) => ({
        menu_item_id: i.id,
        quantity: cart[i.id],
      }));

    if (!rows.length) return;

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurant_id: r.id,
        table_id: p?.tableId,
        items: rows,
      }),
    });

    const j = await res.json();

    if (!res.ok) {
      return setMsg(j.error || 'Order failed');
    }

    setCart({});

    setMsg(`Order placed • #${j.id.slice(0, 8)}`);
  }

  if (msg && !r) {
    return (
      <main className="container customer-page">
        <div
          className="card"
          style={{
            marginTop: 70,
            textAlign: 'center',
            padding: 45,
          }}
        >
          <div className="brand">FEXONIC</div>

          <h1 style={{ marginTop: 25 }}>Menu unavailable</h1>

          <p className="muted">{msg}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container customer-page">
      <header className="customer-header">
        <div className="row">
          <div className="brand">{r?.name || 'FEXONIC'}</div>

          <span className="pill">TABLE</span>
        </div>
      </header>

      <section className="customer-hero">
        <div className="eyebrow">DIGITAL MENU</div>

        <h1>{r?.name}</h1>

        <p className="muted">
          {r?.description || 'Choose your food and order directly from your table.'}
        </p>
      </section>

      <section className="customer-menu">
        <div className="grid grid3">
          {items.map((i) => (
            <article
              className="card food-card"
              key={i.id}
            >
              {i.image?.url ? (
                <img
                  className="foodimg"
                  src={i.image.url}
                  alt={i.image?.alt || i.name}
                />
              ) : (
                <div className="foodimg" />
              )}

              <div className="food-card-body">
                <div className="row">
                  <div>
                    <b>{i.name}</b>

                    <div
                      style={{
                        marginTop: 5,
                        fontWeight: 850,
                      }}
                    >
                      ₹{i.price}
                    </div>
                  </div>

                  {cart[i.id] ? (
                    <span className="pill">
                      {cart[i.id]} ×
                    </span>
                  ) : null}
                </div>

                {i.description && (
                  <p
                    className="muted"
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      minHeight: 40,
                    }}
                  >
                    {i.description}
                  </p>
                )}

                <div
                  className="row"
                  style={{ marginTop: 15 }}
                >
                  {cart[i.id] ? (
                    <div className="actions">
                      <button
                        className="btn light small"
                        onClick={() => remove(i.id)}
                      >
                        −
                      </button>

                      <span
                        style={{
                          minWidth: 25,
                          textAlign: 'center',
                          fontWeight: 850,
                        }}
                      >
                        {cart[i.id]}
                      </span>

                      <button
                        className="btn light small"
                        onClick={() => add(i.id)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}

                  <button
                    className="btn small"
                    onClick={() => add(i.id)}
                  >
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cart-bar">
        <div className="row">
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              Your order
            </div>

            <div
              className="muted"
              style={{
                marginTop: 3,
                fontSize: 12,
              }}
            >
              {cartCount()} item{cartCount() !== 1 ? 's' : ''} · ₹
              {total()}
            </div>
          </div>

          <button
            className="btn"
            onClick={order}
            disabled={cartCount() === 0}
          >
            Place order →
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#f1f8f4',
              color: 'var(--good)',
              fontSize: 13,
              fontWeight: 750,
            }}
          >
            {msg}
          </div>
        )}
      </section>

      <footer className="footer">
        Powered by Fexonic
      </footer>
    </main>
  );
}