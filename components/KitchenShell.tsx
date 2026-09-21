"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type KitchenShellProps = {
  slug: string;
  restaurant: any;
  active?: "dashboard" | "orders" | "requests" | "manage";
  children: React.ReactNode;
  newOrders?: number;
  requests?: number;
};

export default function KitchenShell({
  slug,
  restaurant,
  active,
  children,
  newOrders = 0,
  requests = 0,
}: KitchenShellProps) {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);

  const go = (path: string) => {
    setMobileMenu(false);
    router.push(path);
  };

  const nav = [
    ["dashboard", "⌂", "Dashboard", `/k/${slug}`],
    ["orders", "▤", "Orders", `/k/${slug}/orders`],
    ["requests", "♧", "Requests", `/k/${slug}/requests`],
    ["manage", "▦", "Menu & Tables", `/k/${slug}/manage`],
  ] as const;

  return (
    <main className="fx-app">
      <aside className="fx-sidebar">
        <div className="fx-sidebar-brand">
          <div className="fx-brand-mark">F</div>
          <div>
            <strong>Fexonic</strong>
            <span>Kitchen workspace</span>
          </div>
        </div>

        <div className="fx-restaurant-mini">
          <span className="fx-avatar">
            {String(restaurant?.name || "R").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{restaurant?.name || "Restaurant"}</strong>
            <span>Restaurant workspace</span>
          </div>
        </div>

        <nav className="fx-sidebar-nav">
          {nav.map(([key, icon, label, path]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              onClick={() => go(path)}
            >
              <span>{icon}</span>
              {label}
              {key === "orders" && newOrders > 0 && <b>{newOrders}</b>}
              {key === "requests" && requests > 0 && <b>{requests}</b>}
            </button>
          ))}
        </nav>

        <div className="fx-sidebar-bottom">
          <button onClick={() => go(`/k/${slug}/manage`)}>
            <span>⚙</span> Manage workspace
          </button>
          <a href="/api/auth/signout" className="fx-sidebar-logout">
            <span>↪</span> Sign out
          </a>
        </div>
      </aside>

      {mobileMenu && (
        <div
          className="fx-mobile-overlay"
          onClick={() => setMobileMenu(false)}
        >
          <aside
            className="fx-mobile-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fx-drawer-top">
              <div>
                <strong>{restaurant?.name}</strong>
                <span>Powered by Fexonic</span>
              </div>
              <button
                onClick={() => setMobileMenu(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="fx-drawer-links">
              {nav.map(([key, icon, label, path]) => (
                <button key={key} onClick={() => go(path)}>
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            <a href="/api/auth/signout" className="fx-drawer-logout">
              ↪ Sign out
            </a>
          </aside>
        </div>
      )}

      <div className="fx-main">
        <header className="fx-topbar">
          <div className="fx-topbar-title">
            <span className="fx-mobile-brand">FEXONIC</span>
            <span className="fx-desktop-context">
              Kitchen workspace /{" "}
              {active === "orders"
                ? "Orders"
                : active === "requests"
                ? "Requests"
                : active === "manage"
                ? "Menu & Tables"
                : "Dashboard"}
            </span>
          </div>

          <div className="fx-topbar-actions">
            <button
              className="fx-round-button fx-mobile-only"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="fx-topbar-profile">
              <span className="fx-avatar">
                {String(restaurant?.name || "R").slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{restaurant?.name}</strong>
                <small>Restaurant</small>
              </span>
            </div>
          </div>
        </header>

        <div className="fx-content">{children}</div>

        <nav className="fx-bottom-nav" aria-label="Kitchen navigation">
          {nav.map(([key, icon, label, path]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              onClick={() => go(path)}
            >
              <span>{icon}</span>
              {label === "Menu & Tables" ? "Manage" : label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
