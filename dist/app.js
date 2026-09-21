const episodeData = {
  1: ["Kereta Terakhir", "24:18"],
  2: ["Nama di Tiket Lama", "22:06"],
  3: ["Hujan yang Sama", "26:41"],
  4: ["Pesan Tak Terkirim", "23:35"],
  5: ["Di Balik Pintu Kaca", "27:12"],
  6: ["Jadwal yang Berubah", "25:08"],
  7: ["Satu Kursi Kosong", "24:50"],
  8: ["Kota Setelah Tengah Malam", "28:16"],
  9: ["Janji di Peron Tiga", "26:29"],
  10: ["Pulang Bersama", "31:02"],
};

const searchItems = [
  ["Jarak di Ujung Peron", "Romansa · 10 episode"],
  ["Kontrak Hati", "Drama · 12 episode"],
  ["Pulang Sebelum Pagi", "Romansa · 8 episode"],
  ["Rahasia Lantai 17", "Misteri · 10 episode"],
  ["Bukan Cinta Sementara", "Romansa · 14 episode"],
];

const state = { episode: 1, unlocked: false, selectedPlan: "monthly" };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("visible"), 2600);
};

const openDialog = (dialog) => {
  if (!dialog.open) dialog.showModal();
};

const openPaywall = () => openDialog($("#paywallDialog"));

const selectEpisode = (episode, options = {}) => {
  const number = Number(episode);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw new Error("Episode harus berupa angka 1 sampai 10.");
  }
  if (number > 5 && !state.unlocked) {
    openPaywall();
    return { episode: number, locked: true };
  }

  state.episode = number;
  $$(".episode").forEach((button) => button.classList.toggle("active", Number(button.dataset.episode) === number));
  $("#playerKicker").textContent = `Episode ${number}`;
  $("#playerTitle").textContent = episodeData[number][0];
  $("#playerTime").textContent = `00:00 / ${episodeData[number][1]}`;
  $("#timelineFill").style.width = "0%";
  if (options.scroll !== false) $("#episodes").scrollIntoView({ behavior: "smooth", block: "start" });
  toast(`Episode ${number} siap diputar`);
  return { episode: number, locked: false, title: episodeData[number][0] };
};

$$('[data-play-episode]').forEach((button) => {
  button.addEventListener("click", () => selectEpisode(button.dataset.playEpisode));
});

$$(".episode").forEach((button) => {
  button.addEventListener("click", () => selectEpisode(button.dataset.episode, { scroll: false }));
});

$("#bigPlay").addEventListener("click", () => {
  const fill = $("#timelineFill");
  fill.style.width = fill.style.width === "36%" ? "0%" : "36%";
  toast(fill.style.width === "36%" ? `Memutar episode ${state.episode} (demo)` : "Pemutaran dijeda");
});

$("#watchTrailer").addEventListener("click", () => {
  $("#timelineFill").style.width = "18%";
  $("#episodes").scrollIntoView({ behavior: "smooth", block: "start" });
  toast("Trailer demonstrasi siap — tambahkan video Anda nanti");
});

$("#openPlans").addEventListener("click", openPaywall);
$("#paymentButton").addEventListener("click", () => {
  const label = { series: "Buka serial ini", monthly: "Paket bulanan", weekly: "Paket 7 hari" }[state.selectedPlan];
  $("#paymentNote").textContent = `${label} dipilih. Sambungkan Midtrans/Xendit untuk menerima pembayaran nyata.`;
  toast("Pilihan paket tersimpan dalam sesi demo");
});

$("#planList").addEventListener("change", (event) => {
  if (!event.target.matches('input[name="plan"]')) return;
  state.selectedPlan = event.target.value;
  $$(".plan-option").forEach((option) => option.classList.toggle("selected", option.contains(event.target)));
});

$("#activateDemo").addEventListener("click", () => {
  state.unlocked = true;
  $$(".episode.locked").forEach((episode) => {
    episode.classList.remove("locked");
    episode.classList.add("unlocked");
    episode.querySelector("i").textContent = "▶";
  });
  $(".access-pill").innerHTML = "<span></span> Semua episode terbuka (demo)";
  $("#paywallDialog").close();
  toast("Akses demo aktif — episode 6–10 terbuka");
});

const referralInput = $("#referralLink");
const copyReferral = async () => {
  try {
    await navigator.clipboard.writeText(referralInput.value);
  } catch {
    referralInput.select();
    document.execCommand("copy");
  }
  toast("Link referral disalin");
  return { copied: true, referralUrl: referralInput.value };
};
$("#copyReferral").addEventListener("click", copyReferral);

const accountDialog = $("#accountDialog");
$("#openAccount").addEventListener("click", () => openDialog(accountDialog));
$("#mobileAccount").addEventListener("click", () => openDialog(accountDialog));
$("#accountForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#emailInput").value;
  $("#openAccount span").textContent = email.split("@")[0];
  accountDialog.close();
  toast("Masuk demo berhasil");
});

const searchDialog = $("#searchDialog");
const renderSearch = (query = "") => {
  const normalized = query.trim().toLowerCase();
  const matches = searchItems.filter(([title, meta]) => `${title} ${meta}`.toLowerCase().includes(normalized));
  $("#searchResults").innerHTML = matches.length
    ? matches.map(([title, meta]) => `<button class="search-result" data-search-title="${title}"><strong>${title}</strong><span>${meta}</span></button>`).join("")
    : '<p class="dialog-lead">Belum ada judul yang cocok.</p>';
};
$("#openSearch").addEventListener("click", () => {
  renderSearch();
  openDialog(searchDialog);
  setTimeout(() => $("#searchInput").focus(), 20);
});
$("#searchInput").addEventListener("input", (event) => renderSearch(event.target.value));
$("#searchResults").addEventListener("click", (event) => {
  const result = event.target.closest("[data-search-title]");
  if (!result) return;
  searchDialog.close();
  $("#episodes").scrollIntoView({ behavior: "smooth" });
  toast(`${result.dataset.searchTitle} dipilih`);
});

$$('[data-close-dialog]').forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
$$('dialog').forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

const navLinks = $$('.desktop-nav a, .mobile-nav a');
const trackedSections = ['top', 'drama', 'affiliate'];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting || !trackedSections.includes(entry.target.id)) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-30% 0px -60%', threshold: 0 });
trackedSections.forEach((id) => observer.observe(document.getElementById(id)));

const registerWebMcpTools = () => {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const controller = new AbortController();
  const register = (tool) => Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {});
  register({
    name: "play_episode",
    title: "Putar episode NunoDrama",
    description: "Pilih episode 1 sampai 10. Episode di atas 5 akan membuka pilihan paket jika akses belum aktif.",
    inputSchema: { type: "object", properties: { episode: { type: "integer", minimum: 1, maximum: 10 } }, required: ["episode"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: ({ episode }) => selectEpisode(episode),
  });
  register({
    name: "open_membership_options",
    title: "Buka pilihan paket",
    description: "Tampilkan pilihan paket untuk membuka episode premium.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: () => { openPaywall(); return { opened: true, selectedPlan: state.selectedPlan }; },
  });
  register({
    name: "copy_affiliate_link",
    title: "Salin link affiliate",
    description: "Salin link referral NunoDrama yang terlihat di dashboard affiliate.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: copyReferral,
  });
};
registerWebMcpTools();
