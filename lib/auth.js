import { cookies } from "next/headers";

export function getAccessToken() {
  const c = cookies();
  return c.get("d_access")?.value || null;
}