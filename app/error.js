"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Hindari console.error di production jika tak diperlukan
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html>
      <body style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Oops, ada yang salah</h1>
          <p style={{ opacity: 0.8, marginBottom: 16 }}>
            Maaf, terjadi kesalahan. Silakan coba lagi. Jika berlanjut, hubungi admin.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #ddd",
              cursor: "pointer"
            }}
          >
            Coba lagi
          </button>

          {process.env.NODE_ENV !== "production" && (
            <pre
              style={{
                marginTop: 16,
                textAlign: "left",
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 8,
                overflowX: "auto",
                maxHeight: 240
              }}
            >
{String(error?.stack || error?.message || error)}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
