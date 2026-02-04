import { useState } from "react";

export default function Login({ onLogin, empresa }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!onLogin) return;
    if (!String(login || "").trim()) {
      setError("Informe o usuário.");
      return;
    }
    if (!String(senha || "").trim()) {
      setError("Informe a senha.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await onLogin(login, senha);
      if (res?.ok === false) setError(res.message || "Falha ao entrar.");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-300">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-3">
        {empresa?.logo && (
          <img src={empresa.logo} alt="Logo" className="h-50 w-72 object-contain mx-auto -mb-1" />
        )}
        <h1 className="text-2xl font-bold text-white text-center">Entrar</h1>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-indigo-100">Usuário</label>
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              type="text"
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 placeholder:text-gray-400"
              placeholder="Digite seu usuário"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-indigo-100">Senha</label>
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 placeholder:text-gray-400"
              placeholder="Digite sua senha"
              required
            />
          </div>
          {error && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>
          )}
          <button
            disabled={submitting}
            className={
              "bg-white text-indigo-800 px-4 py-2 rounded hover:bg-indigo-50 mt-2 font-semibold " +
              (submitting ? "opacity-70 cursor-not-allowed" : "")
            }
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div className="text-xs text-indigo-100/90">
          <div>Usuários de teste:</div>
          <div><span className="font-semibold text-white">carlos</span> / 123456 (Administrador)</div>
          <div><span className="font-semibold text-white">ana</span> / 123456 (Funcionário)</div>
        </div>
      </div>
    </div>
  );
}
