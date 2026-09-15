import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <header className="top">
        <div className="brand">FEXONIC</div>

        <div className="nav">
          <Link className="btn light" href="/login">
            Login
          </Link>

          <Link className="btn" href="/signup">
            Create restaurant
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">QR RESTAURANT PLATFORM</div>

        <h1>Scan. Order. Kitchen.</h1>

        <p
          className="muted"
          style={{
            fontSize: 18,
            maxWidth: 650,
          }}
        >
          One Fexonic workspace for your menu, tables, QR codes,
          orders and restaurant operations.
        </p>

        <div
          className="actions"
          style={{
            marginTop: 22,
          }}
        >
          <Link className="btn" href="/signup">
            Start your restaurant
          </Link>

          <Link className="btn light" href="/login">
            Restaurant login
          </Link>
        </div>
      </section>

      <section className="grid grid3">
        <div className="card">
          <b>Customer QR menu</b>

          <p className="muted">
            Every table opens the correct restaurant and table
            automatically.
          </p>
        </div>

        <div className="card">
          <b>Kitchen dashboard</b>

          <p className="muted">
            Manage menu, orders, tables and basic restaurant
            operations in one place.
          </p>
        </div>

        <div className="card">
          <b>Multi-tenant security</b>

          <p className="muted">
            Restaurant data is isolated with Supabase Row Level
            Security.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 24,
          }}
        >
          <div>
            <b style={{ color: "var(--text)" }}>FEXONIC</b>

            <div
              className="muted"
              style={{
                marginTop: 5,
                fontSize: 14,
              }}
            >
              QR restaurant ordering platform.
            </div>
          </div>

          <Link
            href="/admin/login"
            className="btn light"
          >
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}