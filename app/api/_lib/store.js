// app/api/_lib/store.js
export const runtime = "nodejs";

import { cookies } from "next/headers";
import crypto from "node:crypto";

const g = globalThis;
if (!g.__YBG_DB__) {
  g.__YBG_DB__ = {
    rewards: [
      { id: "r1", title: "Mini City Wallet", cost: 2, image_url: "/product/product1.jpg", stock: 5 },
      { id: "r2", title: "Voucher Diskon Rp600.000", cost: 1, image_url: "/product/product2.jpg", stock: 10 },
    ],

    users: new Map(),
  };
}
export const DB = g.__YBG_DB__;

// ====== KONST & UTIL ======
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Tx = { id, type: 'credit'|'debit', amount, description, created_at, expires_at? }

export function getOrCreateUser() {
  const jar = cookies();

  const secure = process.env.NODE_ENV === "production";

  let uid = jar.get("uid")?.value;
  if (!uid) {
    uid = crypto.randomUUID();
    jar.set("uid", uid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,                
      maxAge: 60 * 60 * 24 * 365, // 1 tahun
    });
  }

  if (!DB.users.has(uid)) {
    DB.users.set(uid, {
      transactions: [
        // contoh poin awal 10, expired 1 tahun
        {
          id: crypto.randomUUID(),
          type: "credit",
          amount: 10,
          description: "Poin awal",
          created_at: Date.now(),
          expires_at: Date.now() + ONE_YEAR_MS,
        },
      ],
      claimed: [],
    });
  }

  return { uid, user: DB.users.get(uid) };
}

// Hitung saldo efektif: jumlah credit belum expired - total debit
export function getEffectivePoints(user, now = Date.now()) {
  const totalCredits = user.transactions
    .filter((t) => t.type === "credit" && Number(t.expires_at ?? now + 1) > now)
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const totalDebits = user.transactions
    .filter((t) => t.type === "debit")
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  return Math.max(0, totalCredits - totalDebits);
}

// Tambah credit (earn) – expired 1 tahun
export function addCredit(user, amount, description = "Earn") {
  user.transactions.push({
    id: crypto.randomUUID(),
    type: "credit",
    amount: Number(amount) || 0,
    description,
    created_at: Date.now(),
    expires_at: Date.now() + ONE_YEAR_MS,
  });
}

// Tambah debit (spend) – saat klaim/redeem
export function addDebit(user, amount, description = "Claim") {
  user.transactions.push({
    id: crypto.randomUUID(),
    type: "debit",
    amount: Number(amount) || 0,
    description,
    created_at: Date.now(),
  });
}

// Utility claim record (voucher)
function genVoucher(prefix = "YBG") {
  const part = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${part}`;
}

export function createClaimRecord(reward) {
  return {
    claim_id: crypto.randomUUID(),
    reward_id: reward.id,
    title: reward.title,
    image_url: reward.image_url, // selaras dengan komponen
    voucher_code: genVoucher(),
    status: "claimed",
    created_at: Date.now(),
  };
}
