import { useEffect, useMemo, useRef, useState } from "react";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

const USE_API = String(import.meta.env.VITE_USE_API ?? "0") === "1";
const API_BASE = String(import.meta.env.VITE_API_BASE ?? "/api");

async function apiRequest(path, { method = "GET", body, isFormData = false } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (data && data.ok === false) {
    throw new Error(data.error || "Erro na API");
  }
  return data;
}

export function useCrudStorage(storageKey, { initialItems = [] } = {}) {
  const [items, setItems] = useState(() => {
    if (USE_API) return [];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialItems;
    const parsed = safeParse(raw, initialItems);
    return Array.isArray(parsed) ? parsed : initialItems;
  });

  const serialized = useMemo(() => JSON.stringify(items), [items]);
  const serializedRef = useRef(serialized);

  useEffect(() => {
    serializedRef.current = serialized;
  }, [serialized]);

  useEffect(() => {
    if (!USE_API) {
      localStorage.setItem(storageKey, serialized);
    }

    // Mantém múltiplos hooks (mesma chave) sincronizados no MESMO tab.
    // (O evento nativo "storage" não dispara no mesmo documento.)
    window.dispatchEvent(
      new CustomEvent(`crud-storage:${storageKey}`, {
        detail: { storageKey, serialized },
      })
    );
  }, [serialized, storageKey]);

  useEffect(() => {
    const applySerialized = (nextSerialized) => {
      if (!nextSerialized) return;
      if (nextSerialized === serializedRef.current) return;
      const parsed = safeParse(nextSerialized, null);
      if (!Array.isArray(parsed)) return;
      setItems(parsed);
    };

    const onStorage = (e) => {
      if (USE_API) return;
      if (e.key !== storageKey) return;
      if (typeof e.newValue !== "string") return;
      applySerialized(e.newValue);
    };

    const onCustom = (e) => {
      applySerialized(e?.detail?.serialized);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(`crud-storage:${storageKey}`, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(`crud-storage:${storageKey}`, onCustom);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!USE_API) return;
    let alive = true;
    (async () => {
      try {
        const data = await apiRequest(`/${storageKey}/list.php`, { method: "GET" });
        const next = Array.isArray(data?.items) ? data.items : [];
        if (alive) setItems(next);
      } catch (e) {
        // Em API mode, a tela de login pode ainda não estar autenticada.
        // Evita quebrar o app; a página de Login fará o fluxo.
        if (String(e?.message || "").toLowerCase().includes("não autenticado")) return;
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storageKey]);

  const api = useMemo(() => {
    return {
      items,
      setItems,
      create(data) {
        if (!USE_API) {
          const item = { id: newId(), createdAt: new Date().toISOString(), ...data };
          setItems((prev) => [item, ...prev]);
          return item;
        }
        const item = { id: data?.id || newId(), ...data };
        (async () => {
          try {
            const res = await apiRequest(`/${storageKey}/create.php`, { method: "POST", body: item });
            const created = res?.item || item;
            setItems((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
          } catch (e) {
            alert(e?.message || "Erro ao criar");
          }
        })();
        return item;
      },
      update(id, patch) {
        if (!USE_API) {
          setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)));
          return;
        }
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
        const current = items.find((i) => i.id === id);
        const payload = { ...(current || {}), ...patch, id };
        (async () => {
          try {
            const res = await apiRequest(`/${storageKey}/update.php`, { method: "POST", body: payload });
            const updated = res?.item || payload;
            setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
          } catch (e) {
            alert(e?.message || "Erro ao atualizar");
            // Recarrega do servidor para desfazer otimismo
            try {
              const data = await apiRequest(`/${storageKey}/list.php`, { method: "GET" });
              setItems(Array.isArray(data?.items) ? data.items : []);
            } catch {
              // ignore: manter estado atual se falhar ao recarregar
            }
          }
        })();
      },
      remove(id) {
        if (!USE_API) {
          setItems((prev) => prev.filter((i) => i.id !== id));
          return;
        }
        const prevItems = items;
        setItems((prev) => prev.filter((i) => i.id !== id));
        (async () => {
          try {
            await apiRequest(`/${storageKey}/delete.php`, { method: "POST", body: { id } });
          } catch (e) {
            alert(e?.message || "Erro ao excluir");
            setItems(prevItems);
          }
        })();
      },
      getById(id) {
        return items.find((i) => i.id === id) ?? null;
      },
    };
  }, [items, storageKey]);

  return api;
}
