import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const g = globalThis;


export const supabaseBrowser =
  g.__supabaseBrowser ??
  createClient(url, anon, {
    auth: {
      persistSession: true,
      storageKey: "ybg-auth",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (process.env.NODE_ENV !== "production") {
  g.__supabaseBrowser = supabaseBrowser;
}
