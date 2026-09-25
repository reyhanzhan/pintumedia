"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { SECRET_FIELD_GROUPS, type SecretField } from "@/lib/secret-fields";
import { DEFAULT_PLANS, type Plan } from "@/lib/plans";

type PaymentProvider = "" | "midtrans" | "xendit" | "linkqu";
type Secrets = Partial<Record<SecretField, string>>;

function newBlankPlan(): Plan {
  return {
    id: `plan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    label: "Paket baru",
    meta: "",
    amount: 0,
    scope: "global",
    durationDays: 30,
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
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
        return response.json() as Promise<{ plans: Plan[]; freeEmails: string[]; paymentProvider: PaymentProvider; secrets: Secrets }>;
      })
      .then((data) => {
        setPlans(data.plans);
        setFreeEmails(data.freeEmails);
        setPaymentProvider(data.paymentProvider);
        setSecrets(data.secrets);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePlan = (index: number, patch: Partial<Plan>) => {
    setPlans((current) => current.map((plan, i) => (i === index ? { ...plan, ...patch } : plan)));
  };

  const removePlan = (index: number) => setPlans((current) => current.filter((_, i) => i !== index));

  const movePlan = (index: number, direction: -1 | 1) => {
    setPlans((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

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
        body: JSON.stringify({ plans, freeEmails, paymentProvider, secrets }),
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
        <h2 style={styles.h2}>Paket Harga</h2>
        {plans.map((plan, index) => (
          <div key={plan.id} style={styles.planCard}>
            <div style={styles.planHeadRow}>
              <strong style={{ fontSize: 13, color: "#8e9bb0" }}>Paket {index + 1}</strong>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => movePlan(index, -1)} disabled={index === 0} style={styles.moveButton} aria-label="Naikkan urutan">↑</button>
                <button type="button" onClick={() => movePlan(index, 1)} disabled={index === plans.length - 1} style={styles.moveButton} aria-label="Turunkan urutan">↓</button>
                <button type="button" onClick={() => removePlan(index)} style={styles.removeButton}>Hapus</button>
              </div>
            </div>
            <label style={styles.field}>
              <span>Nama paket</span>
              <input value={plan.label} onChange={(event) => updatePlan(index, { label: event.target.value })} style={styles.input} />
            </label>
            <label style={styles.field}>
              <span>Keterangan singkat</span>
              <input value={plan.meta} onChange={(event) => updatePlan(index, { meta: event.target.value })} style={styles.input} placeholder="mis. Semua drama" />
            </label>
            <label style={styles.field}>
              <span>Harga (Rp)</span>
              <input
                type="number"
                min={0}
                value={plan.amount}
                onChange={(event) => updatePlan(index, { amount: Number(event.target.value) || 0 })}
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              <span>Buka apa</span>
              <select
                value={plan.scope}
                onChange={(event) => updatePlan(index, { scope: event.target.value as Plan["scope"] })}
                style={styles.input}
              >
                <option value="drama">Drama yang sedang dibuka pengguna saja</option>
                <option value="global">Semua drama</option>
              </select>
            </label>
            <label style={styles.field}>
              <span>Masa aktif</span>
              <select
                value={plan.durationDays ?? "lifetime"}
                onChange={(event) => updatePlan(index, { durationDays: event.target.value === "lifetime" ? null : Number(event.target.value) })}
                style={styles.input}
              >
                <option value="lifetime">Selamanya</option>
                <option value="7">7 hari</option>
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
                <option value="365">365 hari</option>
              </select>
            </label>
          </div>
        ))}
        <button type="button" onClick={() => setPlans((current) => [...current, newBlankPlan()])} style={styles.addButton}>
          + Tambah Paket
        </button>
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
  addButton: { padding: "0 16px", height: 42, border: 0, borderRadius: 8, background: "#e3b23c", color: "#111", fontWeight: 700, cursor: "pointer" },
  removeButton: { padding: "4px 10px", border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, background: "transparent", color: "#ff8a8a", cursor: "pointer", fontSize: 12 },
  moveButton: { width: 30, height: 30, border: "1px solid rgba(255,255,255,.15)", borderRadius: 6, background: "transparent", color: "#f2f6fb", cursor: "pointer" },
  emailRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, background: "rgba(255,255,255,.03)" },
  planCard: { display: "grid", gap: 10, padding: 14, border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, background: "rgba(255,255,255,.02)" },
  planHeadRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  save: { width: "100%", height: 50, border: 0, borderRadius: 12, background: "linear-gradient(90deg,#c99a2e,#e3b23c)", color: "#111", fontWeight: 800, fontSize: 16, cursor: "pointer" },
};
