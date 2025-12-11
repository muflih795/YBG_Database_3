// app/api/rewards/claimed/send/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supa() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(n) { return store.get(n)?.value; },
        set(n, v, o) { try { store.set({ name:n, value:v, ...o }); } catch {} },
        remove(n, o) { try { store.set({ name:n, value:"", ...o }); } catch {} },
      },
    }
  );
}

export async function POST(req) {
  try {
    const sb = supa();
    const { data: auth } = await sb.auth.getUser();
    const uid = auth?.user?.id;
    const body = await req.json().catch(() => ({}));
    const claimId = body?.claim_id;

    if (!uid) return NextResponse.json({ ok:false, error:"Unauthorized" }, { status: 401 });
    if (!claimId) return NextResponse.json({ ok:false, error:"claim_id wajib" }, { status: 400 });

    const { error } = await sb
      .from("reward_claims")
      .update({ sent_to_sa: true, sent_to_sa_at: new Date().toISOString() })
      .eq("id", claimId)
      .eq("user_id", uid);

    if (error) {
      console.error("mark sent error:", error);
      return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error("POST /api/rewards/claimed/send failed:", e);
    return NextResponse.json({ ok:false, error:"Internal error" }, { status: 500 });
  }
}

