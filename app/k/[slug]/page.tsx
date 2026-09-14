'use client';

import { useEffect, useState } from 'react';
import QR from '@/components/QR';
import { supabaseBrowser } from '@/lib/supabase';

export default function Kitchen({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState('');
  const [r, setR] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [tableName, setTableName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    params.then((x) => setSlug(x.slug));
  }, [params]);

  async function load() {
    if (!slug) return;

    const s = supabaseBrowser();

    const { data: r0 } = await s
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!r0) return;

    setR(r0);

    const [{ data: o }, { data: i }, { data: t }] =
      await Promise.all([
        s
          .from('orders')
          .select('*,tables(name),order_items(*)')
          .eq('restaurant_id', r0.id)
          .order('created_at', { ascending: false })
          .limit(50),

        s
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', r0.id)
          .order('created_at', { ascending: false }),

        s
          .from('tables')
          .select('*')
          .eq('restaurant_id', r0.id)
          .order('sort_order'),
      ]);

    setOrders(o || []);
    setItems(i || []);
    setTables(t || []);
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !price) return;

    const s = supabaseBrowser();

    let image: any = null;

    if (file) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${r.id}/${crypto.randomUUID()}.${ext}`;

      const up = await s.storage
        .from('food-images')
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        });

      if (up.error) return alert(up.error.message);

      const { data } = s.storage
        .from('food-images')
        .getPublicUrl(path);

      image = {
        path,
        url: data.publicUrl,
        alt: name,
      };
    }

    await s.from('menu_items').insert({
      restaurant_id: r.id,
      name,
      price: Number(price),
      image,
    });

    setName('');
    setPrice('');
    setFile(null);

    load();
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();

    if (!tableName) return;

    await supabaseBrowser()
      .from('tables')
      .insert({
        restaurant_id: r.id,
        name: tableName,
      });

    setTableName('');

    load();
  }

  async function status(id: string, status: string) {
    await supabaseBrowser()
      .from('orders')
      .update({ status })
      .eq('id', id);

    load();
  }

  async function del(id: string) {
    await supabaseBrowser()
      .from('menu_items')
      .delete()
      .eq('id', id);

    load();
  }

  if (!r) {
    return (
      <main className="container">
        <div className="card" style={{ marginTop: 50 }}>
          <div className="eyebrow">FEXONIC</div>
          <h2 style={{ marginTop: 10 }}>Loading workspace...</h2>
          <p className="muted">Preparing your restaurant dashboard.</p>
        </div>
      </main>
    );
  }

  const revenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((a, o) => a + Number(o.total), 0);

  return (
    <main className="container">
      <header className="top">
        <div className="brand">FEXONIC</div>

        <div className="nav">
          <span className="pill">{r.name}</span>

          <a className="btn light" href="/api/auth/signout">
            Sign out
          </a>
        </div>
      </header>

      <section className="dashboard-hero">
        <div className="eyebrow">RESTAURANT WORKSPACE</div>

        <h1>{r.name}</h1>

        <p className="muted">
          Your menu, tables, QR codes and orders — all in one place.
        </p>
      </section>

      <section className="grid grid4">
        <div className="card stat">
          <span className="muted smalltext">Orders</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">Revenue shown</span>
          <strong>₹{revenue.toFixed(0)}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">Menu items</span>
          <strong>{items.length}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">Tables</span>
          <strong>{tables.length}</strong>
        </div>
      </section>

      <section className="grid grid2 dashboard-section">
        <div className="card">
          <div className="eyebrow">MENU</div>
          <h2 style={{ marginTop: 7 }}>Add menu item</h2>

          <form onSubmit={addItem}>
            <div className="field">
              <label className="label">Food name</label>

              <input
                className="input"
                placeholder="Chicken biriyani"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Price</label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="180"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Food image</label>

              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
              />
            </div>

            <button className="btn" type="submit">
              Add item
            </button>
          </form>

          <div className="list" style={{ marginTop: 22 }}>
            {items.map((i) => (
              <div className="item" key={i.id}>
                <div className="row">
                  <div>
                    <b>{i.name}</b>

                    <div
                      className="muted"
                      style={{ marginTop: 4, fontSize: 13 }}
                    >
                      ₹{i.price}
                    </div>
                  </div>

                  <button
                    className="btn danger small"
                    onClick={() => del(i.id)}
                  >
                    Delete
                  </button>
                </div>

                {i.image?.url && (
                  <img
                    src={i.image.url}
                    alt=""
                    style={{
                      width: '100%',
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 13,
                      marginTop: 12,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="eyebrow">TABLES</div>
          <h2 style={{ marginTop: 7 }}>QR ordering</h2>

          <form onSubmit={addTable}>
            <div className="row">
              <input
                className="input"
                placeholder="Table 1"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                required
              />

              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </form>

          <div className="list" style={{ marginTop: 22 }}>
            {tables.map((t) => (
              <div className="item" key={t.id}>
                <div className="row">
                  <div>
                    <b>{t.name}</b>
                    <div className="muted smalltext">
                      Customer QR
                    </div>
                  </div>

                  <a
                    className="btn light small"
                    href={`/r/${r.slug}/t/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open menu
                  </a>
                </div>

                <QR
                  value={`${location.origin}/r/${r.slug}/t/${t.id}`}
                />

                <div style={{ textAlign: 'center' }}>
                  <span className="pill">SCAN TO ORDER</span>

                  <p className="muted smalltext">
                    Customers scan this code to open the menu for this
                    table.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">LIVE OPERATIONS</div>
            <h2 style={{ marginTop: 7, marginBottom: 0 }}>
              Orders
            </h2>
          </div>

          <button
            className="btn light small"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        <div className="list" style={{ marginTop: 20 }}>
          {orders.length === 0 && (
            <div
              className="item"
              style={{ textAlign: 'center', padding: 35 }}
            >
              <b>No orders yet</b>
              <p className="muted smalltext">
                New customer orders will appear here.
              </p>
            </div>
          )}

          {orders.map((o) => (
            <div className="item" key={o.id}>
              <div className="row">
                <div>
                  <b>#{o.id.slice(0, 8)}</b>

                  <div
                    className="muted smalltext"
                    style={{ marginTop: 5 }}
                  >
                    {o.tables?.name || 'Table'}
                  </div>
                </div>

                <span className="pill">{o.status}</span>
              </div>

              <ul
                style={{
                  margin: '15px 0',
                  paddingLeft: 19,
                  lineHeight: 1.8,
                  fontSize: 13,
                }}
              >
                {o.order_items?.map((x: any) => (
                  <li key={x.id}>
                    {x.name} × {x.quantity} — ₹
                    {Number(x.price) * x.quantity}
                  </li>
                ))}
              </ul>

              <div className="actions">
                {[
                  'NEW',
                  'PREPARING',
                  'READY',
                  'SERVED',
                  'CANCELLED',
                ].map((st) => (
                  <button
                    className="btn light small"
                    key={st}
                    onClick={() => status(o.id, st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        Fexonic Kitchen · {r.name}
      </footer>
    </main>
  );
}