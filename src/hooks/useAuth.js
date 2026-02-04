import { useEffect, useMemo, useState } from "react";
import { useCrudStorage } from "./useCrudStorage";

const SESSION_KEY = "auth_session";

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

const SEED_USERS = [
  {
    id: "seed-f-2",
    nome: "Carlos Souza",
    cpf: "555.666.777-88",
    cargo: "Gerente",
    perfil: "Administrador",
    login: "carlos",
    senha: "123456",
    foto: null,
  },
  {
    id: "seed-f-1",
    nome: "Ana Lima",
    cpf: "111.222.333-44",
    cargo: "Atendente",
    perfil: "Funcionario",
    login: "ana",
    senha: "123456",
    foto: null,
  },
];

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

export function useAuth() {
  const usersCrud = useCrudStorage("funcionarios", { initialItems: SEED_USERS });

  // API mode: sessão via cookie + /api/auth/me.php
  const [apiUser, setApiUser] = useState(null);
  const [loading, setLoading] = useState(USE_API);

  // Local mode: sessão em localStorage
  const [session, setSession] = useState(() => {
    if (USE_API) return null;
    const raw = localStorage.getItem(SESSION_KEY);
    return safeParse(raw, null);
  });

  useEffect(() => {
    if (USE_API) return;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    if (!USE_API) return;
    let alive = true;
    (async () => {
      try {
        const data = await apiRequest("/auth/me.php", { method: "GET" });
        if (!alive) return;
        setApiUser(data?.user ?? null);
      } catch {
        if (!alive) return;
        setApiUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const user = useMemo(() => {
    if (USE_API) return apiUser;
    if (!session?.userId) return null;
    return usersCrud.items.find((u) => u.id === session.userId) ?? null;
  }, [apiUser, session, usersCrud.items]);

  const api = useMemo(() => {
    return {
      isAuthenticated: !!user,
      user,
      loading,
      users: usersCrud.items,

      login(login, senha) {
        if (!USE_API) {
          const username = String(login ?? "").trim().toLowerCase();
          const password = String(senha ?? "");

          const found = usersCrud.items.find(
            (u) => String(u.login ?? "").trim().toLowerCase() === username && String(u.senha ?? "") === password
          );

          if (!found) return { ok: false, message: "Usuário ou senha inválidos." };

          setSession({
            userId: found.id,
            at: new Date().toISOString(),
          });

          return { ok: true };
        }

        return (async () => {
          try {
            const data = await apiRequest("/auth/login.php", { method: "POST", body: { login, senha } });
            setApiUser(data?.user ?? null);
            return { ok: true };
          } catch (e) {
            return { ok: false, message: e?.message || "Falha no login" };
          }
        })();
      },

      logout() {
        if (!USE_API) {
          setSession(null);
          return;
        }
        (async () => {
          try {
            await apiRequest("/auth/logout.php", { method: "POST", body: {} });
          } catch {
            // best-effort logout
          } finally {
            setApiUser(null);
          }
        })();
      },

      updateProfile(patch) {
        if (!user) return { ok: false, message: "Sessão não encontrada." };
        // Tela de perfil é read-only hoje; manter compatibilidade.
        usersCrud.update(user.id, patch);
        if (USE_API) setApiUser((u) => (u ? { ...u, ...patch } : u));
        return { ok: true };
      },

      changePassword(currentPassword, newPassword) {
        if (!user) return { ok: false, message: "Sessão não encontrada." };
        if (!USE_API) {
          if (String(user.senha ?? "") !== String(currentPassword ?? "")) {
            return { ok: false, message: "Senha atual incorreta." };
          }
          const np = String(newPassword ?? "");
          if (np.length < 4) {
            return { ok: false, message: "A nova senha deve ter pelo menos 4 caracteres." };
          }
          usersCrud.update(user.id, { senha: np });
          return { ok: true };
        }

        return (async () => {
          try {
            await apiRequest("/auth/change-password.php", {
              method: "POST",
              body: { currentPassword, newPassword },
            });
            return { ok: true };
          } catch (e) {
            return { ok: false, message: e?.message || "Erro ao trocar senha" };
          }
        })();
      },
    };
  }, [user, usersCrud, loading]);

  return api;
}
