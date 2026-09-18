"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminRestaurantList({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const router = useRouter();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteRestaurant(restaurant: Restaurant) {
    const confirmed = window.confirm(
      `Delete "${restaurant.name}"?\n\n` +
        "This will permanently delete:\n" +
        "• Restaurant\n" +
        "• Menu categories\n" +
        "• Menu items\n" +
        "• Tables\n" +
        "• Orders\n" +
        "• Order items\n" +
        "• Payments\n" +
        "• Subscriptions\n" +
        "• Restaurant members\n\n" +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(restaurant.id);

    try {
      const response = await fetch(
        `/api/admin/restaurants/${restaurant.id}`,
        {
          method: "DELETE",
        }
      );

      // Read as text first so HTML responses don't cause:
      // "Unexpected token '<', '<!DOCTYPE'..."
      const text = await response.text();

      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}). ` +
            "Please make sure the latest deployment is active."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to delete restaurant"
        );
      }

      alert("Restaurant deleted successfully.");

      router.refresh();
    } catch (error: any) {
      alert(
        error?.message ||
          "Something went wrong while deleting the restaurant."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="list">
      {restaurants.length === 0 ? (
        <div
          className="muted"
          style={{
            padding: "24px 0",
            textAlign: "center",
          }}
        >
          No restaurants found.
        </div>
      ) : (
        restaurants.map((restaurant) => {
          const deleting = deletingId === restaurant.id;

          return (
            <div className="item" key={restaurant.id}>
              <div className="row">
                <div>
                  <b>{restaurant.name}</b>

                  <div className="muted">
                    /k/{restaurant.slug}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span className="pill">
                    {restaurant.is_active
                      ? "ACTIVE"
                      : "EXPIRED/OFF"}
                  </span>

                  <a
                    className="btn light"
                    href={`/admin/restaurants/${restaurant.id}`}
                  >
                    View
                  </a>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      deleteRestaurant(restaurant)
                    }
                    disabled={deleting}
                    style={{
                      background: "#000",
                      color: "#fff",
                      border: "1px solid #333",
                      cursor: deleting
                        ? "not-allowed"
                        : "pointer",
                      opacity: deleting ? 0.6 : 1,
                    }}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}