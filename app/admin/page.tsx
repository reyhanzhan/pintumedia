"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { SECRET_FIELD_GROUPS, type SecretField } from "@/lib/secret-fields";
import { DEFAULT_PLANS, formatIDR, type Plan } from "@/lib/plans";
import type { Drama } from "@/lib/catalog";
import { platforms } from "@/lib/platforms";

type PaymentProvider = "" | "midtrans" | "xendit" | "linkqu" | "linkqu_qris";
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
  const [recommendedDramas, setRecommendedDramas] = useState<Drama[]>([]);
  const [recPlatform, setRecPlatform] = useState(platforms[0]?.slug ?? "nunomix");
  const [recQuery, setRecQuery] = useState("");
  const [recResults, setRecResults] = useState<Drama[]>([]);
  const [recSearching, setRecSearching] = useState(false);
  const [recError, setRecError] = useState("");
  const [users, setUsers] = useState<{ id: string; email: string; name: string; createdAt: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [usersError, setUsersError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((response) => (response.ok ? (response.json() as Promise<{ users: typeof users }>) : Promise.reject()))
      .then((data) => setUsers(data.users))
      .catch(() => undefined)
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => {
        if (response.status === 401) {
          router.replace("/admin/login");
          throw new Error("unauthorized");
        }
        return response.json() as Promise<{ plans: Plan[]; freeEmails: string[]; paymentProvider: PaymentProvider; secrets: Secrets; recommendedDramas: Drama[] }>;
      })
      .then((data) => {
        setPlans(data.plans);
        setFreeEmails(data.freeEmails);
        setPaymentProvider(data.paymentProvider);
        setSecrets(data.secrets);
        setRecommendedDramas(data.recommendedDramas ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchRecommendCatalog = async () => {
    setRecSearching(true);
    setRecError("");
    try {
      const response = await fetch(`/api/catalog?platform=${encodeURIComponent(recPlatform)}&language=in&page=1`);
      const data = (await response.json()) as { dramas?: Drama[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Katalog tidak tersedia.");
      const query = recQuery.trim().toLowerCase();
      const dramas = data.dramas ?? [];
      setRecResults(query ? dramas.filter((item) => item.title.toLowerCase().includes(query)) : dramas);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Katalog tidak tersedia.");
      setRecResults([]);
    } finally {
      setRecSearching(false);
    }
  };

  const addRecommended = (drama: Drama) => {
    setRecommendedDramas((current) => {
      if (current.some((item) => String(item.id) === String(drama.id))) return current;
      if (current.length >= 30) { setRecError("Maksimal 30 drama rekomendasi."); return current; }
      return [...current, drama];
    });
  };

  const removeRecommended = (index: number) => setRecommendedDramas((current) => current.filter((_, i) => i !== index));

  const moveRecommended = (index: number, direction: -1 | 1) => {
    setRecommendedDramas((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const [manualEmail, setManualEmail] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualDramaId, setManualDramaId] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const manualPlan = plans.find((item) => item.id === manualPlanId);

  const submitManualActivation = async () => {
    setManualError("");
    setManualSuccess("");
    const email = manualEmail.trim().toLowerCase();
    if (!email) { setManualError("Email wajib diisi."); return; }
    if (!manualPlan) { setManualError("Pilih paket dulu."); return; }
    if (manualPlan.scope === "drama" && !manualDramaId.trim()) { setManualError("ID drama wajib diisi untuk paket ini."); return; }
    setManualSaving(true);
    try {
      const response = await fetch("/api/admin/manual-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, planId: manualPlan.id, dramaId: manualPlan.scope === "drama" ? manualDramaId.trim() : undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal mengaktifkan akses.");
      setManualSuccess(`Akses untuk ${email} berhasil diaktifkan.`);
      setManualEmail("");
      setManualDramaId("");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Gagal mengaktifkan akses.");
    } finally {
      setManualSaving(false);
    }
  };

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

  const deleteUser = async (id: string, label: string) => {
    if (!window.confirm(`Hapus akun "${label}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingUserId(id);
    setUsersError("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal menghapus pengguna.");
      setUsers((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "Gagal menghapus pengguna.");
    } finally {
      setDeletingUserId("");
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans, freeEmails, paymentProvider, secrets, recommendedDramas }),
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
        <h2 style={styles.h2}>Pengguna Terdaftar ({users.length})</h2>
        {usersLoading && <p style={{ color: "#8e9bb0", fontSize: 13 }}>Memuat...</p>}
        {usersError && <p style={{ color: "#ff8a8a", fontSize: 13 }}>{usersError}</p>}
        {!usersLoading && !users.length && <p style={{ color: "#8e9bb0", fontSize: 13 }}>Belum ada pengguna terdaftar.</p>}
        {!usersLoading && !!users.length && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {users.map((row) => (
              <li key={row.id} style={styles.emailRow}>
                <span>
                  <strong>{row.name || "(tanpa nama)"}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: "#8e9bb0" }}>{row.email}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#8e9bb0", whiteSpace: "nowrap" }}>
                    {new Date(row.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteUser(row.id, row.name || row.email)}
                    disabled={deletingUserId === row.id}
                    style={styles.removeButton}
                  >
                    {deletingUserId === row.id ? "..." : "Hapus"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  disabled={plan.durationDays === null}
                  value={plan.durationDays ?? ""}
                  placeholder="jumlah hari"
                  onChange={(event) => updatePlan(index, { durationDays: Math.max(1, Number(event.target.value) || 1) })}
                  style={{ ...styles.input, flex: 1 }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, whiteSpace: "nowrap" }}>
                  <input
                    type="checkbox"
                    checked={plan.durationDays === null}
                    onChange={(event) => updatePlan(index, { durationDays: event.target.checked ? null : 30 })}
                  />
                  Selamanya
                </label>
              </div>
            </label>
          </div>
        ))}
        <button type="button" onClick={() => setPlans((current) => [...current, newBlankPlan()])} style={styles.addButton}>
          + Tambah Paket
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Rekomendasi Homepage (maks 30)</h2>
        <p style={{ margin: 0, color: "#8e9bb0", fontSize: 13 }}>Pilih drama tertentu untuk ditampilkan di bagian &quot;Rekomendasi&quot; halaman utama. Kalau kosong, situs otomatis memakai drama teratas dari katalog.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={recPlatform} onChange={(event) => setRecPlatform(event.target.value)} style={{ ...styles.input, flex: "0 0 180px" }}>
            {platforms.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <input
            value={recQuery}
            onChange={(event) => setRecQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchRecommendCatalog(); } }}
            placeholder="Cari judul drama..."
            style={{ ...styles.input, flex: 1, minWidth: 160 }}
          />
          <button type="button" onClick={() => void searchRecommendCatalog()} disabled={recSearching} style={styles.addButton}>
            {recSearching ? "Mencari..." : "Cari"}
          </button>
        </div>
        {recError && <p style={{ color: "#ff8a8a", margin: 0, fontSize: 13 }}>{recError}</p>}
        {!!recResults.length && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {recResults.map((drama) => {
              const already = recommendedDramas.some((item) => String(item.id) === String(drama.id));
              return (
                <div key={String(drama.id)} style={{ display: "grid", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={drama.poster} alt={drama.title} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 8, background: "#1b2333" }} />
                  <small style={{ fontSize: 12, lineHeight: 1.3 }}>{drama.title}</small>
                  <button type="button" disabled={already} onClick={() => addRecommended(drama)} style={{ ...styles.addButton, height: 32, fontSize: 12, opacity: already ? 0.5 : 1 }}>
                    {already ? "Sudah ditambah" : "+ Tambah"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <h3 style={{ margin: "8px 0 0", fontSize: 14, color: "#8e9bb0" }}>Terpilih ({recommendedDramas.length})</h3>
        {!recommendedDramas.length && <p style={{ color: "#8e9bb0", fontSize: 13, margin: 0 }}>Belum ada drama dipilih.</p>}
        {recommendedDramas.map((drama, index) => (
          <div key={String(drama.id)} style={styles.emailRow}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={drama.poster} alt={drama.title} style={{ width: 32, height: 48, objectFit: "cover", borderRadius: 4, flex: "none" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{drama.title}</span>
            </span>
            <span style={{ display: "flex", gap: 6, flex: "none" }}>
              <button type="button" onClick={() => moveRecommended(index, -1)} disabled={index === 0} style={styles.moveButton} aria-label="Naikkan urutan">↑</button>
              <button type="button" onClick={() => moveRecommended(index, 1)} disabled={index === recommendedDramas.length - 1} style={styles.moveButton} aria-label="Turunkan urutan">↓</button>
              <button type="button" onClick={() => removeRecommended(index)} style={styles.removeButton}>Hapus</button>
            </span>
          </div>
        ))}
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Aktivasi Manual (WhatsApp)</h2>
        <p style={{ margin: 0, color: "#8e9bb0", fontSize: 13 }}>Untuk pelanggan yang bayar manual via WhatsApp (dipakai selagi pembayaran otomatis belum aktif). Ini langsung membuka akses tanpa payment gateway.</p>
        <label style={styles.field}>
          <span>Email pelanggan</span>
          <input value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder="email@contoh.com" style={styles.input} />
        </label>
        <label style={styles.field}>
          <span>Paket</span>
          <select value={manualPlanId} onChange={(event) => setManualPlanId(event.target.value)} style={styles.input}>
            <option value="">Pilih paket</option>
            {plans.map((item) => <option key={item.id} value={item.id}>{item.label} — {formatIDR(item.amount)}</option>)}
          </select>
        </label>
        {manualPlan?.scope === "drama" && (
          <label style={styles.field}>
            <span>ID Drama (mis. nuno:dramabite:12345)</span>
            <input value={manualDramaId} onChange={(event) => setManualDramaId(event.target.value)} placeholder="ID drama" style={styles.input} />
          </label>
        )}
        {manualError && <p style={{ color: "#ff8a8a", margin: 0, fontSize: 13 }}>{manualError}</p>}
        {manualSuccess && <p style={{ color: "#7be08a", margin: 0, fontSize: 13 }}>{manualSuccess}</p>}
        <button type="button" onClick={() => void submitManualActivation()} disabled={manualSaving} style={styles.addButton}>
          {manualSaving ? "Mengaktifkan..." : "Aktifkan Akses"}
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
          <option value="linkqu">LinkQu (Virtual Account)</option>
          <option value="linkqu_qris">LinkQu (QRIS)</option>
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
