import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

export async function GET() {
  const supabase = createSupabaseRouteClient();

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      
      return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await supabase
      .from("user_points")
      .select("id, delta, reason, created_at, expires_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/points/history] fetch error:", error);
      return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const formatted = (data ?? []).map((row) => {
      const rawDelta = Number(row.delta ?? 0);
      const amount = Math.abs(rawDelta);
      const type = rawDelta >= 0 ? "credit" : "debit";
      const status =
        row.expires_at && new Date(row.expires_at) < new Date() ? "expired" : "active";

      return {
        id: row.id,
        delta: rawDelta, 
        amount, 
        type,
        description: row.reason ?? null,
        created_at: row.created_at,
        expires_at: row.expires_at,
        status,
      };
    });

    return NextResponse.json(formatted, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[/api/points/history] unexpected error:", err);
    return NextResponse.json([], { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
