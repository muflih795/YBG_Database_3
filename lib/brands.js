import { getSupabaseClient } from "@/lib/supabaseClient";
const supabase = getSupabaseClient();
import { toPublicUrl } from "@/lib/storage";

export async function fetchBrands() {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("sort", { ascending: true })
    .order("nama", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((b) => {
    const raw =
      (b.logo_path ??
        b.logo_url ??
        b.logo ??
        b.image_path ??
        b.image_url ??
        "") + "";

    const path = raw.trim();
    const isFullUrl = /^https?:\/\//i.test(path);

    const logoSrc = path
      ? isFullUrl
        ? path
        : toPublicUrl("Public", path) 
      : "/brand-placeholder.svg";     

    return {
      id: b.id,
      name: b.nama || b.name || "",
      slug: b.slug || "",
      logoSrc,
    };
  });
}
