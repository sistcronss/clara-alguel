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

export function useAuth() {
  const usersCrud = useCrudStorage("funcionarios", { initialItems: SEED_USERS });

  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    return safeParse(raw, null);
  });

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  const user = useMemo(() => {
    if (!session?.userId) return null;
    return usersCrud.items.find((u) => u.id === session.userId) ?? null;
  }, [session, usersCrud.items]);

  const api = useMemo(() => {
    return {
      isAuthenticated: !!user,
      user,
      users: usersCrud.items,

      login(login, senha) {
        const username = String(login ?? "").trim().toLowerCase();
        const password = String(senha ?? "");

        const found = usersCrud.items.find((u) => String(u.login ?? "").trim().toLowerCase() === username && String(u.senha ?? "") === password);

        if (!found) return { ok: false, message: "Usuário ou senha inválidos." };

        setSession({
          userId: found.id,
          at: new Date().toISOString(),
        });

        return { ok: true };
      },

      logout() {
        setSession(null);
      },

      updateProfile(patch) {
        if (!user) return { ok: false, message: "Sessão não encontrada." };
        usersCrud.update(user.id, patch);
        return { ok: true };
      },

      changePassword(currentPassword, newPassword) {
        if (!user) return { ok: false, message: "Sessão não encontrada." };
        if (String(user.senha ?? "") !== String(currentPassword ?? "")) {
          return { ok: false, message: "Senha atual incorreta." };
        }
        const np = String(newPassword ?? "");
        if (np.length < 4) {
          return { ok: false, message: "A nova senha deve ter pelo menos 4 caracteres." };
        }
        usersCrud.update(user.id, { senha: np });
        return { ok: true };
      },
    };
  }, [user, usersCrud]);

  return api;
}
