"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Password salah.");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f1729", color: "#f2f6fb", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <form
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
        style={{ width: "min(360px, 90vw)", display: "grid", gap: 14, padding: 32, border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, background: "#132036" }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Admin PintuMedia</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password admin"
          style={{ height: 46, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.03)", color: "white" }}
        />
        {error && <p style={{ margin: 0, color: "#ff8a8a", fontSize: 13 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ height: 46, border: 0, borderRadius: 10, background: "linear-gradient(90deg,#c99a2e,#e3b23c)", color: "#111", fontWeight: 800, cursor: "pointer" }}
        >
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
