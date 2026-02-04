import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";
import { useAuth } from "../hooks/useAuth";
import { maskCep, maskCpfCnpj, maskPhoneBR } from "../utils/masks";

function onlyDigits(v) {
  return String(v ?? "").replace(/\D+/g, "");
}

function isValidCpfCnpjLike(v) {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
}

function isValidCepLike(v) {
  const d = onlyDigits(v);
  return d.length === 8;
}

function isValidPhoneLike(v) {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
}

const EMPTY = {
  nome: "",
  cpf: "",
  nascimento: "",
  telefone: "",
  endereco: "",
  cep: "",
};

export default function Clientes() {
  const auth = useAuth();
  const isAdmin = auth.user?.perfil === "Administrador";

  const crud = useCrudStorage("clientes", {
    initialItems: [
      {
        id: "seed-1",
        nome: "João Silva",
        cpf: "123.456.789-00",
        nascimento: "1990-01-15",
        telefone: "(11) 99999-0000",
        endereco: "Rua A, 123 - Centro",
        cep: "01000-000",
      },
      {
        id: "seed-2",
        nome: "Maria Souza",
        cpf: "987.654.321-00",
        nascimento: "1995-07-21",
        telefone: "(11) 98888-1111",
        endereco: "Av. B, 456 - Bairro",
        cep: "02000-000",
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
    return crud.items.filter((c) =>
      [c.nome, c.cpf, c.telefone, c.cep].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
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
      nascimento: item.nascimento || "",
      telefone: item.telefone || "",
      endereco: item.endereco || "",
      cep: item.cep || "",
    });
    setOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    let next = value;
    if (name === "cpf") next = maskCpfCnpj(value);
    if (name === "telefone") next = maskPhoneBR(value);
    if (name === "cep") next = maskCep(value);
    setForm((f) => ({ ...f, [name]: next }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      nome: String(form.nome ?? "").trim(),
      cpf: String(form.cpf ?? "").trim(),
      nascimento: String(form.nascimento ?? "").trim(),
      telefone: String(form.telefone ?? "").trim(),
      endereco: String(form.endereco ?? "").trim(),
      cep: String(form.cep ?? "").trim(),
    };

    if (!payload.nome) {
      alert("Informe o nome do cliente.");
      return;
    }
    if (!payload.cpf) {
      alert("Informe o CPF/CNPJ.");
      return;
    }
    if (!isValidCpfCnpjLike(payload.cpf)) {
      alert("CPF/CNPJ inválido. Informe 11 (CPF) ou 14 (CNPJ) dígitos.");
      return;
    }
    const cpfDigits = onlyDigits(payload.cpf);
    const cpfExists = crud.items.some((c) => {
      if (editingId && c.id === editingId) return false;
      return onlyDigits(c.cpf) === cpfDigits;
    });
    if (cpfExists) {
      alert("Já existe um cliente cadastrado com este CPF/CNPJ.");
      return;
    }

    if (payload.nascimento) {
      const todayIso = new Date().toISOString().slice(0, 10);
      if (payload.nascimento > todayIso) {
        alert("Data de nascimento inválida.");
        return;
      }
    }

    if (payload.cep && !isValidCepLike(payload.cep)) {
      alert("CEP inválido. Informe 8 dígitos.");
      return;
    }
    if (payload.telefone && !isValidPhoneLike(payload.telefone)) {
      alert("Telefone inválido. Informe DDD + número.");
      return;
    }

    if (editingId) crud.update(editingId, payload);
    else crud.create(payload);
    setOpen(false);
  }

  function handleRemove(id) {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir clientes.");
      return;
    }
    const ok = confirm("Excluir este cliente?");
    if (!ok) return;
    crud.remove(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Clientes</h1>
          <p className="text-gray-500 text-sm">Cadastro e histórico do cliente</p>
        </div>
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar clientes por nome, CPF/CNPJ, telefone..."
            className="border rounded-lg px-3 py-2 w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button onClick={startCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full md:w-auto">
            + Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="text-sm text-gray-500 mb-4">{filtered.length} registro(s)</div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Nome</th>
                <th className="px-3 py-2 text-left font-semibold">CPF/CNPJ</th>
                <th className="px-3 py-2 text-left font-semibold">Nascimento</th>
                <th className="px-3 py-2 text-left font-semibold">Telefone</th>
                <th className="px-3 py-2 text-left font-semibold">CEP</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{c.nome}</td>
                  <td className="px-3 py-2">{c.cpf}</td>
                  <td className="px-3 py-2">{c.nascimento}</td>
                  <td className="px-3 py-2">{c.telefone}</td>
                  <td className="px-3 py-2">{c.cep}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button className="text-indigo-700 hover:underline" onClick={() => startEdit(c)}>Editar</button>
                      {isAdmin && (
                        <button className="text-red-700 hover:underline" onClick={() => handleRemove(c.id)}>
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">Nenhum cliente encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((c) => (
            <div key={c.id} className="border rounded-xl p-3">
              <div className="font-semibold text-gray-800">{c.nome}</div>
              <div className="text-sm text-gray-600">CPF/CNPJ: {c.cpf}</div>
              <div className="text-sm text-gray-600">Tel: {c.telefone}</div>
              <div className="text-sm text-gray-600">CEP: {c.cep}</div>
              <div className="flex gap-4 mt-2">
                <button className="text-indigo-700 font-medium" onClick={() => startEdit(c)}>Editar</button>
                {isAdmin && (
                  <button className="text-red-700 font-medium" onClick={() => handleRemove(c.id)}>
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum cliente encontrado</div>}
        </div>
      </div>

      <Modal
        open={open}
        title={editingId ? "Editar Cliente" : "Novo Cliente"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => document.getElementById("cliente-form")?.requestSubmit()}>Salvar</button>
          </div>
        }
      >
        <form id="cliente-form" className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input name="nome" value={form.nome} onChange={handleChange} required className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF/CNPJ</label>
            <input
              name="cpf"
              value={form.cpf}
              onChange={handleChange}
              required
              inputMode="numeric"
              pattern="[0-9.\-\/ ]{11,25}"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de nascimento</label>
            <input name="nascimento" value={form.nascimento} onChange={handleChange} type="date" className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              inputMode="tel"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CEP</label>
            <input
              name="cep"
              value={form.cep}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9\- ]{8,10}"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="00000-000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Rua, número, bairro" />
          </div>
          <button className="hidden" type="submit">Salvar</button>
        </form>
      </Modal>
    </div>
  );
}