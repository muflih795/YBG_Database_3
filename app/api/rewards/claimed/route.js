// app/api/rewards/claimed/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userSupabase() {
  const jar = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (n) => jar.get(n)?.value,
        set: (n, v, o) => { try { jar.set({ name: n, value: v, ...o }); } catch {} },
        remove: (n, o) => { try { jar.set({ name: n, value: "", ...o }); } catch {} },
      },
    }
  );
}

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(req) {
  try {
    const sb = userSupabase();
    const admin = adminSupabase();

    let uid = req.headers.get("x-user-id") || null;
    if (!uid) {
      const { data: auth } = await sb.auth.getUser();
      uid = auth?.user?.id ?? null;
    }
    if (!uid) return NextResponse.json([], { status: 200 });

    let list = [];
    let tryJoin = true;

    if (tryJoin) {
      const { data: rows, error: jErr } = await admin
        .from("reward_claims")
        .select(`
          id,
          reward_id,
          voucher_code,
          created_at,
          sent_to_sa,
          sent_to_sa_at,
          rewards!inner (
            id,
            title,
            image_url
          )
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (!jErr && Array.isArray(rows)) {
        list = rows.map((r) => ({
          id: r.id,
          reward_id: r.reward_id,
          voucher_code: r.voucher_code ?? null,
          created_at: r.created_at,
          sent_to_sa: !!r.sent_to_sa,
          sent_to_sa_at: r.sent_to_sa_at ?? null,
          reward_title: r.rewards?.title ?? null,
          reward_image_url: r.rewards?.image_url ?? null,
        }));
        return NextResponse.json(list, { status: 200 });
      }

     
      if (jErr) {
        console.warn("claimed join select error, fallback to 2-query:", jErr);
      }
    }

    
    const { data: claims, error: cErr } = await admin
      .from("reward_claims")
      .select("id, reward_id, voucher_code, created_at, sent_to_sa, sent_to_sa_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (cErr || !claims?.length) {
      if (cErr) console.error("select reward_claims:", cErr);
      return NextResponse.json([], { status: 200 });
    }

    const rewardIds = [...new Set(claims.map((c) => c.reward_id))];
    let rewardsById = {};
    if (rewardIds.length) {
      const { data: rewards, error: rErr } = await admin
        .from("rewards")
        .select("id, title, image_url")
        .in("id", rewardIds);

      if (rErr) {
        console.warn("select rewards:", rErr);
      } else {
        rewardsById = Object.fromEntries((rewards || []).map((r) => [r.id, r]));
      }
    }

    list = claims.map((c) => {
      const rw = rewardsById[c.reward_id] || {};
      return {
        id: c.id,
        reward_id: c.reward_id,
        voucher_code: c.voucher_code ?? null,
        created_at: c.created_at,
        sent_to_sa: !!c.sent_to_sa,
        sent_to_sa_at: c.sent_to_sa_at ?? null,
        reward_title: rw.title ?? null,
        reward_image_url: rw.image_url ?? null,
      };
    });

    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("GET /api/rewards/claimed failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
