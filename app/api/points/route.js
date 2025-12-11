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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ points: 0 }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("point_balances")
    .select("balance")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    console.error("[/api/points] fetch error:", error);
    return NextResponse.json({ points: 0 }, { status: 200 });
  }

  return NextResponse.json({ points: Number(data?.balance ?? 0) });
}
