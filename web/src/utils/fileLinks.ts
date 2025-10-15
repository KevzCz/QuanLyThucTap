// Builds a correct absolute URL for stored fileUrl values
// Works whether fileUrl is absolute ("http://api/uploads/x.pdf")
// or legacy relative ("/uploads/x.pdf" or "uploads/x.pdf")

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");
// convert ".../api" => origin without "/api"
export const ORIGIN_BASE = API_BASE.replace(/\/api\/?$/, "/");

export const resolveFileHref = (fileUrl: string) => {
  try {
    // new URL(relative, base) handles both absolute and relative inputs
    return new URL(fileUrl, ORIGIN_BASE).toString();
  } catch {
    // last resort: join manually
    const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    return `${ORIGIN_BASE.replace(/\/+$/, "")}${path}`;
  }
};

// Optional: build a "download" link that sets Content-Disposition on server
// If you added /download/:filename endpoint, use this:
export const buildDownloadHref = (fileUrl: string) => {
  try {
    const url = new URL(resolveFileHref(fileUrl));
    const filename = url.pathname.split("/").pop() || "";
    return `${ORIGIN_BASE}download/${filename}`;
  } catch {
    const filename = fileUrl.split("/").pop() || "";
    return `${ORIGIN_BASE}download/${filename}`;
  }
};
