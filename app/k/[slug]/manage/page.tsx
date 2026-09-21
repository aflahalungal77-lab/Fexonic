"use client";

import { useEffect, useMemo, useState } from "react";
import KitchenShell from "@/components/KitchenShell";
import QR from "@/components/QR";
import { supabaseBrowser } from "@/lib/supabase";

export default function ManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState("");
  const [savingItem, setSavingItem] = useState(false);
  const [savingTable, setSavingTable] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    params.then(({ slug: currentSlug }) => setSlug(currentSlug));
  }, [params]);

  async function load(currentSlug = slug) {
    if (!currentSlug) return;

    const s = supabaseBrowser();
    const { data: r } = await s
      .from("restaurants")
      .select("id,name,slug")
      .eq("slug", currentSlug)
      .single();

    if (!r) return;
    setRestaurant(r);

    const [{ data: menu }, { data: tableRows }] = await Promise.all([
      s
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", r.id)
        .order("created_at", { ascending: false }),
      s
        .from("tables")
        .select("*")
        .eq("restaurant_id", r.id)
        .order("sort_order", { ascending: true }),
    ]);

    setItems(menu || []);
    setTables(tableRows || []);
  }

  useEffect(() => {
    load(slug);
  }, [slug]);

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (!restaurant || !name.trim() || !price) return;

    setSavingItem(true);

    try {
      let image: any = null;

      if (file) {
        const extension = file.name.split(".").pop() || "jpg";
        const path = `${restaurant.id}/${crypto.randomUUID()}.${extension}`;

        const upload = await supabaseBrowser()
          .storage
          .from("food-images")
          .upload(path, file, {
            upsert: false,
            contentType: file.type,
          });

        if (upload.error) throw upload.error;

        const { data } = supabaseBrowser()
          .storage
          .from("food-images")
          .getPublicUrl(path);

        image = {
          path,
          url: data.publicUrl,
          alt: name.trim(),
        };
      }

      const { error } = await supabaseBrowser()
        .from("menu_items")
        .insert({
          restaurant_id: restaurant.id,
          name: name.trim(),
          price: Number(price),
          image,
        });

      if (error) throw error;

      setName("");
      setPrice("");
      setFile(null);
      await load();
    } catch (error: any) {
      window.alert(error?.message || "Could not add menu item");
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this menu item?")) return;

    const { error } = await supabaseBrowser()
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant.id);

    if (error) window.alert(error.message);
    await load();
  }

  async function addTable(event: React.FormEvent) {
    event.preventDefault();
    if (!restaurant || !tableName.trim()) return;

    setSavingTable(true);

    try {
      const { error } = await supabaseBrowser()
        .from("tables")
        .insert({
          restaurant_id: restaurant.id,
          name: tableName.trim(),
        });

      if (error) throw error;

      setTableName("");
      await load();
    } catch (error: any) {
      window.alert(error?.message || "Could not add table");
    } finally {
      setSavingTable(false);
    }
  }

  async function deleteTable(id: string) {
    if (!window.confirm("Delete this table and its QR?")) return;

    const { error } = await supabaseBrowser()
      .from("tables")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurant.id);

    if (error) window.alert(error.message);
    await load();
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [items, search]);

  if (!restaurant) {
    return (
      <main className="fx-app">
        <div className="fx-loading-screen">
          <div className="fx-loading-card">
            <div className="fx-logo-mark">F</div>
            <strong>Loading workspace</strong>
            <p>Preparing menu and table management…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <KitchenShell slug={slug} restaurant={restaurant} active="manage">
      <section className="fx-welcome-row">
        <div>
          <p className="fx-kicker">MANAGEMENT</p>
          <h1>Menu & Tables<span>.</span></h1>
          <p className="fx-muted">
            Manage your menu, dining tables and QR ordering in one place.
          </p>
        </div>
      </section>

      <section className="fx-manage-hero">
        <div>
          <span className="fx-manage-hero-label">WORKSPACE</span>
          <strong>{restaurant.name}</strong>
          <p>Every table gets its own customer ordering link.</p>
        </div>
        <div className="fx-manage-hero-stats">
          <span><b>{items.length}</b> menu items</span>
          <span><b>{tables.length}</b> tables</span>
        </div>
      </section>

      <div className="fx-manage-grid">
        <section className="fx-manage-panel">
          <div className="fx-panel-header">
            <div>
              <p className="fx-kicker">MENU</p>
              <h2>Your menu</h2>
            </div>
            <span className="fx-panel-count">{items.length}</span>
          </div>

          <form className="fx-add-form" onSubmit={addItem}>
            <div className="fx-form-row">
              <input
                className="fx-modern-input"
                placeholder="Food name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="fx-modern-input fx-price-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="fx-form-row fx-form-row-bottom">
              <label className="fx-file-input">
                <span>{file ? file.name : "Choose food image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <button
                className="fx-button fx-button-dark"
                type="submit"
                disabled={savingItem}
              >
                {savingItem ? "Adding…" : "+ Add item"}
              </button>
            </div>
          </form>

          <div className="fx-search-row">
            <input
              className="fx-modern-input"
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="fx-menu-grid">
            {filteredItems.length === 0 ? (
              <div className="fx-empty-card">
                <strong>No menu items</strong>
                <p className="fx-muted">Add your first food item above.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <article className="fx-menu-card" key={item.id}>
                  <div className="fx-menu-image">
                    {item.image?.url ? (
                      <img src={item.image.url} alt={item.image.alt || item.name} loading="lazy" />
                    ) : (
                      <span>FOOD</span>
                    )}
                  </div>
                  <div className="fx-menu-info">
                    <div>
                      <h3>{item.name}</h3>
                      <strong>₹{Number(item.price).toFixed(0)}</strong>
                    </div>
                    <button
                      className="fx-menu-delete"
                      onClick={() => deleteItem(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="fx-manage-panel">
          <div className="fx-panel-header">
            <div>
              <p className="fx-kicker">TABLES & QR</p>
              <h2>Your tables</h2>
            </div>
            <span className="fx-panel-count">{tables.length}</span>
          </div>

          <form className="fx-add-form" onSubmit={addTable}>
            <div className="fx-form-row">
              <input
                className="fx-modern-input"
                placeholder="Table name, e.g. Table 1"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                required
              />
              <button
                className="fx-button fx-button-dark"
                type="submit"
                disabled={savingTable}
              >
                {savingTable ? "Adding…" : "+ Add table"}
              </button>
            </div>
          </form>

          <div className="fx-table-grid">
            {tables.length === 0 ? (
              <div className="fx-empty-card">
                <strong>No tables yet</strong>
                <p className="fx-muted">Add your first table to generate a QR.</p>
              </div>
            ) : (
              tables.map((table) => {
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/r/${restaurant.slug}/t/${table.id}`
                    : `/r/${restaurant.slug}/t/${table.id}`;

                return (
                  <article className="fx-table-card" key={table.id}>
                    <div className="fx-table-top">
                      <div>
                        <span className="fx-table-number">{table.name}</span>
                        <small>Customer ordering QR</small>
                      </div>
                      <button
                        className="fx-menu-delete"
                        onClick={() => deleteTable(table.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="fx-qr-frame">
                      <QR value={url} />
                    </div>

                    <div className="fx-table-actions">
                      <a
                        className="fx-button fx-button-light"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open customer menu
                      </a>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </KitchenShell>
  );
}
