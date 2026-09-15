import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import AdminRestaurantList from "./AdminRestaurentList";

const ADMIN_EMAIL = "YOUR_ADMIN_EMAIL@gmail.com";

export default async function Admin() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const { data: restaurants } = await supabase
    .from("restaurants")
    .select(
      "id,name,slug,is_active,created_at"
    )
    .order("created_at", {
      ascending: false,
    });

  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", {
      count: "exact",
      head: true,
    });

  const restaurantList = restaurants || [];

  const activeRestaurants = restaurantList.filter(
    (restaurant) => restaurant.is_active
  ).length;

  return (
    <main className="container">
      <header className="top">
        <b className="brand">FEXONIC ADMIN</b>

        <a
          className="btn light"
          href="/api/auth/signout"
        >
          Sign out
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">
          PLATFORM CONTROL
        </div>

        <h1>Restaurants</h1>

        <p className="muted">
          Manage Fexonic restaurants from one place.
        </p>
      </section>

      <section className="grid grid3">
        <div className="card stat">
          <span className="muted">
            Restaurants
          </span>

          <strong>
            {restaurantList.length}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted">
            Orders
          </span>

          <strong>
            {orderCount || 0}
          </strong>
        </div>

        <div className="card stat">
          <span className="muted">
            Live
          </span>

          <strong>
            {activeRestaurants}
          </strong>
        </div>
      </section>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <div className="list">
          <AdminRestaurantList
            restaurants={restaurantList}
          />
        </div>
      </section>
    </main>
  );
}