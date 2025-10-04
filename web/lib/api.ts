export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function getHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Failed to fetch /api/health");
  return res.json();
}
