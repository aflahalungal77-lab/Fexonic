"use client";

import { useCallback, useEffect, useState } from "react";
import QR from "@/components/QR";
import { supabaseBrowser } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  image: {
    path?: string;
    url?: string;
    alt?: string;
  } | null;
  is_available: boolean;
  created_at: string;
};

type RestaurantTable = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export default function ManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] =
    useState<RestaurantTable[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // Menu form
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] =
    useState<File | null>(null);

  // Edit menu
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editName, setEditName] =
    useState("");
  const [editPrice, setEditPrice] =
    useState("");

  // Table form
  const [tableName, setTableName] =
    useState("");

  /*
   * Resolve slug
   */
  useEffect(() => {
    let mounted = true;

    params.then((value) => {
      if (mounted) {
        setSlug(value.slug);
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  /*
   * Load restaurant
   */
  const loadRestaurant =
    useCallback(async () => {
      if (!slug) return null;

      const supabase =
        supabaseBrowser();

      const {
        data,
        error,
      } = await supabase
        .from("restaurants")
        .select("id,name,slug")
        .eq("slug", slug)
        .single();

      if (error) {
        throw error;
      }

      setRestaurant(data);

      return data as Restaurant;
    }, [slug]);

  /*
   * Load menu
   */
  const loadMenu = useCallback(
    async (restaurantId: string) => {
      const supabase =
        supabaseBrowser();

      const {
        data,
        error,
      } = await supabase
        .from("menu_items")
        .select(
          `
          id,
          restaurant_id,
          name,
          price,
          image,
          is_available,
          created_at
        `
        )
        .eq(
          "restaurant_id",
          restaurantId
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setItems(
        (data || []) as MenuItem[]
      );
    },
    []
  );

  /*
   * Load tables
   */
  const loadTables = useCallback(
    async (restaurantId: string) => {
      const supabase =
        supabaseBrowser();

      const {
        data,
        error,
      } = await supabase
        .from("tables")
        .select(
          `
          id,
          restaurant_id,
          name,
          sort_order
        `
        )
        .eq(
          "restaurant_id",
          restaurantId
        )
        .order("sort_order", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setTables(
        (data || []) as RestaurantTable[]
      );
    },
    []
  );

  /*
   * Initial load
   */
  const loadEverything =
    useCallback(async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError("");

        const r =
          await loadRestaurant();

        if (!r) return;

        await Promise.all([
          loadMenu(r.id),
          loadTables(r.id),
        ]);
      } catch (error: any) {
        console.error(error);

        setError(
          error?.message ||
            "Failed to load workspace."
        );
      } finally {
        setLoading(false);
      }
    }, [
      slug,
      loadRestaurant,
      loadMenu,
      loadTables,
    ]);

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  /*
   * Add menu item
   */
  async function addMenuItem(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!restaurant) return;

    if (!name.trim()) {
      alert("Enter food name.");
      return;
    }

    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      alert("Enter a valid price.");
      return;
    }

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      let image:
        | {
            path: string;
            url: string;
            alt: string;
          }
        | null = null;

      /*
       * Upload image
       */
      if (file) {
        if (!file.type.startsWith("image/")) {
          throw new Error(
            "Please select an image file."
          );
        }

        if (
          file.size >
          5 * 1024 * 1024
        ) {
          throw new Error(
            "Image must be smaller than 5 MB."
          );
        }

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const path =
          `${restaurant.id}/` +
          `${crypto.randomUUID()}.${extension}`;

        const upload =
          await supabase.storage
            .from("food-images")
            .upload(
              path,
              file,
              {
                upsert: false,
                contentType:
                  file.type,
              }
            );

        if (upload.error) {
          throw upload.error;
        }

        const {
          data: publicUrl,
        } =
          supabase.storage
            .from("food-images")
            .getPublicUrl(path);

        image = {
          path,
          url: publicUrl.publicUrl,
          alt: name.trim(),
        };
      }

      const {
        error,
      } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id:
            restaurant.id,
          name: name.trim(),
          price: numericPrice,
          image,
          is_available: true,
        });

      if (error) {
        throw error;
      }

      setName("");
      setPrice("");
      setFile(null);

      const fileInput =
        document.getElementById(
          "menu-image"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadMenu(
        restaurant.id
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to add menu item."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Start editing
   */
  function startEdit(
    item: MenuItem
  ) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(
      String(item.price)
    );
  }

  /*
   * Cancel editing
   */
  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  }

  /*
   * Save menu edit
   */
  async function saveEdit(
    itemId: string
  ) {
    if (!restaurant) return;

    const numericPrice =
      Number(editPrice);

    if (!editName.trim()) {
      alert("Food name is required.");
      return;
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      alert("Enter a valid price.");
      return;
    }

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("menu_items")
        .update({
          name: editName.trim(),
          price: numericPrice,
        })
        .eq("id", itemId)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (error) {
        throw error;
      }

      cancelEdit();

      await loadMenu(
        restaurant.id
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to update item."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Toggle availability
   */
  async function toggleAvailability(
    item: MenuItem
  ) {
    if (!restaurant) return;

    try {
      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("menu_items")
        .update({
          is_available:
            !item.is_available,
        })
        .eq("id", item.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (error) {
        throw error;
      }

      setItems((current) =>
        current.map((x) =>
          x.id === item.id
            ? {
                ...x,
                is_available:
                  !x.is_available,
              }
            : x
        )
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to update availability."
      );
    }
  }

  /*
   * Delete menu item
   */
  async function deleteMenuItem(
    item: MenuItem
  ) {
    if (!restaurant) return;

    const confirmed =
      window.confirm(
        `Delete "${item.name}"?`
      );

    if (!confirmed) return;

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      /*
       * Delete database row first.
       */
      const {
        error,
      } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", item.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (error) {
        throw error;
      }

      /*
       * Delete stored image if one exists.
       */
      if (item.image?.path) {
        const {
          error: storageError,
        } =
          await supabase.storage
            .from("food-images")
            .remove([
              item.image.path,
            ]);

        /*
         * Database item is already deleted.
         * Storage cleanup failure should not
         * make the UI look like the delete failed.
         */
        if (storageError) {
          console.warn(
            "Image cleanup failed:",
            storageError
          );
        }
      }

      setItems((current) =>
        current.filter(
          (x) => x.id !== item.id
        )
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to delete item."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Add table
   */
  async function addTable(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!restaurant) return;

    const cleanName =
      tableName.trim();

    if (!cleanName) {
      alert("Enter table name.");
      return;
    }

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      const nextSortOrder =
        tables.length
          ? Math.max(
              ...tables.map(
                (table) =>
                  Number(
                    table.sort_order
                  ) || 0
              )
            ) + 1
          : 1;

      const {
        error,
      } = await supabase
        .from("tables")
        .insert({
          restaurant_id:
            restaurant.id,
          name: cleanName,
          sort_order:
            nextSortOrder,
        });

      if (error) {
        throw error;
      }

      setTableName("");

      await loadTables(
        restaurant.id
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to add table."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Rename table
   */
  async function renameTable(
    table: RestaurantTable
  ) {
    if (!restaurant) return;

    const newName =
      window.prompt(
        "New table name:",
        table.name
      );

    if (
      newName === null ||
      !newName.trim()
    ) {
      return;
    }

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("tables")
        .update({
          name: newName.trim(),
        })
        .eq("id", table.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (error) {
        throw error;
      }

      setTables((current) =>
        current.map((x) =>
          x.id === table.id
            ? {
                ...x,
                name: newName.trim(),
              }
            : x
        )
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to rename table."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Delete table
   */
  async function deleteTable(
    table: RestaurantTable
  ) {
    if (!restaurant) return;

    const confirmed =
      window.confirm(
        `Delete ${table.name}?`
      );

    if (!confirmed) return;

    try {
      setSaving(true);

      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("tables")
        .delete()
        .eq("id", table.id)
        .eq(
          "restaurant_id",
          restaurant.id
        );

      if (error) {
        throw error;
      }

      setTables((current) =>
        current.filter(
          (x) => x.id !== table.id
        )
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Failed to delete table."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * QR URL
   */
  function getQrUrl(
    tableId: string
  ) {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/r/${restaurant?.slug}/t/${tableId}`;
  }

  /*
   * Print QR
   */
  function printQr(
    table: RestaurantTable
  ) {
    const qrUrl =
      getQrUrl(table.id);

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=700,height=800"
      );

    if (!printWindow) {
      alert(
        "Please allow pop-ups to print QR."
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${table.name} QR</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              background: #fff;
            }

            .sheet {
              text-align: center;
              padding: 40px;
            }

            h1 {
              font-size: 32px;
              margin-bottom: 8px;
            }

            p {
              color: #666;
              margin-bottom: 25px;
            }

            .qr {
              width: 300px;
              height: 300px;
              object-fit: contain;
            }

            .url {
              margin-top: 20px;
              font-size: 11px;
              color: #777;
              word-break: break-all;
            }

            @media print {
              .url {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="sheet">
            <h1>${restaurant?.name || "Restaurant"}</h1>

            <h2>${table.name}</h2>

            <p>Scan to view menu and order</p>

            <img
              class="qr"
              src="https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                qrUrl
              )}"
              alt="QR Code"
            />

            <div class="url">
              ${qrUrl}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  /*
   * Loading
   */
  if (loading) {
    return (
      <main className="container">
        <header className="top">
          <div className="brand">
            FEXONIC
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">
            RESTAURANT MANAGEMENT
          </div>

          <h1>
            Loading...
          </h1>

          <p className="muted">
            Preparing your menu and
            table workspace.
          </p>
        </section>
      </main>
    );
  }

  /*
   * Error
   */
  if (error || !restaurant) {
    return (
      <main className="container">
        <div
          className="card"
          style={{
            marginTop: 60,
            textAlign: "center",
          }}
        >
          <div className="eyebrow">
            FEXONIC
          </div>

          <h2>
            Workspace unavailable
          </h2>

          <p className="muted">
            {error ||
              "Restaurant not found."}
          </p>

          <button
            className="btn"
            onClick={() =>
              void loadEverything()
            }
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* HEADER */}

      <header className="top">
        <div>
          <div className="brand">
            FEXONIC
          </div>

          <div
            className="muted smalltext"
            style={{
              marginTop: 3,
            }}
          >
            {restaurant.name}
          </div>
        </div>

        <div className="nav">
          <a
            className="btn light small"
            href={`/k/${restaurant.slug}/orders`}
          >
            Orders
          </a>

          <a
            className="btn light small"
            href="/api/auth/signout"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* HERO */}

      <section className="dashboard-hero">
        <div className="eyebrow">
          RESTAURANT MANAGEMENT
        </div>

        <h1>
          Menu & QR
        </h1>

        <p className="muted">
          Manage food items, availability,
          tables and customer QR codes.
        </p>
      </section>

      {/* STATS */}

      <section className="grid grid3">
        <div className="card stat">
          <span className="muted smalltext">
            Menu items
          </span>

          <strong>
            {items.length}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Available
          </span>

          <strong>
            {
              items.filter(
                (item) =>
                  item.is_available
              ).length
            }
          </strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">
            Tables
          </span>

          <strong>
            {tables.length}
          </strong>
        </div>
      </section>

      {/* MENU */}

      <section
        className="grid grid2 dashboard-section"
      >
        {/* ADD MENU */}

        <div className="card">
          <div className="eyebrow">
            MENU
          </div>

          <h2
            style={{
              marginTop: 7,
            }}
          >
            Add food item
          </h2>

          <form
            onSubmit={addMenuItem}
          >
            <div className="field">
              <label className="label">
                Food name
              </label>

              <input
                className="input"
                placeholder="Chicken biriyani"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <div className="field">
              <label className="label">
                Price
              </label>

              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="180"
                value={price}
                onChange={(event) =>
                  setPrice(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <div className="field">
              <label className="label">
                Food image
              </label>

              <input
                id="menu-image"
                className="input"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setFile(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
              />

              <p className="muted smalltext">
                Maximum 5 MB.
              </p>
            </div>

            <button
              className="btn"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Add item"}
            </button>
          </form>
        </div>

        {/* MENU LIST */}

        <div className="card">
          <div className="eyebrow">
            CURRENT MENU
          </div>

          <h2
            style={{
              marginTop: 7,
            }}
          >
            Food items
          </h2>

          <div
            className="list"
            style={{
              marginTop: 20,
            }}
          >
            {items.length === 0 ? (
              <div
                className="item"
                style={{
                  textAlign: "center",
                  padding: 30,
                }}
              >
                <b>
                  No menu items
                </b>

                <p className="muted smalltext">
                  Add your first food
                  item.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <article
                  className="item"
                  key={item.id}
                >
                  {item.image?.url && (
                    <img
                      src={item.image.url}
                      alt={
                        item.image.alt ||
                        item.name
                      }
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: "100%",
                        height: 170,
                        objectFit:
                          "cover",
                        borderRadius: 14,
                        marginBottom: 13,
                      }}
                    />
                  )}

                  {editingId ===
                  item.id ? (
                    <>
                      <div className="field">
                        <label className="label">
                          Name
                        </label>

                        <input
                          className="input"
                          value={editName}
                          onChange={(
                            event
                          ) =>
                            setEditName(
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div className="field">
                        <label className="label">
                          Price
                        </label>

                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            editPrice
                          }
                          onChange={(
                            event
                          ) =>
                            setEditPrice(
                              event.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div className="actions">
                        <button
                          className="btn small"
                          disabled={saving}
                          onClick={() =>
                            void saveEdit(
                              item.id
                            )
                          }
                        >
                          Save
                        </button>

                        <button
                          className="btn light small"
                          onClick={
                            cancelEdit
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="row">
                        <div>
                          <b>
                            {item.name}
                          </b>

                          <div
                            className="muted"
                            style={{
                              marginTop: 5,
                            }}
                          >
                            ₹
                            {Number(
                              item.price
                            ).toFixed(
                              0
                            )}
                          </div>
                        </div>

                        <span className="pill">
                          {item.is_available
                            ? "AVAILABLE"
                            : "HIDDEN"}
                        </span>
                      </div>

                      <div
                        className="actions"
                        style={{
                          marginTop: 13,
                        }}
                      >
                        <button
                          className="btn light small"
                          onClick={() =>
                            startEdit(
                              item
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="btn light small"
                          onClick={() =>
                            void toggleAvailability(
                              item
                            )
                          }
                        >
                          {item.is_available
                            ? "Hide"
                            : "Show"}
                        </button>

                        <button
                          className="btn danger small"
                          disabled={saving}
                          onClick={() =>
                            void deleteMenuItem(
                              item
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* TABLES */}

      <section
        className="card dashboard-section"
      >
        <div className="eyebrow">
          TABLES & QR
        </div>

        <h2
          style={{
            marginTop: 7,
          }}
        >
          Customer ordering tables
        </h2>

        <p className="muted">
          Every table gets its own QR
          ordering link.
        </p>

        {/* ADD TABLE */}

        <form
          onSubmit={addTable}
          style={{
            maxWidth: 600,
            marginTop: 20,
          }}
        >
          <div className="row">
            <input
              className="input"
              placeholder="Table 1"
              value={tableName}
              onChange={(event) =>
                setTableName(
                  event.target.value
                )
              }
              required
            />

            <button
              className="btn"
              type="submit"
              disabled={saving}
            >
              Add table
            </button>
          </div>
        </form>

        {/* TABLE LIST */}

        <div
          className="grid grid3"
          style={{
            marginTop: 25,
          }}
        >
          {tables.length === 0 ? (
            <div
              className="item"
              style={{
                textAlign: "center",
                padding: 30,
              }}
            >
              <b>
                No tables yet
              </b>

              <p className="muted smalltext">
                Add your first table
                to generate a QR.
              </p>
            </div>
          ) : (
            tables.map((table) => {
              const qrUrl =
                getQrUrl(table.id);

              return (
                <article
                  className="item"
                  key={table.id}
                >
                  <div className="row">
                    <div>
                      <b>
                        {table.name}
                      </b>

                      <div className="muted smalltext">
                        Customer QR
                      </div>
                    </div>

                    <span className="pill">
                      TABLE
                    </span>
                  </div>

                  <QR value={qrUrl} />

                  <div
                    style={{
                      textAlign: "center",
                    }}
                  >
                    <p className="muted smalltext">
                      Scan to open:
                    </p>

                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="smalltext"
                      style={{
                        wordBreak:
                          "break-all",
                      }}
                    >
                      {qrUrl}
                    </a>
                  </div>

                  <div
                    className="actions"
                    style={{
                      marginTop: 15,
                    }}
                  >
                    <a
                      className="btn small"
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open menu
                    </a>

                    <button
                      className="btn light small"
                      onClick={() =>
                        renameTable(
                          table
                        )
                      }
                    >
                      Rename
                    </button>

                    <button
                      className="btn light small"
                      onClick={() =>
                        printQr(table)
                      }
                    >
                      Print QR
                    </button>

                    <button
                      className="btn danger small"
                      disabled={saving}
                      onClick={() =>
                        void deleteTable(
                          table
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <footer className="footer">
        Fexonic · {restaurant.name}
      </footer>
    </main>
  );
}