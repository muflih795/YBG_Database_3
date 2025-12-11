import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

// client anon yang baca session dari cookie
function createSupabaseRouteClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

// generator voucher simpel di server
function generateVoucherCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export async function POST(req) {
  try {
    const supabase = createSupabaseRouteClient();
    const admin = createSupabaseAdminClient();

    // 1) ambil user dari session
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: "Tidak terautentikasi" },
        { status: 401 }
      );
    }
    const userId = userData.user.id;

    // 2) ambil rewardId dari body
    const body = await req.json().catch(() => ({}));
    const rewardId = body.rewardId;
    if (!rewardId) {
      return NextResponse.json(
        { ok: false, error: "rewardId wajib diisi" },
        { status: 400 }
      );
    }

    // 3) ambil data reward (pakai admin client)
    const { data: reward, error: rewardErr } = await admin
      .from("rewards")
      .select("id, title, description, image_url, cost, stock, active")
      .eq("id", rewardId)
      .maybeSingle();

    if (rewardErr || !reward) {
      return NextResponse.json(
        { ok: false, error: "Reward tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!reward.active) {
      return NextResponse.json(
        { ok: false, error: "Reward sudah tidak aktif" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(reward.cost) || reward.cost <= 0) {
      return NextResponse.json(
        { ok: false, error: "Konfigurasi reward tidak valid" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(reward.stock) || reward.stock <= 0) {
      return NextResponse.json(
        { ok: false, error: "Stok reward habis" },
        { status: 400 }
      );
    }

    const cost = Number(reward.cost);

    // 4) cek saldo poin user dari point_balances
    const { data: balanceRow, error: balanceErr } = await admin
      .from("point_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (balanceErr) {
      console.error("[claim] read point_balances error:", balanceErr);
      return NextResponse.json(
        { ok: false, error: "Gagal membaca saldo poin" },
        { status: 500 }
      );
    }

    const currentBalance = Number(balanceRow?.balance ?? 0);
    if (currentBalance < cost) {
      return NextResponse.json(
        { ok: false, error: "Poin kamu belum cukup" },
        { status: 400 }
      );
    }

    const voucherCode = generateVoucherCode();

    // 5) insert ke reward_claims
    const { error: claimErr } = await admin.from("reward_claims").insert({
      user_id: userId,
      reward_id: reward.id,
      title: reward.title,
      image_url: reward.image_url,
      voucher_code: voucherCode,
      status: "requested",
      guest_id: null,
      notes: null,
    });

    if (claimErr) {
      console.error("[claim] insert reward_claims error:", claimErr);
      return NextResponse.json(
        { ok: false, error: "Gagal menyimpan klaim reward" },
        { status: 500 }
      );
    }

    // 6) catat pengurangan di user_points
    const { error: upErr } = await admin.from("user_points").insert({
      user_id: userId,
      delta: -cost,
      reason: `Redeem reward: ${reward.title}`,
    });

    if (upErr) {
      console.error("[claim] insert user_points error:", upErr);
      // kita tetap lanjut, tapi log error
    }

    // 7) update point_balances
    const newBalance = currentBalance - cost;

    const { error: pbErr } = await admin
      .from("point_balances")
      .upsert(
        { user_id: userId, balance: newBalance },
        { onConflict: "user_id" }
      );

    if (pbErr) {
      console.error("[claim] upsert point_balances error:", pbErr);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Klaim berhasil",
        voucher_code: voucherCode,
        remaining_points: newBalance,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[api/rewards/claim] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
