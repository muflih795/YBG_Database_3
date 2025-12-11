import { getSupabaseClient } from "./supabaseClient";
import { toPublicUrl, joinPath } from "./storage.js";
const supabase = getSupabaseClient();
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("category")
    .select("id, nama, slug, icon_path, is_active, sort")
    .eq("is_active", true)
    .order("sort", { ascending: true })
    .order("nama", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((c) => ({
    id: c.id,
    name: c.nama,
    slug: c.slug,
    iconSrc: toPublicUrl("Public", `category/${c.icon_path}`) || "/category/default-category.svg",
  }));
}
