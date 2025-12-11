// lib/repos.js
import { getSupabaseClient } from "@/lib/supabaseClient";
const supabase = getSupabaseClient();
import { toPublicUrl } from "@/lib/storage";

export async function fetchBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("id,nama,slug,logo_url,is_active")
    .eq("is_active", true)
    .order("nama", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((b) => {
    const rawPath = (b?.logo_url ?? "").toString().trim();
    return {
      id: b.id,
      name: b.nama,
      slug: b.slug,
      logoSrc: toPublicUrl("Public", rawPath) || null,
    };
  });
}
