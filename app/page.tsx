import Link from 'next/link';

export default function Home() {
  return (
    <main className="container">
      <header className="top">
        <div className="brand">FEXONIC</div>

        <nav className="nav">
          <Link className="btn light" href="/login">
            Login
          </Link>

          <Link className="btn" href="/signup">
            Create restaurant
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">QR RESTAURANT OPERATING SYSTEM</div>

          <h1>
            Your restaurant.
            <br />
            One workspace.
          </h1>

          <p className="muted">
            Fexonic brings menus, table QR codes, customer orders and kitchen
            operations together in one simple workspace.
          </p>

          <div className="landing-actions">
            <Link className="btn" href="/signup">
              Start your restaurant →
            </Link>

            <Link className="btn light" href="/login">
              Restaurant login
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="eyebrow">BUILT FOR RESTAURANTS</div>

        <h2 className="section-title" style={{ marginTop: 8 }}>
          Everything important. In one place.
        </h2>

        <div className="grid grid3">
          <article className="card feature-card">
            <span className="feature-number">01</span>

            <h3>Table QR ordering</h3>

            <p className="muted">
              Give every table its own QR code. Customers scan and open the
              correct menu instantly.
            </p>
          </article>

          <article className="card feature-card">
            <span className="feature-number">02</span>

            <h3>Kitchen workspace</h3>

            <p className="muted">
              Manage your menu, tables, incoming orders and restaurant revenue
              from one dashboard.
            </p>
          </article>

          <article className="card feature-card">
            <span className="feature-number">03</span>

            <h3>Built for multiple restaurants</h3>

            <p className="muted">
              Each restaurant gets its own isolated workspace while Fexonic
              manages the platform centrally.
            </p>
          </article>
        </div>
      </section>

      <footer className="footer">
        FEXONIC — Restaurant ordering infrastructure.
      </footer>
    </main>
  );
}