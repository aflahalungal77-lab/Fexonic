import Link from "next/link";

export default function HomePage() {
  return (
    <main className="fexonic-home">
      {/* NAVBAR */}
      <header className="fx-home-nav">
        <div className="fx-home-logo">
          FEXONIC<span>™</span>
        </div>

        <nav className="fx-home-links">
          <a href="#home" className="active">
            Home
          </a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="fx-home-actions">
          <Link href="/login" className="fx-login">
            Login
          </Link>

          <Link href="/signup" className="fx-dark-btn">
            Get Started <span>→</span>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="fx-hero">
        <div className="fx-hero-left">
          <div className="fx-eyebrow">
            <span className="fx-dot" />
            Restaurant Management System
          </div>

          <h1>
            Run Your Restaurant
            <br />
            Smarter with <span>Fexonic</span>
          </h1>

          <p className="fx-hero-description">
            Streamline orders, manage tables, handle customer requests,
            and keep your restaurant running smoothly — all in one
            powerful platform.
          </p>

          <div className="fx-mini-features">
            <MiniFeature
              icon="↗"
              title="Fast Orders"
              text="Serve customers in seconds"
            />

            <MiniFeature
              icon="⌘"
              title="Table Management"
              text="Smart seating & QR ordering"
            />

            <MiniFeature
              icon="⌁"
              title="Kitchen Control"
              text="Real-time order tracking"
            />

            <MiniFeature
              icon="✦"
              title="Complete Solution"
              text="Menu, staff & more"
            />
          </div>

          <div className="fx-hero-buttons">
            <Link href="/signup" className="fx-primary-btn">
              Start Free Trial
              <span>→</span>
            </Link>

            <a href="#how" className="fx-outline-btn">
              <span className="fx-play">▶</span>
              See How It Works
            </a>
          </div>

          <div className="fx-stats">
            <div>
              <strong>1000+</strong>
              <span>Restaurants Trust Us</span>
            </div>

            <div>
              <strong>50K+</strong>
              <span>Orders Managed</span>
            </div>

            <div>
              <strong>99.9%</strong>
              <span>Reliable Platform</span>
            </div>
          </div>
        </div>

        {/* HERO DASHBOARD */}
        <div className="fx-hero-right">
          <div className="fx-food-circle">
            <div className="fx-food-plate">🍛</div>
          </div>

          <div className="fx-dashboard">
            <div className="fx-dashboard-sidebar">
              <div className="fx-dashboard-logo">
                FEXONIC<span>™</span>
              </div>

              <div className="fx-side-item selected">
                <span>⌂</span>
                Dashboard
              </div>

              <div className="fx-side-item">
                <span>▤</span>
                Orders
              </div>

              <div className="fx-side-item">
                <span>♧</span>
                Requests
              </div>

              <div className="fx-side-item">
                <span>▦</span>
                Menu & Tables
              </div>

              <div className="fx-side-bottom">
                <div>◉ Profile</div>
                <div>↪ Logout</div>
              </div>
            </div>

            <div className="fx-dashboard-main">
              <div className="fx-dashboard-top">
                <div>
                  <strong>Good Morning, Chef! 👋</strong>
                  <span>
                    Here's what's happening at your restaurant today.
                  </span>
                </div>

                <div className="fx-restaurant-status">
                  <span>The Good Food</span>
                  <b>Open</b>
                </div>
              </div>

              <div className="fx-stat-grid">
                <DashboardStat
                  title="Total Orders"
                  value="24"
                  change="+12%"
                />

                <DashboardStat
                  title="Pending Orders"
                  value="5"
                  change="+8%"
                />

                <DashboardStat
                  title="Active Tables"
                  value="8"
                  change="+2%"
                />

                <DashboardStat
                  title="Today's Orders"
                  value="₹12,480"
                  change="+18%"
                />
              </div>

              <div className="fx-dashboard-content">
                <div className="fx-orders-card">
                  <div className="fx-card-heading">
                    <strong>Recent Orders</strong>
                    <span>View All →</span>
                  </div>

                  <OrderRow
                    id="#1024"
                    table="T3"
                    item="Chicken Biriyani"
                    status="Cooking"
                    time="2 min"
                  />

                  <OrderRow
                    id="#1023"
                    table="T5"
                    item="Pasta Alfredo"
                    status="Ready"
                    time="6 min"
                  />

                  <OrderRow
                    id="#1022"
                    table="T2"
                    item="Burger, Fries"
                    status="Served"
                    time="12 min"
                  />

                  <OrderRow
                    id="#1021"
                    table="T8"
                    item="Caesar Salad"
                    status="Served"
                    time="15 min"
                  />

                  <OrderRow
                    id="#1020"
                    table="T6"
                    item="Chicken Wrap"
                    status="Cooking"
                    time="18 min"
                  />
                </div>

                <div className="fx-food-card">
                  <div className="fx-food-image">🍗</div>

                  <strong>Good Food</strong>
                  <strong>Happy Customers</strong>

                  <p>
                    Delicious food,
                    <br />
                    better experiences.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER PHONE */}
          <div className="fx-phone">
            <div className="fx-phone-notch" />

            <div className="fx-phone-header">
              <strong>The Good Food</strong>
              <span>•••</span>
            </div>

            <div className="fx-phone-search">
              🔍 Search menu...
            </div>

            <div className="fx-phone-categories">
              <span className="active">All</span>
              <span>Starters</span>
              <span>Mains</span>
              <span>Drinks</span>
            </div>

            <PhoneFood
              emoji="🍕"
              name="Margherita Pizza"
              price="₹249"
            />

            <PhoneFood
              emoji="🍝"
              name="Pasta Alfredo"
              price="₹199"
            />

            <PhoneFood
              emoji="🍔"
              name="Chicken Burger"
              price="₹179"
            />

            <PhoneFood
              emoji="🍟"
              name="French Fries"
              price="₹99"
            />

            <div className="fx-phone-nav">
              <span className="active">⌂</span>
              <span>▤</span>
              <span>▦</span>
              <span>•••</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="fx-features-section">
        <div className="fx-features-intro">
          <span>EVERYTHING YOU NEED</span>

          <h2>
            Powerful Features
            <br />
            for Modern Restaurants
          </h2>

          <p>
            From order management to table control, Fexonic gives
            you the essential tools to run your restaurant efficiently.
          </p>

          <Link href="/signup" className="fx-small-dark-btn">
            Explore Fexonic <span>→</span>
          </Link>
        </div>

        <div className="fx-feature-grid">
          <FeatureCard
            icon="🛒"
            title="Order Management"
            text="Take, track and manage customer orders in real-time."
          />

          <FeatureCard
            icon="▱"
            title="Table Management"
            text="Manage tables and provide simple QR-based ordering."
          />

          <FeatureCard
            icon="♨"
            title="Kitchen Operations"
            text="Keep your kitchen organized with clear order status."
          />

          <FeatureCard
            icon="☷"
            title="Menu Management"
            text="Create and update your digital restaurant menu easily."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="fx-how-section">
        <div className="fx-section-label">HOW FEXONIC WORKS</div>

        <h2>
          From customer scan
          <br />
          to kitchen-ready order.
        </h2>

        <p>
          Fexonic connects your tables, digital menu, customers and
          kitchen into one simple workflow.
        </p>

        <div className="fx-how-grid">
          <StepCard
            number="01"
            title="Create Your Restaurant"
            text="Create your restaurant account and set up your digital workspace."
          />

          <StepCard
            number="02"
            title="Add Menu & Tables"
            text="Add your food items, categories and restaurant tables."
          />

          <StepCard
            number="03"
            title="Generate QR Codes"
            text="Create a unique QR code for each restaurant table."
          />

          <StepCard
            number="04"
            title="Receive Orders"
            text="Customers scan, order and your kitchen receives the order."
          />
        </div>
      </section>

      {/* DARK CTA */}
      <section id="about" className="fx-dark-section">
        <div>
          <span className="fx-section-label light">
            BUILT FOR RESTAURANTS
          </span>

          <h2>
            Less confusion.
            <br />
            More control.
          </h2>

          <p>
            Fexonic helps restaurant teams spend less time managing
            manual processes and more time serving customers.
          </p>

          <Link href="/signup" className="fx-white-btn">
            Get Started Free
            <span>→</span>
          </Link>
        </div>

        <div className="fx-dark-metrics">
          <div>
            <strong>01</strong>
            <span>Digital Menu</span>
          </div>

          <div>
            <strong>02</strong>
            <span>QR Ordering</span>
          </div>

          <div>
            <strong>03</strong>
            <span>Kitchen Control</span>
          </div>

          <div>
            <strong>04</strong>
            <span>Table Management</span>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="fx-final-cta">
        <span>READY TO START?</span>

        <h2>
          Run your restaurant
          <br />
          the smarter way.
        </h2>

        <p>
          Set up your restaurant with Fexonic and simplify
          ordering, tables and kitchen operations.
        </p>

        <div className="fx-final-buttons">
          <Link href="/signup" className="fx-primary-btn">
            Start Free
            <span>→</span>
          </Link>

          <Link href="/login" className="fx-outline-btn">
            Login to Fexonic
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fx-footer">
        <div className="fx-footer-brand">
          FEXONIC<span>™</span>
          <p>Restaurant operations, simplified.</p>
        </div>

        <div className="fx-footer-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <Link href="/login">Login</Link>
          <Link href="/signup">Get Started</Link>
        </div>

        <div className="fx-footer-bottom">
          <span>
            © {new Date().getFullYear()} Fexonic. All rights reserved.
          </span>

          <span>
            Secure · Reliable · Built for Restaurants
          </span>
        </div>
      </footer>
    </main>
  );
}

/* =========================
   SMALL COMPONENTS
========================= */

function MiniFeature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="fx-mini-feature">
      <div className="fx-mini-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function DashboardStat({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="fx-dashboard-stat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>↑ {change}</small>
    </div>
  );
}

function OrderRow({
  id,
  table,
  item,
  status,
  time,
}: {
  id: string;
  table: string;
  item: string;
  status: "Cooking" | "Ready" | "Served";
  time: string;
}) {
  return (
    <div className="fx-order-row">
      <span>{id}</span>
      <span>{table}</span>
      <span>{item}</span>

      <span className={`status ${status.toLowerCase()}`}>
        {status}
      </span>

      <span>{time}</span>
    </div>
  );
}

function PhoneFood({
  emoji,
  name,
  price,
}: {
  emoji: string;
  name: string;
  price: string;
}) {
  return (
    <div className="fx-phone-food">
      <div className="fx-phone-food-image">{emoji}</div>

      <div className="fx-phone-food-info">
        <strong>{name}</strong>
        <span>{price}</span>
      </div>

      <div className="fx-phone-add">+</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="fx-feature-card">
      <div className="fx-feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="fx-step-card">
      <div className="fx-step-number">{number}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}