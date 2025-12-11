import { NextResponse } from "next/server";
import { DB } from "../../_lib/store";

export async function POST() {
  DB.rewards = [
    { id: "r1", title: "Mini City Wallet", cost: 2, image: "/product/product1.jpg", stock: 5 },
    { id: "r2", title: "Voucher Diskon Rp600.000", cost: 1, image: "/product/product2.jpg", stock: 10 },
  ];
  DB.users = new Map();
  return NextResponse.json({ ok: true });
}
