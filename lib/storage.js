import { getSupabaseClient } from "@/lib/supabaseClient";
const supabase = getSupabaseClient();


function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .map((p) => String(p).trim().replace(/^\/+|\/+$/g, ""))
    .join("/");
}

function encodePath(p) {
  return p
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function publicUrl(bucket, path) {
  if (!path) return null;

  const clean = String(path)
    .trim()
    .replace(/[\r\n\t]+/g, "") 
    .replace(/^\/+/, "");

  const encoded = encodePath(clean);

  const { data, error } = supabase.storage.from(bucket).getPublicUrl(encoded);
  if (error) {
    console.warn("⚠️ Supabase publicUrl error:", error.message);
    return null;
  }

  return data?.publicUrl || null;
}

export function toPublicUrl(bucket, value) {
  if (!value) return null;

  const s = String(value).trim();


  if (/^https?:\/\//i.test(s)) return s;


  const clean = s.replace(/[\r\n\t]+/g, "").replace(/^\/+/, "");

  return publicUrl(bucket, clean);
}
