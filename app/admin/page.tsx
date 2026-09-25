"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { SECRET_FIELD_GROUPS, type SecretField } from "@/lib/secret-fields";

type PlanPrices = { series: number; monthly: number; weekly: number };
type PaymentProvider = "" | "midtrans" | "xendit" | "linkqu";
type Secrets = Partial<Record<SecretField, string>>;

const PLAN_LABELS: Record<keyof PlanPrices, string> = {
  series: "Buka drama ini",
  monthly: "Paket bulanan",
  weekly: "Paket 7 hari",
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [planPrices, setPlanPrices] = useState<PlanPrices>({ series: 25_000, monthly: 39_000, weekly: 19_000 });
  const [freeEmails, setFreeEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("");
  const [secrets, setSecrets] = useState<Secrets>({});

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => {
        if (response.status === 401) {
          router.replace("/admin/login");
          throw new Error("unauthorized");
        }
        return response.json() as Promise<{ planPrices: PlanPrices; freeEmails: string[]; paymentProvider: PaymentProvider; secrets: Secrets }>;
      })
      .then((data) => {
        setPlanPrices(data.planPrices);
        setFreeEmails(data.freeEmails);
        setPaymentProvider(data.paymentProvider);
        setSecrets(data.secrets);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFreeEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (freeEmails.includes(email)) { setNewEmail(""); return; }
    if (freeEmails.length >= 10) { setError("Maksimal 10 email gratis."); return; }
    setFreeEmails((current) => [...current, email]);
    setNewEmail("");
  };

  const removeFreeEmail = (email: string) => setFreeEmails((current) => current.filter((item) => item !== email));

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planPrices, freeEmails, paymentProvider, secrets }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan.");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (loading) return <main style={styles.page}><p style={{ color: "#8e9bb0" }}>Memuat...</p></main>;

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Admin PintuMedia</h1>
        <button onClick={() => void logout()} style={styles.logout}>Keluar</button>
      </div>

      <section style={styles.card}>
        <h2 style={styles.h2}>Harga Paket</h2>
        {(Object.keys(planPrices) as (keyof PlanPrices)[]).map((key) => (
          <label key={key} style={styles.field}>
            <span>{PLAN_LABELS[key]}</span>
            <input
              type="number"
              min={0}
              value={planPrices[key]}
              onChange={(event) => setPlanPrices((current) => ({ ...current, [key]: Number(event.target.value) || 0 }))}
              style={styles.input}
            />
          </label>
        ))}
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Email Nonton Gratis (maks 10)</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFreeEmail(); } }}
            placeholder="email@contoh.com"
            style={{ ...styles.input, flex: 1 }}
          />
          <button onClick={addFreeEmail} style={styles.addButton} type="button">Tambah</button>
        </div>
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {freeEmails.map((email) => (
            <li key={email} style={styles.emailRow}>
              <span>{email}</span>
              <button onClick={() => removeFreeEmail(email)} style={styles.removeButton} type="button">Hapus</button>
            </li>
          ))}
          {!freeEmails.length && <li style={{ color: "#8e9bb0", fontSize: 13 }}>Belum ada email.</li>}
        </ul>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Metode Pembayaran Aktif</h2>
        <select value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value as PaymentProvider)} style={styles.input}>
          <option value="">Belum dipilih</option>
          <option value="linkqu">LinkQu</option>
          <option value="midtrans">Midtrans</option>
          <option value="xendit">Xendit</option>
        </select>
      </section>

      {SECRET_FIELD_GROUPS.map((group) => (
        <section key={group.provider} style={styles.card}>
          <h2 style={styles.h2}>{group.label}</h2>
          {group.fields.map((field) => (
            <label key={field.key} style={styles.field}>
              <span>{field.label}</span>
              <input
                type={field.type ?? "text"}
                value={secrets[field.key] ?? ""}
                onChange={(event) => setSecrets((current) => ({ ...current, [field.key]: event.target.value }))}
                style={styles.input}
              />
            </label>
          ))}
        </section>
      ))}

      {error && <p style={{ color: "#ff8a8a" }}>{error}</p>}
      {saved && <p style={{ color: "#7be08a" }}>Tersimpan.</p>}
      <button onClick={() => void save()} disabled={saving} style={styles.save} type="button">
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: "100vh", padding: "32px 16px 80px", maxWidth: 640, margin: "0 auto", background: "#0f1729", color: "#f2f6fb", fontFamily: "Arial, Helvetica, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  logout: { height: 38, padding: "0 16px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, background: "transparent", color: "#f2f6fb", cursor: "pointer" },
  card: { display: "grid", gap: 12, marginBottom: 20, padding: 20, border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, background: "#132036" },
  h2: { margin: 0, fontSize: 16, color: "#e3b23c" },
  field: { display: "grid", gap: 6, fontSize: 13, color: "#8e9bb0" },
  input: { height: 42, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.03)", color: "white", fontSize: 14 },
  addButton: { padding: "0 16px", border: 0, borderRadius: 8, background: "#e3b23c", color: "#111", fontWeight: 700, cursor: "pointer" },
  removeButton: { padding: "4px 10px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, background: "transparent", color: "#ff8a8a", cursor: "pointer", fontSize: 12 },
  emailRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, background: "rgba(255,255,255,.03)" },
  save: { width: "100%", height: 50, border: 0, borderRadius: 12, background: "linear-gradient(90deg,#c99a2e,#e3b23c)", color: "#111", fontWeight: 800, fontSize: 16, cursor: "pointer" },
};
