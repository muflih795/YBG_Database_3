// app/api/points/earn/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Buat server-side supabase client yang membaca cookie session.
 */
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

export async function POST(req) {
  try {
    const supabase = createSupabaseRouteClient();

    // Ambil user dari session (harus login)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 }
      );
    }
    const userId = userData.user.id;

    // Ambil payload
    const body = await req.json().catch(() => ({}));
    const amountRaw = body.amount ?? body.delta ?? 1;
    const description = body.description ?? body.reason ?? "Earned points";

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount harus angka > 0" },
        { status: 400 }
      );
    }

    // --- Insert ke user_points ---
    const insertPayload = {
      user_id: userId,
      delta: amount,
      reason: description,
    };

    const { data: insertedRows, error: insertErr } = await supabase
      .from("user_points")
      .insert(insertPayload)
      .select()
      .limit(1)
      .single();

    if (insertErr) {
      console.error("[earn] insert user_points error:", insertErr);
      return NextResponse.json(
        { error: "Gagal menambahkan poin" },
        { status: 500 }
      );
    }

    // --- Update atau insert point_balances ---
    // Ambil balance saat ini
    const { data: pbData, error: pbErr } = await supabase
      .from("point_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (pbErr) {
      console.error("[earn] read point_balances error:", pbErr);
    }

    const currentBalance = Number(pbData?.balance ?? 0);
    const newBalance = currentBalance + amount;

    // Upsert (jika ada update, jika tidak insert)
    const { error: upsertErr } = await supabase
      .from("point_balances")
      .upsert({ user_id: userId, balance: newBalance }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[earn] upsert point_balances error:", upsertErr);
      return NextResponse.json(
        { error: "Gagal memperbarui saldo poin" },
        { status: 500 }
      );
    }

    const formatted = {
      ok: true,
      points: newBalance,
      record: {
        id: insertedRows.id,
        delta: insertedRows.delta,
        amount: Math.abs(Number(insertedRows.delta ?? amount)),
        type: Number(insertedRows.delta ?? amount) >= 0 ? "credit" : "debit",
        description: insertedRows.reason ?? null,
        created_at: insertedRows.created_at,
        expires_at: insertedRows.expires_at ?? null,
      },
    };

    return NextResponse.json(formatted, { status: 200 });
  } catch (err) {
    console.error("[api/points/earn] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
