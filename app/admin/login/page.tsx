"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

const ADMIN_EMAIL = "aflahalungal77@gmail.com";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setError("This account is not a platform admin.");
        setLoading(false);
        return;
      }

      const { error } =
        await supabaseBrowser().auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="top">
        <b className="brand">FEXONIC</b>

        <a className="btn light" href="/">
          Back
        </a>
      </header>

      <div
        style={{
          maxWidth: 440,
          margin: "70px auto",
        }}
        className="card"
      >
        <div className="eyebrow">
          PLATFORM CONTROL
        </div>

        <h1
          style={{
            marginTop: 8,
          }}
        >
          Admin login
        </h1>

        <p className="muted">
          Sign in with your Fexonic platform administrator
          account.
        </p>

        <form
          onSubmit={submit}
          style={{
            marginTop: 25,
          }}
        >
          <div className="field">
            <label className="label">
              Admin email
            </label>

            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="admin@example.com"
            />
          </div>

          <div className="field">
            <label className="label">
              Password
            </label>

            <input
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              style={{
                padding: 12,
                marginBottom: 14,
                borderRadius: 10,
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Admin login"}
          </button>
        </form>

        <p
          className="muted"
          style={{
            marginTop: 18,
            fontSize: 13,
          }}
        >
          Platform administrator access only.
        </p>
      </div>
    </main>
  );
}