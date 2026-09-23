"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import KitchenShell from "@/components/KitchenShell";
import QR from "@/components/QR";
import { supabaseBrowser } from "@/lib/supabase";

type ManageTab = "menu" | "tables";

type CustomerSlot = {
  id: string;
  table_id: string;
  slot_code: "A" | "B" | "C" | "D";
  label: string;
  is_active: boolean;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  price: number | string;
  image:
    | {
        path?: string;
        url?: string;
        alt?: string;
      }
    | null;
  created_at?: string;
};

type TableItem = {
  id: string;
  restaurant_id: string;
  name: string;
  is_active?: boolean;
  created_at?: string;
  sort_order?: number;
};

const CUSTOMER_SLOTS = [
  {
    code: "A",
    label: "Customer A",
  },
  {
    code: "B",
    label: "Customer B",
  },
  {
    code: "C",
    label: "Customer C",
  },
  {
    code: "D",
    label: "Customer D",
  },
] as const;

function money(value: number | string) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

export default function ManagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();

  const [slug, setSlug] = useState("");

  const [restaurant, setRestaurant] =
    useState<Restaurant | null>(null);

  const [activeTab, setActiveTab] =
    useState<ManageTab>("menu");

  const [menuItems, setMenuItems] =
    useState<MenuItem[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [tables, setTables] =
    useState<TableItem[]>([]);

  const [customerSlots, setCustomerSlots] =
    useState<CustomerSlot[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("ALL");

  /* =========================
     MENU MODAL
     ========================= */

  const [menuModal, setMenuModal] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState<MenuItem | null>(null);

  const [menuName, setMenuName] =
    useState("");

  const [menuPrice, setMenuPrice] =
    useState("");

  const [menuCategory, setMenuCategory] =
    useState("");

  const [menuImage, setMenuImage] =
    useState<File | null>(null);

  const [menuSaving, setMenuSaving] =
    useState(false);

  /* =========================
     TABLE MODAL
     ========================= */

  const [tableModal, setTableModal] =
    useState(false);

  const [tableName, setTableName] =
    useState("");

  const [tableSaving, setTableSaving] =
    useState(false);

  const [busyTable, setBusyTable] =
    useState<string | null>(null);

  /* =========================
     QR MODAL
     ========================= */

  const [selectedTable, setSelectedTable] =
    useState<TableItem | null>(null);

  const [qrModal, setQrModal] =
    useState(false);

  useEffect(() => {
    params.then((value) => {
      setSlug(value.slug);
    });
  }, [params]);

  /* =========================
     LOAD EVERYTHING
     ========================= */

  const loadData = useCallback(
    async () => {
      if (!slug) return;

      setRefreshing(true);

      try {
        const supabase =
          supabaseBrowser();

        const {
          data: restaurantData,
          error: restaurantError,
        } = await supabase
          .from("restaurants")
          .select("id,name,slug")
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

        const [
          menuResult,
          categoryResult,
          tableResult,
          slotResult,
        ] = await Promise.all([
          supabase
            .from("menu_items")
            .select("*")
            .eq(
              "restaurant_id",
              restaurantData.id
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("menu_categories")
            .select("id,name")
            .eq(
              "restaurant_id",
              restaurantData.id
            )
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("tables")
            .select(
              "id,restaurant_id,name,is_active,sort_order,created_at"
            )
            .eq(
              "restaurant_id",
              restaurantData.id
            )
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("customer_slots")
            .select(
              "id,table_id,slot_code,label,is_active"
            )
            .eq(
              "restaurant_id",
              restaurantData.id
            )
            .order("slot_code", {
              ascending: true,
            }),
        ]);

        if (menuResult.error) {
          throw menuResult.error;
        }

        if (categoryResult.error) {
          throw categoryResult.error;
        }

        if (tableResult.error) {
          throw tableResult.error;
        }

        /*
         * Customer slots are member-only through RLS.
         * If this query fails, the table QR still works
         * because the slot itself is generated from A/B/C/D.
         */
        if (slotResult.error) {
          console.warn(
            "Customer slot loading warning:",
            slotResult.error
          );
        }

        setMenuItems(
          menuResult.data || []
        );

        setCategories(
          categoryResult.data || []
        );

        setTables(
          tableResult.data || []
        );

        setCustomerSlots(
          slotResult.data || []
        );
      } catch (error) {
        console.error(
          "Manage page loading error:",
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
    loadData();
  }, [loadData]);

  /* =========================
     MENU
     ========================= */

  function resetMenuForm() {
    setEditingItem(null);
    setMenuName("");
    setMenuPrice("");
    setMenuCategory("");
    setMenuImage(null);
  }

  function openAddMenu() {
    resetMenuForm();
    setMenuModal(true);
  }

  function openEditMenu(
    item: MenuItem
  ) {
    setEditingItem(item);
    setMenuName(item.name);
    setMenuPrice(String(item.price));
    setMenuCategory(
      item.category_id || ""
    );
    setMenuImage(null);
    setMenuModal(true);
  }

  function closeMenuModal() {
    if (menuSaving) return;

    setMenuModal(false);
    resetMenuForm();
  }

  async function uploadFoodImage(
    file: File
  ) {
    if (!restaurant) {
      throw new Error(
        "Restaurant not found"
      );
    }

    const supabase =
      supabaseBrowser();

    const extension =
      file.name.split(".").pop() ||
      "jpg";

    const path =
      `${restaurant.id}/${crypto.randomUUID()}.${extension}`;

    const {
      error,
    } = await supabase.storage
      .from("food-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const {
      data,
    } = supabase.storage
      .from("food-images")
      .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
      alt: menuName.trim(),
    };
  }

  async function saveMenuItem() {
    if (!restaurant) return;

    const name =
      menuName.trim();

    const price =
      Number(menuPrice);

    if (!name) {
      window.alert(
        "Please enter the food name."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      window.alert(
        "Please enter a valid price."
      );
      return;
    }

    setMenuSaving(true);

    try {
      const supabase =
        supabaseBrowser();

      let image =
        editingItem?.image || null;

      if (menuImage) {
        image =
          await uploadFoodImage(
            menuImage
          );
      }

      if (editingItem) {
        const {
          error,
        } = await supabase
          .from("menu_items")
          .update({
            name,
            price,
            category_id:
              menuCategory || null,
            ...(image
              ? { image }
              : {}),
          })
          .eq(
            "id",
            editingItem.id
          )
          .eq(
            "restaurant_id",
            restaurant.id
          );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from("menu_items")
          .insert({
            restaurant_id:
              restaurant.id,
            name,
            price,
            category_id:
              menuCategory || null,
            image,
          });

        if (error) {
          throw error;
        }
      }

      setMenuModal(false);
      resetMenuForm();

      await loadData();
    } catch (error: any) {
      console.error(
        "Menu save error:",
        error
      );

      window.alert(
        error?.message ||
          "Could not save menu item."
      );
    } finally {
      setMenuSaving(false);
    }
  }

  async function deleteMenuItem(
    item: MenuItem
  ) {
    const ok =
      window.confirm(
        `Delete "${item.name}"?`
      );

    if (!ok) return;

    try {
      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("menu_items")
        .delete()
        .eq(
          "id",
          item.id
        )
        .eq(
          "restaurant_id",
          restaurant!.id
        );

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error: any) {
      console.error(
        "Menu delete error:",
        error
      );

      window.alert(
        error?.message ||
          "Could not delete item."
      );
    }
  }

  /* =========================
     TABLES
     ========================= */

  function openAddTable() {
    setTableName("");
    setTableModal(true);
  }

  function closeTableModal() {
    if (tableSaving) return;

    setTableModal(false);
    setTableName("");
  }

  async function addTable() {
    if (!restaurant) return;

    const name =
      tableName.trim();

    if (!name) {
      window.alert(
        "Please enter a table name."
      );
      return;
    }

    setTableSaving(true);

    try {
      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("tables")
        .insert({
          restaurant_id:
            restaurant.id,
          name,
          is_active: true,
        });

      if (error) {
        throw error;
      }

      /*
       * Database trigger automatically creates:
       * Customer A
       * Customer B
       * Customer C
       * Customer D
       */

      closeTableModal();

      await loadData();
    } catch (error: any) {
      console.error(
        "Table add error:",
        error
      );

      window.alert(
        error?.message ||
          "Could not add table."
      );
    } finally {
      setTableSaving(false);
    }
  }

  async function deleteTable(
    table: TableItem
  ) {
    const ok =
      window.confirm(
        `Delete "${table.name}"?`
      );

    if (!ok) return;

    setBusyTable(table.id);

    try {
      const supabase =
        supabaseBrowser();

      const {
        error,
      } = await supabase
        .from("tables")
        .delete()
        .eq(
          "id",
          table.id
        )
        .eq(
          "restaurant_id",
          restaurant!.id
        );

      if (error) {
        throw error;
      }

      await loadData();
    } catch (error: any) {
      console.error(
        "Table delete error:",
        error
      );

      window.alert(
        error?.message ||
          "Could not delete table."
      );
    } finally {
      setBusyTable(null);
    }
  }

  /* =========================
     CUSTOMER QR
     ========================= */

  function customerUrl(
    table: TableItem,
    slotCode?: "A" | "B" | "C" | "D"
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    const base =
      `${window.location.origin}/r/${restaurant?.slug}/t/${table.id}`;

    if (!slotCode) {
      return base;
    }

    return `${base}?customer=${slotCode}`;
  }

  function getSlot(
    tableId: string,
    slotCode: "A" | "B" | "C" | "D"
  ) {
    return customerSlots.find(
      (slot) =>
        slot.table_id === tableId &&
        slot.slot_code === slotCode
    );
  }

  async function copyCustomerUrl(
    table: TableItem,
    slotCode?: "A" | "B" | "C" | "D"
  ) {
    const url =
      customerUrl(
        table,
        slotCode
      );

    if (!url) return;

    try {
      await navigator.clipboard.writeText(
        url
      );

      window.alert(
        slotCode
          ? `Customer ${slotCode} link copied.`
          : "Customer link copied."
      );
    } catch {
      window.prompt(
        "Copy this customer link:",
        url
      );
    }
  }

  function openCustomerMenu(
    table: TableItem,
    slotCode?: "A" | "B" | "C" | "D"
  ) {
    const url =
      customerUrl(
        table,
        slotCode
      );

    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openQr(
    table: TableItem
  ) {
    setSelectedTable(table);
    setQrModal(true);
  }

  function closeQr() {
    setQrModal(false);
    setSelectedTable(null);
  }

  /* =========================
     FILTERED MENU
     ========================= */

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return menuItems.filter(
        (item) => {
          const matchesSearch =
            !query ||
            item.name
              .toLowerCase()
              .includes(query);

          const matchesCategory =
            selectedCategory ===
              "ALL" ||
            item.category_id ===
              selectedCategory;

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      menuItems,
      search,
      selectedCategory,
    ]);

  const totalMenu =
    menuItems.length;

  const totalTables =
    tables.length;

  /* =========================
     LOADING
     ========================= */

  if (
    loading &&
    !restaurant
  ) {
    return (
      <main className="fx-app">
        <div className="mt-loading">
          <div className="mt-loading-logo">
            F
          </div>

          <strong>
            Fexonic
          </strong>

          <span>
            Loading workspace...
          </span>
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
      active="manage"
      newOrders={0}
      requests={0}
    >
      <div className="mt-page">

        {/* ==================================================
            PAGE HEADER
            ================================================== */}

        <section className="mt-header">
          <div>
            <p className="mt-eyebrow">
              RESTAURANT MANAGEMENT
            </p>

            <h1>
              Manage
            </h1>

            <p className="mt-subtitle">
              Manage your menu, tables and
              customer QR ordering.
            </p>
          </div>

          <button
            type="button"
            className="mt-refresh"
            onClick={loadData}
            disabled={refreshing}
          >
            <span
              className={
                refreshing
                  ? "mt-refresh-spin"
                  : ""
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </section>

        {/* ==================================================
            TWO MAIN BUTTONS
            ================================================== */}

        <section className="mt-tabs">

          <button
            type="button"
            className={
              activeTab === "menu"
                ? "mt-tab active"
                : "mt-tab"
            }
            onClick={() =>
              setActiveTab("menu")
            }
          >
            <span className="mt-tab-icon">
              ▦
            </span>

            <span className="mt-tab-text">
              <strong>
                Menu
              </strong>

              <small>
                Food items & prices
              </small>
            </span>

            <b>
              {totalMenu}
            </b>
          </button>

          <button
            type="button"
            className={
              activeTab === "tables"
                ? "mt-tab active"
                : "mt-tab"
            }
            onClick={() =>
              setActiveTab("tables")
            }
          >
            <span className="mt-tab-icon">
              QR
            </span>

            <span className="mt-tab-text">
              <strong>
                QR & Tables
              </strong>

              <small>
                Tables & customer QR
              </small>
            </span>

            <b>
              {totalTables}
            </b>
          </button>

        </section>

        {/* ==================================================
            MENU VIEW
            ================================================== */}

        {activeTab === "menu" && (
          <section className="mt-view">

            <div className="mt-view-header">
              <div>
                <p className="mt-eyebrow">
                  MENU
                </p>

                <h2>
                  Food items
                </h2>

                <span>
                  Add and manage the food
                  shown to customers.
                </span>
              </div>

              <button
                type="button"
                className="mt-primary"
                onClick={openAddMenu}
              >
                <span>
                  +
                </span>

                Add item
              </button>
            </div>

            <div className="mt-menu-toolbar">

              <div className="mt-search">
                <span>
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search food..."
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-categories">

                <button
                  type="button"
                  className={
                    selectedCategory ===
                    "ALL"
                      ? "mt-category active"
                      : "mt-category"
                  }
                  onClick={() =>
                    setSelectedCategory(
                      "ALL"
                    )
                  }
                >
                  All
                  <b>
                    {menuItems.length}
                  </b>
                </button>

                {categories.map(
                  (category) => {
                    const count =
                      menuItems.filter(
                        (item) =>
                          item.category_id ===
                          category.id
                      ).length;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={
                          selectedCategory ===
                          category.id
                            ? "mt-category active"
                            : "mt-category"
                        }
                        onClick={() =>
                          setSelectedCategory(
                            category.id
                          )
                        }
                      >
                        {category.name}

                        <b>
                          {count}
                        </b>
                      </button>
                    );
                  }
                )}

              </div>
            </div>

            {filteredItems.length ===
            0 ? (
              <div className="mt-empty">
                <div className="mt-empty-icon">
                  ▦
                </div>

                <h3>
                  {search
                    ? "No food found"
                    : "Your menu is empty"}
                </h3>

                <p>
                  {search
                    ? "Try another search."
                    : "Add your first food item."}
                </p>

                {!search && (
                  <button
                    type="button"
                    onClick={
                      openAddMenu
                    }
                  >
                    Add menu item
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-food-grid">

                {filteredItems.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="mt-food-card"
                    >

                      <div className="mt-food-image">

                        {item.image?.url ? (
                          <img
                            src={
                              item.image
                                .url
                            }
                            alt={
                              item.image
                                .alt ||
                              item.name
                            }
                          />
                        ) : (
                          <div className="mt-no-image">
                            <span>
                              ♨
                            </span>

                            <small>
                              No image
                            </small>
                          </div>
                        )}

                        <button
                          type="button"
                          className="mt-image-edit"
                          onClick={() =>
                            openEditMenu(
                              item
                            )
                          }
                        >
                          ✎
                        </button>

                      </div>

                      <div className="mt-food-body">

                        <div className="mt-food-top">

                          <div>
                            <h3>
                              {item.name}
                            </h3>

                            <span>
                              {categories.find(
                                (
                                  category
                                ) =>
                                  category.id ===
                                  item.category_id
                              )?.name ||
                                "Food item"}
                            </span>
                          </div>

                          <strong>
                            {money(
                              item.price
                            )}
                          </strong>

                        </div>

                        <div className="mt-food-actions">

                          <button
                            type="button"
                            className="mt-edit-button"
                            onClick={() =>
                              openEditMenu(
                                item
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="mt-delete-button"
                            onClick={() =>
                              deleteMenuItem(
                                item
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </div>
                    </article>
                  )
                )}

              </div>
            )}
          </section>
        )}

        {/* ==================================================
            TABLES / QR VIEW
            ================================================== */}

        {activeTab === "tables" && (
          <section className="mt-view">

            <div className="mt-view-header">
              <div>
                <p className="mt-eyebrow">
                  QR & TABLES
                </p>

                <h2>
                  Tables
                </h2>

                <span>
                  Every table gets 4 customer
                  QR codes.
                </span>
              </div>

              <button
                type="button"
                className="mt-primary"
                onClick={openAddTable}
              >
                <span>
                  +
                </span>

                Add table
              </button>
            </div>

            <div className="mt-table-info">
              <div>
                <span>
                  Total tables
                </span>

                <strong>
                  {tables.length}
                </strong>
              </div>

              <p>
                Each table has separate QR
                codes for Customer A, B, C
                and D.
              </p>
            </div>

            {tables.length === 0 ? (
              <div className="mt-empty">
                <div className="mt-empty-icon">
                  QR
                </div>

                <h3>
                  No tables yet
                </h3>

                <p>
                  Add your first restaurant
                  table.
                </p>

                <button
                  type="button"
                  onClick={
                    openAddTable
                  }
                >
                  Add table
                </button>
              </div>
            ) : (
              <div className="mt-table-grid">

                {tables.map(
                  (table) => (
                    <article
                      key={table.id}
                      className="mt-table-card"
                    >

                      <div className="mt-table-top">

                        <div className="mt-table-number">
                          {table.name
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div>
                          <span>
                            TABLE
                          </span>

                          <h3>
                            {table.name}
                          </h3>
                        </div>

                      </div>

                      {/* =====================================
                          FOUR CUSTOMER QR PREVIEWS
                          ===================================== */}

                      <div className="mt-customer-qr-grid">

                        {CUSTOMER_SLOTS.map(
                          (slot) => {
                            const dbSlot =
                              getSlot(
                                table.id,
                                slot.code
                              );

                            return (
                              <div
                                key={
                                  slot.code
                                }
                                className="mt-customer-qr-card"
                              >

                                <div className="mt-customer-qr-title">
                                  <span>
                                    {slot.code}
                                  </span>

                                  <div>
                                    <strong>
                                      {
                                        slot.label
                                      }
                                    </strong>

                                    <small>
                                      {dbSlot
                                        ? "QR ready"
                                        : "QR slot"}
                                    </small>
                                  </div>
                                </div>

                                <div className="mt-qr-preview">
                                  <QR
                                    value={customerUrl(
                                      table,
                                      slot.code
                                    )}
                                  />
                                </div>

                                <div className="mt-customer-qr-actions">

                                  <button
                                    type="button"
                                    className="mt-qr-button"
                                    onClick={() =>
                                      copyCustomerUrl(
                                        table,
                                        slot.code
                                      )
                                    }
                                  >
                                    Copy
                                  </button>

                                  <button
                                    type="button"
                                    className="mt-open-button"
                                    onClick={() =>
                                      openCustomerMenu(
                                        table,
                                        slot.code
                                      )
                                    }
                                  >
                                    Open
                                  </button>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                      <div className="mt-table-actions">

                        <button
                          type="button"
                          className="mt-qr-button"
                          onClick={() =>
                            openQr(
                              table
                            )
                          }
                        >
                          View all QR
                        </button>

                        <button
                          type="button"
                          className="mt-table-delete"
                          disabled={
                            busyTable ===
                            table.id
                          }
                          onClick={() =>
                            deleteTable(
                              table
                            )
                          }
                        >
                          {busyTable ===
                          table.id
                            ? "..."
                            : "Delete table"}
                        </button>

                      </div>

                    </article>
                  )
                )}

              </div>
            )}
          </section>
        )}

      </div>

      {/* ====================================================
          ADD / EDIT MENU MODAL
          ==================================================== */}

      {menuModal && (
        <div
          className="mt-modal-overlay"
          onClick={
            closeMenuModal
          }
        >
          <div
            className="mt-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="mt-modal-handle" />

            <div className="mt-modal-header">

              <div>
                <p className="mt-eyebrow">
                  MENU
                </p>

                <h2>
                  {editingItem
                    ? "Edit food"
                    : "Add food"}
                </h2>
              </div>

              <button
                type="button"
                className="mt-close"
                onClick={
                  closeMenuModal
                }
              >
                ×
              </button>

            </div>

            <div className="mt-form">

              <label>
                <span>
                  Food name
                </span>

                <input
                  value={menuName}
                  onChange={(event) =>
                    setMenuName(
                      event.target.value
                    )
                  }
                  placeholder="Chicken Biriyani"
                />
              </label>

              <div className="mt-form-row">

                <label>
                  <span>
                    Price
                  </span>

                  <div className="mt-price-input">
                    <b>
                      ₹
                    </b>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={menuPrice}
                      onChange={(event) =>
                        setMenuPrice(
                          event.target.value
                        )
                      }
                      placeholder="250"
                    />
                  </div>
                </label>

                <label>
                  <span>
                    Category
                  </span>

                  <select
                    value={
                      menuCategory
                    }
                    onChange={(event) =>
                      setMenuCategory(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      No category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

              </div>

              <label>
                <span>
                  Food image
                </span>

                <div className="mt-file-box">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setMenuImage(
                        event.target
                          .files?.[0] ||
                        null
                      )
                    }
                  />

                  <div>
                    <strong>
                      {menuImage
                        ? menuImage.name
                        : editingItem?.image
                            ?.url
                        ? "Current image"
                        : "Choose food image"}
                    </strong>

                    <small>
                      PNG, JPG or WEBP
                    </small>
                  </div>

                  <span>
                    +
                  </span>

                </div>
              </label>

              <div className="mt-preview">

                {menuImage ? (
                  <img
                    src={URL.createObjectURL(
                      menuImage
                    )}
                    alt="Preview"
                  />
                ) : editingItem?.image
                    ?.url ? (
                  <img
                    src={
                      editingItem.image
                        .url
                    }
                    alt={
                      editingItem.name
                    }
                  />
                ) : (
                  <div>
                    <span>
                      ♨
                    </span>

                    <small>
                      Food image preview
                    </small>
                  </div>
                )}

              </div>

            </div>

            <div className="mt-modal-actions">

              <button
                type="button"
                className="mt-cancel"
                onClick={
                  closeMenuModal
                }
                disabled={
                  menuSaving
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="mt-save"
                onClick={
                  saveMenuItem
                }
                disabled={
                  menuSaving
                }
              >
                {menuSaving
                  ? "Saving..."
                  : editingItem
                  ? "Save changes"
                  : "Add item"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ====================================================
          ADD TABLE MODAL
          ==================================================== */}

      {tableModal && (
        <div
          className="mt-modal-overlay"
          onClick={
            closeTableModal
          }
        >
          <div
            className="mt-modal mt-small-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="mt-modal-handle" />

            <div className="mt-modal-header">

              <div>
                <p className="mt-eyebrow">
                  QR & TABLES
                </p>

                <h2>
                  Add table
                </h2>
              </div>

              <button
                type="button"
                className="mt-close"
                onClick={
                  closeTableModal
                }
              >
                ×
              </button>

            </div>

            <div className="mt-form">

              <label>
                <span>
                  Table name
                </span>

                <input
                  value={tableName}
                  onChange={(event) =>
                    setTableName(
                      event.target.value
                    )
                  }
                  placeholder="Table 1"
                  autoFocus
                />
              </label>

              <div className="mt-table-example">
                <div>
                  T
                </div>

                <span>
                  Every new table
                  automatically gets
                  <strong>
                    Customer A, B, C & D
                  </strong>
                  QR slots.
                </span>
              </div>

            </div>

            <div className="mt-modal-actions">

              <button
                type="button"
                className="mt-cancel"
                onClick={
                  closeTableModal
                }
                disabled={
                  tableSaving
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="mt-save"
                onClick={
                  addTable
                }
                disabled={
                  tableSaving
                }
              >
                {tableSaving
                  ? "Adding..."
                  : "Add table"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ====================================================
          QR MODAL
          ==================================================== */}

      {qrModal &&
        selectedTable && (
          <div
            className="mt-modal-overlay"
            onClick={closeQr}
          >
            <div
              className="mt-qr-modal mt-all-qr-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="mt-modal-handle" />

              <button
                type="button"
                className="mt-qr-close"
                onClick={closeQr}
              >
                ×
              </button>

              <p className="mt-eyebrow">
                CUSTOMER QR
              </p>

              <h2>
                {selectedTable.name}
              </h2>

              <p className="mt-qr-description">
                Use one QR for each customer
                position at this table.
              </p>

              <div className="mt-all-qr-grid">

                {CUSTOMER_SLOTS.map(
                  (slot) => (
                    <div
                      key={
                        slot.code
                      }
                      className="mt-modal-customer-qr"
                    >

                      <div className="mt-customer-qr-title">
                        <span>
                          {slot.code}
                        </span>

                        <div>
                          <strong>
                            {
                              slot.label
                            }
                          </strong>

                          <small>
                            Scan to order
                          </small>
                        </div>
                      </div>

                      <div className="mt-big-qr">
                        <QR
                          value={customerUrl(
                            selectedTable,
                            slot.code
                          )}
                        />
                      </div>

                      <div className="mt-qr-url">
                        {customerUrl(
                          selectedTable,
                          slot.code
                        )}
                      </div>

                      <div className="mt-qr-actions">

                        <button
                          type="button"
                          className="mt-save"
                          onClick={() =>
                            copyCustomerUrl(
                              selectedTable,
                              slot.code
                            )
                          }
                        >
                          Copy link
                        </button>

                        <button
                          type="button"
                          className="mt-cancel"
                          onClick={() =>
                            openCustomerMenu(
                              selectedTable,
                              slot.code
                            )
                          }
                        >
                          Open menu
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          </div>
        )}

    </KitchenShell>
  );
}