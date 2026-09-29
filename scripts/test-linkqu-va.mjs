#!/usr/bin/env node
// Standalone smoke test for LinkQu VA creation, bypassing Next.js/Supabase so
// it can run with just the LINKQU_* credentials from the admin panel, without
// touching the live database or making a real customer-facing checkout.
//
// Usage:
//   1. Copy your LINKQU_* values from /admin into a local .env.local (same
//      keys as .env.example) — never paste them into chat.
//   2. node --env-file=.env.local scripts/test-linkqu-va.mjs
//
// A successful run prints the VA number + bank code LinkQu actually assigned;
// that confirms VA creation works independently of the QRIS/GoPay outage.

import { createHmac } from "node:crypto";

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — set it in .env.local first.`);
  return value;
}

function linkquSignature(path, method, rest, serverKey) {
  const secondValue = rest.join("").toLowerCase().replace(/[^a-z0-9]/g, "");
  const buildKey = `${path}${method}${secondValue}`;
  return createHmac("sha256", serverKey).update(buildKey).digest("hex");
}

async function main() {
  const baseUrl = need("LINKQU_BASE_URL");
  const path = need("LINKQU_VA_PATH");
  const clientId = need("LINKQU_CLIENT_ID");
  const username = need("LINKQU_USERNAME");
  const pin = need("LINKQU_PIN");
  const serverKey = need("LINKQU_SERVER_KEY");
  const signatureKey = need("LINKQU_SIGNATURE_KEY");
  const bankCode = need("LINKQU_VA_BANK_CODE");

  const orderId = `test-${Date.now()}`;
  const amount = 1000; // smallest sensible test amount, in IDR
  const email = "test@pintumedia.local";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expired = expiresAt.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const customerName = "PintuMediaTest";
  const signaturePath = path.replace(/^\/?linkqu-partner/, "");
  const sigParts = [amount, expired, bankCode, orderId, orderId, customerName, email, clientId];
  const signature = linkquSignature(signaturePath, "POST", sigParts, signatureKey);

  console.log(`POST ${baseUrl}${path}`);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "client-id": clientId,
      "client-secret": serverKey,
    },
    body: JSON.stringify({
      amount,
      partner_reff: orderId,
      customer_id: orderId,
      customer_name: customerName,
      expired,
      username,
      pin,
      customer_phone: "",
      customer_email: email,
      bank_code: bankCode,
      signature,
    }),
  });

  const raw = await response.text();
  console.log(`HTTP ${response.status}`);
  console.log(raw);

  if (!response.ok) {
    console.error("\n❌ LinkQu rejected the VA creation request — see raw response above.");
    process.exit(1);
  }
  console.log("\n✅ Request accepted by LinkQu — check the response above for the VA number / bank code.");
}

main().catch((error) => {
  console.error("\n❌", error.message);
  process.exit(1);
});
