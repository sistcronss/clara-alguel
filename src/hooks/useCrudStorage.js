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

export function useCrudStorage(storageKey, { initialItems = [] } = {}) {
  const [items, setItems] = useState(() => {
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
    localStorage.setItem(storageKey, serialized);

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

  const api = useMemo(() => {
    return {
      items,
      setItems,
      create(data) {
        const item = { id: newId(), createdAt: new Date().toISOString(), ...data };
        setItems((prev) => [item, ...prev]);
        return item;
      },
      update(id, patch) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)));
      },
      remove(id) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      },
      getById(id) {
        return items.find((i) => i.id === id) ?? null;
      },
    };
  }, [items]);

  return api;
}
