// app/api/rewards/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function sb() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => store.get(name)?.value,
        set: (name, value, options) => store.set({ name, value, ...options }),
        remove: (name, options) => store.set({ name, value: "", ...options }),
      },
    }
  );
}

export async function GET() {
  const supabase = sb();
  const { data, error } = await supabase
    .from("rewards")
    .select("id, title, description, image_url, cost, stock, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/api/rewards] error:", error);
 
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data ?? [], { status: 200 });
}
