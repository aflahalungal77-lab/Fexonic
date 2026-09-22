"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type KitchenShellProps = {
  slug: string;
  restaurant: any;
  active?: "dashboard" | "orders" | "requests" | "manage";
  children: React.ReactNode;
  newOrders?: number;
  requests?: number;
};

type IconName =
  | "home"
  | "orders"
  | "requests"
  | "tables"
  | "menu"
  | "grid"
  | "staff"
  | "settings"
  | "reports"
  | "history"
  | "feedback"
  | "logout"
  | "close"
  | "chevron"
  | "bell"
  | "menuIcon";

function Icon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-7h6v7" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );

    case "requests":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "tables":
      return (
        <svg {...common}>
          <path d="M4 8h16" />
          <path d="M6 8v10" />
          <path d="M18 8v10" />
          <path d="M3 18h18" />
          <path d="M8 4h8" />
          <path d="M8 4v4" />
          <path d="M16 4v4" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M6 3v7" />
          <path d="M9 3v7" />
          <path d="M12 3v7" />
          <path d="M6 10c0 2 1.5 3 3 3s3-1 3-3" />
          <path d="M9 13v8" />
          <path d="M17 3v18" />
          <path d="M17 3c2 2 3 4 3 7h-3" />
        </svg>
      );

    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      );

    case "staff":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
          <path d="M15 15c3 0 5 1.5 5 4" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.5v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.5h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.7l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.5v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.5h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );

    case "reports":
      return (
        <svg {...common}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M22 19V3" />
        </svg>
      );

    case "history":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
          <path d="M4 5v4h4" />
        </svg>
      );

    case "feedback":
      return (
        <svg {...common}>
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 4v16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "menuIcon":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );

    default:
      return null;
  }
}

export default function KitchenShell({
  slug,
  restaurant,
  active = "dashboard",
  children,
  newOrders = 0,
  requests = 0,
}: KitchenShellProps) {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);

  const restaurantName = restaurant?.name || "Restaurant";

  const go = (path: string) => {
    setMobileMenu(false);
    router.push(path);
  };

  const mainNavigation = [
    {
      key: "dashboard" as const,
      label: "Dashboard",
      icon: "home" as IconName,
      path: `/k/${slug}`,
    },
    {
      key: "orders" as const,
      label: "Orders",
      icon: "orders" as IconName,
      path: `/k/${slug}/orders`,
      badge: newOrders,
    },
    {
      key: "requests" as const,
      label: "Requests",
      icon: "requests" as IconName,
      path: `/k/${slug}/requests`,
      badge: requests,
    },
    {
      key: "manage" as const,
      label: "Manage",
      icon: "tables" as IconName,
      path: `/k/${slug}/manage`,
    },
  ];

  const managementNavigation = [
    {
      label: "Menu",
      icon: "menu" as IconName,
      path: `/k/${slug}/manage`,
    },
    {
      label: "Tables & QR",
      icon: "grid" as IconName,
      path: `/k/${slug}/manage`,
    },

  ];

  const businessNavigation = [

    {
      label: "Order History",
      icon: "history" as IconName,
      path: null,
    }
  ];

  const renderNavItem = (
    item: {
      label: string;
      icon: IconName;
      path: string | null;
      key?: string;
      badge?: number;
    },
    isActive = false
  ) => {
    const content = (
      <>
        <span className="fx-nav-icon">
          <Icon name={item.icon} size={19} />
        </span>

        <span className="fx-nav-label">{item.label}</span>

        {item.badge && item.badge > 0 ? (
          <span className="fx-nav-badge">{item.badge}</span>
        ) : null}
      </>
    );

    if (!item.path) {
      return (
        <button
          key={item.label}
          type="button"
          className={`fx-nav-item ${isActive ? "active" : ""} fx-nav-disabled`}
          onClick={() => {}}
        >
          {content}
        </button>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        className={`fx-nav-item ${isActive ? "active" : ""}`}
        onClick={() => go(item.path!)}
      >
        {content}
      </button>
    );
  };

  return (
    <main className="fx-app">
      {/* DESKTOP / TABLET SIDEBAR */}
      <aside className="fx-sidebar">
        <div className="fx-sidebar-inner">
          {/* BRAND */}
          <div className="fx-sidebar-brand">
            <div className="fx-brand-wordmark">Man.ko</div>

            <span className="fx-brand-subtitle">
              Restaurant Workspace
            </span>
          </div>

          {/* WORKSPACE */}
          <div className="fx-sidebar-section">
            <div className="fx-sidebar-section-title">WORKSPACE</div>

            <nav className="fx-sidebar-nav">
              {mainNavigation.map((item) =>
                renderNavItem(item, active === item.key)
              )}
            </nav>
          </div>

          {/* MANAGEMENT */}
          <div className="fx-sidebar-section">
            <div className="fx-sidebar-section-title">MANAGEMENT</div>

            <nav className="fx-sidebar-nav">
              {managementNavigation.map((item) =>
                renderNavItem(item)
              )}
            </nav>
          </div>

          {/* BUSINESS */}
          <div className="fx-sidebar-section">
            <div className="fx-sidebar-section-title">BUSINESS</div>

            <nav className="fx-sidebar-nav">
              {businessNavigation.map((item) =>
                renderNavItem(item)
              )}
            </nav>
          </div>

          <div className="fx-sidebar-spacer" />

          {/* PROFILE CARD */}
          <button
            type="button"
            className="fx-sidebar-profile"
            onClick={() => go(`/k/${slug}/manage`)}
          >
            <span className="fx-profile-avatar">
              {String(restaurantName).slice(0, 1).toUpperCase()}
            </span>

            <span className="fx-profile-info">
              <strong>{restaurantName}</strong>
              <small>View Restaurant Profile</small>
            </span>

            <Icon name="chevron" size={18} />
          </button>

          {/* LOGOUT */}
          <a href="/api/auth/signout" className="fx-sidebar-logout">
            <Icon name="logout" size={19} />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenu && (
        <div
          className="fx-mobile-overlay"
          onClick={() => setMobileMenu(false)}
        >
          <aside
            className="fx-mobile-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            {/* DRAWER HEADER */}
            <div className="fx-drawer-header">
              <div>
                <div className="fx-drawer-brand">Man.ko</div>
                <div className="fx-drawer-subtitle">
                  Restaurant Workspace
                </div>
              </div>

              <button
                type="button"
                className="fx-drawer-close"
                onClick={() => setMobileMenu(false)}
                aria-label="Close menu"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            {/* WORKSPACE */}
            <div className="fx-drawer-section">
              <div className="fx-drawer-section-title">
                WORKSPACE
              </div>

              {mainNavigation.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`fx-drawer-item ${
                    active === item.key ? "active" : ""
                  }`}
                  onClick={() => go(item.path)}
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>

                  {item.badge && item.badge > 0 ? (
                    <b>{item.badge}</b>
                  ) : null}
                </button>
              ))}
            </div>

            {/* MANAGEMENT */}
            <div className="fx-drawer-section">
              <div className="fx-drawer-section-title">
                MANAGEMENT
              </div>

              {managementNavigation.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="fx-drawer-item"
                  onClick={() => {
                    if (item.path) {
                      go(item.path);
                    }
                  }}
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* BUSINESS */}
            <div className="fx-drawer-section">
              <div className="fx-drawer-section-title">
                BUSINESS
              </div>

              {businessNavigation.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="fx-drawer-item fx-nav-disabled"
                >
                  <Icon name={item.icon} size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="fx-drawer-spacer" />

            {/* PROFILE */}
            <button
              type="button"
              className="fx-drawer-profile"
              onClick={() => go(`/k/${slug}/manage`)}
            >
              <span className="fx-profile-avatar">
                {String(restaurantName)
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <span className="fx-profile-info">
                <strong>{restaurantName}</strong>
                <small>View Restaurant Profile</small>
              </span>

              <Icon name="chevron" size={18} />
            </button>

            {/* LOGOUT */}
            <a
              href="/api/auth/signout"
              className="fx-drawer-logout"
            >
              <Icon name="logout" size={20} />
              <span>Logout</span>
            </a>
          </aside>
        </div>
      )}

      {/* MAIN */}
      <div className="fx-main">
        {/* TOP BAR */}
        <header className="fx-topbar">
          <div className="fx-topbar-left">
            <div className="fx-mobile-logo">
              <strong>Man.ko</strong>
              <span>Powered by FEXONIC</span>
            </div>

            <div className="fx-desktop-breadcrumb">
              <span>Kitchen Dashboard</span>
            </div>
          </div>

          <div className="fx-topbar-right">
            {/* NOTIFICATION */}
            <button
              type="button"
              className="fx-notification-button"
              aria-label="Notifications"
            >
              <Icon name="bell" size={21} />

              {newOrders > 0 && (
                <span className="fx-notification-dot" />
              )}
            </button>

            {/* MOBILE MENU */}
            <button
              type="button"
              className="fx-mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Icon name="menuIcon" size={23} />
            </button>

            {/* DESKTOP PROFILE */}
            <button
              type="button"
              className="fx-topbar-profile"
              onClick={() => go(`/k/${slug}/manage`)}
            >
              <span className="fx-profile-avatar">
                {String(restaurantName)
                  .slice(0, 1)
                  .toUpperCase()}
              </span>

              <span className="fx-topbar-profile-info">
                <strong>{restaurantName}</strong>
                <small>Restaurant</small>
              </span>
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="fx-content">{children}</div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fx-bottom-nav" aria-label="Kitchen navigation">
          {mainNavigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`fx-bottom-item ${
                active === item.key ? "active" : ""
              }`}
              onClick={() => go(item.path)}
            >
              <span className="fx-bottom-icon">
                <Icon name={item.icon} size={20} />

                {item.badge && item.badge > 0 ? (
                  <b>{item.badge}</b>
                ) : null}
              </span>

              <span>
                {item.key === "manage" ? "Tables" : item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}