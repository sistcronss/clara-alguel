import { useEffect, useMemo, useState } from "react";

const USE_API = String(import.meta.env.VITE_USE_API ?? "0") === "1";
const API_BASE = String(import.meta.env.VITE_API_BASE ?? "/api");

async function apiRequest(path, { method = "GET", body } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body == null ? undefined : { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new Error(data?.error || `Erro HTTP ${res.status}`);
  if (data && data.ok === false) throw new Error(data.error || "Erro na API");
  return data;
}

export function useEmpresa() {
  const [empresa, setEmpresa] = useState(() => {
    if (USE_API) return null;
    const saved = localStorage.getItem("empresa");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (!USE_API) return;
    let alive = true;
    (async () => {
      try {
        const data = await apiRequest("/empresa/get.php", { method: "GET" });
        if (!alive) return;
        setEmpresa(data?.item ?? null);
      } catch (e) {
        // não autenticado -> login
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveEmpresa = useMemo(() => {
    return (data) => {
      if (!USE_API) {
        setEmpresa(data);
        localStorage.setItem("empresa", JSON.stringify(data));
        return;
      }
      setEmpresa(data);
      (async () => {
        try {
          const res = await apiRequest("/empresa/save.php", { method: "POST", body: data || {} });
          setEmpresa(res?.item ?? data);
        } catch (e) {
          alert(e?.message || "Erro ao salvar empresa");
        }
      })();
    };
  }, []);

  return { empresa, saveEmpresa };
}
