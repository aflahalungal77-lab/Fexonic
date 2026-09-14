import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

const ADMIN_EMAIL = 'aflahalungal77@gmail.com';

export default async function Admin() {
  const s = await supabaseServer();

  const {
    data: { user },
  } = await s.auth.getUser();

  if (!user) redirect('/login');

  if (user.email !== ADMIN_EMAIL) {
    redirect('/');
  }

  const { data: rs } = await s
    .from('restaurants')
    .select('id,name,slug,is_active,created_at')
    .order('created_at', { ascending: false });

  const { count } = await s
    .from('orders')
    .select('*', {
      count: 'exact',
      head: true,
    });

  const restaurantCount = rs?.length || 0;
  const liveCount =
    rs?.filter((x) => x.is_active).length || 0;

  return (
    <main className="container">
      <header className="top">
        <div>
          <div className="brand">FEXONIC</div>
          <div className="muted smalltext" style={{ marginTop: 3 }}>
            Platform
          </div>
        </div>

        <a className="btn light" href="/api/auth/signout">
          Sign out
        </a>
      </header>

      <section className="dashboard-hero">
        <div className="eyebrow">PLATFORM CONTROL</div>
        <h1>Admin overview</h1>
        <p className="muted">
          Monitor restaurants and platform activity from one workspace.
        </p>
      </section>

      <section className="grid grid3">
        <div className="card stat">
          <span className="muted smalltext">Restaurants</span>
          <strong>{restaurantCount}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">Total orders</span>
          <strong>{count || 0}</strong>
        </div>

        <div className="card stat">
          <span className="muted smalltext">Active</span>
          <strong>{liveCount}</strong>
        </div>
      </section>

      <section className="card dashboard-section">
        <div className="row">
          <div>
            <div className="eyebrow">RESTAURANTS</div>

            <h2 style={{ marginTop: 7, marginBottom: 0 }}>
              All workspaces
            </h2>
          </div>

          <span className="pill">
            {restaurantCount} TOTAL
          </span>
        </div>

        <div className="list" style={{ marginTop: 20 }}>
          {!rs?.length && (
            <div
              className="item"
              style={{
                padding: 35,
                textAlign: 'center',
              }}
            >
              <b>No restaurants yet</b>

              <p className="muted smalltext">
                New restaurant accounts will appear here.
              </p>
            </div>
          )}

          {rs?.map((restaurant) => (
            <div className="item" key={restaurant.id}>
              <div className="row">
                <div>
                  <b>{restaurant.name}</b>

                  <div
                    className="muted smalltext"
                    style={{ marginTop: 5 }}
                  >
                    /k/{restaurant.slug}
                  </div>
                </div>

                <span className="pill">
                  {restaurant.is_active
                    ? 'ACTIVE'
                    : 'EXPIRED / OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        Fexonic Platform Administration
      </footer>
    </main>
  );
}