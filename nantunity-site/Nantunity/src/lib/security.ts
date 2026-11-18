/** Outils de sécurité des routes serveur : jetons signés, limitation de débit, validation, réponses JSON. */
import { createHmac, timingSafeEqual } from "node:crypto";

/* ---------- Jetons de gestion des rendez-vous (HMAC-SHA256) ---------- */
export function signToken(id: string, secret: string) {
  const mac = createHmac("sha256", secret).update(`booking:${id}`).digest("base64url");
  return `${Buffer.from(id).toString("base64url")}.${mac}`;
}

export function verifyToken(token: unknown, secret: string): string | null {
  if (typeof token !== "string" || token.length > 600 || !token.includes(".")) return null;
  const [rawId, mac] = token.split(".");
  let id: string;
  try { id = Buffer.from(rawId, "base64url").toString("utf8"); } catch { return null; }
  if (!/^[a-zA-Z0-9_-]{4,200}$/.test(id)) return null;
  const expected = createHmac("sha256", secret).update(`booking:${id}`).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

/* ---------- Limitation de débit (mémoire, par instance) ---------- */
const hits: Map<string, number[]> = ((globalThis as any).__nuRate ??= new Map());
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

/* ---------- Validation ---------- */
export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export function str(v: unknown, max: number, required = false): string | null {
  if (v === undefined || v === null || v === "") return required ? null : "";
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (required && !s) return null;
  return s.length > max ? null : s;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* ---------- Réponses ---------- */
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

/** Refuse les requêtes provenant d'un autre site (protection CSRF basique) */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function readJson(request: Request, maxBytes = 20_000): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("content-type") || "").includes("application/json")) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try { const v = JSON.parse(text); return v && typeof v === "object" ? v : null; } catch { return null; }
}
