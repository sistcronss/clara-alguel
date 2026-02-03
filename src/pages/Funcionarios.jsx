import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";
import { maskCpf } from "../utils/masks";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

async function downscaleImage(dataUrl, { maxSize = 320, quality = 0.85 } = {}) {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = dataUrl;
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Imagem inválida"));
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return dataUrl;

    const scale = Math.min(1, maxSize / Math.max(w, h));
    if (scale >= 1) return dataUrl;

    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, cw, ch);

    // JPEG costuma ficar bem menor que PNG em fotos.
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function onlyDigits(v) {
  return String(v ?? "").replace(/\D+/g, "");
}

function isValidCpfLike(v) {
  if (!v) return true;
  return onlyDigits(v).length === 11;
}

const EMPTY = {
  nome: "",
  cpf: "",
  cargo: "",
  perfil: "Funcionario",
  login: "",
  senha: "",
  foto: null,
};

export default function Funcionarios() {
  const crud = useCrudStorage("funcionarios", {
    initialItems: [
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
    ],
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return crud.items;
    return crud.items.filter((u) =>
      [u.nome, u.cpf, u.cargo, u.perfil, u.login].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [crud.items, query]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      nome: item.nome || "",
      cpf: item.cpf || "",
      cargo: item.cargo || "",
      perfil: item.perfil || "Funcionario",
      login: item.login || "",
      senha: item.senha || "",
      foto: item.foto || null,
    });
    setOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const next = name === "cpf" ? maskCpf(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      nome: String(form.nome ?? "").trim(),
      cpf: String(form.cpf ?? "").trim(),
      cargo: String(form.cargo ?? "").trim(),
      perfil: String(form.perfil ?? "Funcionario").trim() || "Funcionario",
      login: String(form.login ?? "").trim(),
      senha: String(form.senha ?? "").trim(),
      foto: form.foto || null,
    };

    if (!payload.nome) {
      alert("Informe o nome.");
      return;
    }
    if (!payload.login) {
      alert("Informe o login.");
      return;
    }
    if (!payload.senha) {
      alert("Informe a senha.");
      return;
    }
    if (payload.senha.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const loginLower = payload.login.toLowerCase();
    const loginExists = crud.items.some((u) => {
      if (editingId && u.id === editingId) return false;
      return String(u.login || "").trim().toLowerCase() === loginLower;
    });
    if (loginExists) {
      alert("Já existe um usuário com este login.");
      return;
    }

    if (!isValidCpfLike(payload.cpf)) {
      alert("CPF inválido. Informe 11 dígitos.");
      return;
    }
    if (payload.cpf) {
      const cpfDigits = onlyDigits(payload.cpf);
      const cpfExists = crud.items.some((u) => {
        if (editingId && u.id === editingId) return false;
        const other = onlyDigits(u.cpf);
        return other && other === cpfDigits;
      });
      if (cpfExists) {
        alert("Já existe um usuário com este CPF.");
        return;
      }
    }

    if (editingId) crud.update(editingId, payload);
    else crud.create(payload);
    setOpen(false);
  }

  function handleRemove(id) {
    const ok = confirm("Excluir este funcionário/usuário?");
    if (!ok) return;
    crud.remove(id);
  }

  async function handleFotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }
    const raw = await fileToDataUrl(file);
    const reduced = await downscaleImage(raw, { maxSize: 320, quality: 0.85 });
    setForm((f) => ({ ...f, foto: reduced }));
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Funcionários / Usuários</h1>
          <p className="text-gray-500 text-sm">Administrador e Funcionário</p>
        </div>
        <button onClick={startCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full md:w-auto">
          + Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar por nome, login, cargo..."
            className="border rounded-lg px-3 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="text-sm text-gray-500">{filtered.length} registro(s)</div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Nome</th>
                <th className="px-3 py-2 text-left font-semibold">Perfil</th>
                <th className="px-3 py-2 text-left font-semibold">Cargo</th>
                <th className="px-3 py-2 text-left font-semibold">Login</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {u.foto ? (
                        <img src={u.foto} alt="Avatar" className="h-9 w-9 rounded-full object-cover border" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border">
                          {(u.nome || "U").trim().slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="font-medium text-gray-800">{u.nome}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.perfil === "Administrador" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
                      {u.perfil}
                    </span>
                  </td>
                  <td className="px-3 py-2">{u.cargo}</td>
                  <td className="px-3 py-2">{u.login}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button className="text-indigo-700 hover:underline" onClick={() => startEdit(u)}>Editar</button>
                      <button className="text-red-700 hover:underline" onClick={() => handleRemove(u.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">Nenhum usuário encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((u) => (
            <div key={u.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {u.foto ? (
                    <img src={u.foto} alt="Avatar" className="h-9 w-9 rounded-full object-cover border" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold border">
                      {(u.nome || "U").trim().slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="font-semibold text-gray-800 truncate">{u.nome}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.perfil === "Administrador" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
                  {u.perfil}
                </span>
              </div>
              <div className="text-sm text-gray-600">Cargo: {u.cargo}</div>
              <div className="text-sm text-gray-600">Login: {u.login}</div>
              <div className="flex gap-4 mt-2">
                <button className="text-indigo-700 font-medium" onClick={() => startEdit(u)}>Editar</button>
                <button className="text-red-700 font-medium" onClick={() => handleRemove(u.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum usuário encontrado</div>}
        </div>
      </div>

      <Modal
        open={open}
        title={editingId ? "Editar Usuário" : "Novo Usuário"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => document.getElementById("func-form")?.requestSubmit()}>Salvar</button>
          </div>
        }
      >
        <form id="func-form" className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Foto do usuário</label>
            <div className="mt-1 flex items-center gap-4">
              {form.foto ? (
                <img src={form.foto} alt="Foto do usuário" className="h-16 w-16 rounded-full object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl border">
                  {(form.nome || "U").trim().slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="block text-sm text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {form.foto && (
                  <button type="button" className="text-sm text-red-700 hover:underline w-fit" onClick={() => setForm((f) => ({ ...f, foto: null }))}>
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input name="nome" value={form.nome} onChange={handleChange} required className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input
              name="cpf"
              value={form.cpf}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9.\- ]{0,20}"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo</label>
            <input name="cargo" value={form.cargo} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Atendente, Gerente..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Perfil</label>
            <select name="perfil" value={form.perfil} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full">
              <option>Administrador</option>
              <option>Funcionario</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Login</label>
            <input name="login" value={form.login} onChange={handleChange} required minLength={3} className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Senha (teste)</label>
            <input name="senha" value={form.senha} onChange={handleChange} type="password" required minLength={6} className="border rounded-lg px-3 py-2 w-full" />
            <p className="text-xs text-gray-500 mt-1">Para testes no frontend. No backend, a senha será criptografada.</p>
          </div>
          <button className="hidden" type="submit">Salvar</button>
        </form>
      </Modal>
    </div>
  );
}