import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";
import { maskMoneyBR } from "../utils/masks";

const BASE_STATUSES = new Set(["Disponivel", "Manutencao", "Inativa"]);

const EMPTY = {
  codigo: "",
  tipo: "Vestido",
  descricao: "",
  tamanho: "",
  cor: "",
  valorAluguel: "",
  status: "Disponivel",
  observacoes: "",
};

function normalizeBaseStatus(status) {
  const s = String(status || "").trim();
  if (s === "Alugada") return "Disponivel";
  if (BASE_STATUSES.has(s)) return s;
  return "Disponivel";
}

function isContratoReservandoPecas(status) {
  return status === "Ativo";
}

function effectiveStatusFrom(peca, pecasReservadasSet) {
  const base = normalizeBaseStatus(peca?.status);
  if (base === "Manutencao" || base === "Inativa") return base;
  if (pecasReservadasSet?.has?.(peca?.id)) return "Alugada";
  return "Disponivel";
}

function statusBadge(status) {
  const map = {
    Disponivel: "bg-green-100 text-green-700",
    Alugada: "bg-blue-100 text-blue-700",
    Manutencao: "bg-yellow-100 text-yellow-700",
    Inativa: "bg-gray-100 text-gray-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function statusLabel(status) {
  const map = {
    Disponivel: "Disponível",
    Alugada: "Alugada",
    Manutencao: "Em Manutenção",
    Inativa: "Inativa",
  };
  return map[status] || status;
}

export default function Pecas() {
  const contratos = useCrudStorage("contratos");
  const crud = useCrudStorage("pecas", {
    initialItems: [
      {
        id: "seed-p-1",
        codigo: "001",
        tipo: "Vestido",
        descricao: "Vestido longo",
        tamanho: "M",
        cor: "Azul",
        valorAluguel: "150",
        status: "Disponivel",
        observacoes: "",
      },
      {
        id: "seed-p-2",
        codigo: "002",
        tipo: "Terno",
        descricao: "Terno preto",
        tamanho: "G",
        cor: "Preto",
        valorAluguel: "200",
        status: "Disponivel",
        observacoes: "",
      },
    ],
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const pecasReservadas = useMemo(() => {
    const set = new Set();
    for (const ct of contratos.items) {
      if (!isContratoReservandoPecas(ct?.status)) continue;
      for (const id of ct?.pecasIds || []) set.add(id);
    }
    return set;
  }, [contratos.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return crud.items;
    return crud.items.filter((p) =>
      [p.codigo, p.tipo, p.descricao, p.tamanho, p.cor, p.valorAluguel, statusLabel(effectiveStatusFrom(p, pecasReservadas))]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [crud.items, query, pecasReservadas]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo || "",
      tipo: item.tipo || "Vestido",
      descricao: item.descricao || "",
      tamanho: item.tamanho || "",
      cor: item.cor || "",
      valorAluguel: item.valorAluguel ?? "",
      status: normalizeBaseStatus(item.status),
      observacoes: item.observacoes || "",
    });
    setOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const next = name === "valorAluguel" ? maskMoneyBR(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const baseStatus = normalizeBaseStatus(form.status);
    const payload = {
      ...form,
      codigo: String(form.codigo ?? "").trim(),
      descricao: String(form.descricao ?? "").trim(),
      tamanho: String(form.tamanho ?? "").trim(),
      cor: String(form.cor ?? "").trim(),
      valorAluguel: String(form.valorAluguel ?? "").trim(),
      status: baseStatus,
    };

    if (!payload.codigo) {
      alert("Informe o código da peça.");
      return;
    }
    const codigoLower = payload.codigo.toLowerCase();
    const codigoExists = crud.items.some((p) => {
      if (editingId && p.id === editingId) return false;
      return String(p.codigo || "").trim().toLowerCase() === codigoLower;
    });
    if (codigoExists) {
      alert("Já existe uma peça com este código.");
      return;
    }

    if (payload.valorAluguel) {
      const n = Number(String(payload.valorAluguel).replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        alert("Valor do aluguel inválido.");
        return;
      }
    }
    if (editingId) crud.update(editingId, payload);
    else crud.create(payload);
    setOpen(false);
  }

  function handleRemove(id) {
    const ok = confirm("Excluir esta peça?");
    if (!ok) return;
    crud.remove(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Peças</h1>
          <p className="text-gray-500 text-sm">Controle de estoque para locação</p>
        </div>
        <button onClick={startCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full md:w-auto">
          + Nova Peça
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar por código, tipo, tamanho, cor..."
            className="border rounded-lg px-3 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="text-sm text-gray-500">{filtered.length} registro(s)</div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Tamanho</th>
                <th className="px-3 py-2 text-left font-semibold">Cor</th>
                <th className="px-3 py-2 text-left font-semibold">Valor</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.codigo}</td>
                  <td className="px-3 py-2">{p.tipo}</td>
                  <td className="px-3 py-2">{p.tamanho || "-"}</td>
                  <td className="px-3 py-2">{p.cor || "-"}</td>
                  <td className="px-3 py-2">{p.valorAluguel ? `R$ ${p.valorAluguel}` : "-"}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const st = effectiveStatusFrom(p, pecasReservadas);
                      return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(st)}`}>{statusLabel(st)}</span>;
                    })()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button className="text-indigo-700 hover:underline" onClick={() => startEdit(p)}>Editar</button>
                      <button className="text-red-700 hover:underline" onClick={() => handleRemove(p.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">Nenhuma peça encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-800">{p.codigo} • {p.tipo}</div>
                {(() => {
                  const st = effectiveStatusFrom(p, pecasReservadas);
                  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(st)}`}>{statusLabel(st)}</span>;
                })()}
              </div>
              <div className="text-sm text-gray-600">Tamanho: {p.tamanho || "-"}</div>
              <div className="text-sm text-gray-600">Cor: {p.cor || "-"}</div>
              <div className="text-sm text-gray-600">Valor: {p.valorAluguel ? `R$ ${p.valorAluguel}` : "-"}</div>
              <div className="flex gap-4 mt-2">
                <button className="text-indigo-700 font-medium" onClick={() => startEdit(p)}>Editar</button>
                <button className="text-red-700 font-medium" onClick={() => handleRemove(p.id)}>Excluir</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhuma peça encontrada</div>}
        </div>
      </div>

      <Modal
        open={open}
        title={editingId ? "Editar Peça" : "Nova Peça"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => document.getElementById("peca-form")?.requestSubmit()}>Salvar</button>
          </div>
        }
      >
        <form id="peca-form" className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Código</label>
            <input name="codigo" value={form.codigo} onChange={handleChange} required minLength={1} className="border rounded-lg px-3 py-2 w-full" placeholder="001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full">
              <option>Vestido</option>
              <option>Terno</option>
              <option>Saia</option>
              <option>Camisa</option>
              <option>Blazer</option>
              <option>Acessório</option>
              <option>Outro</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <input name="descricao" value={form.descricao} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Ex: Vestido longo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tamanho</label>
            <input name="tamanho" value={form.tamanho} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="PP/P/M/G/GG" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cor</label>
            <input name="cor" value={form.cor} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Preto, Azul..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Valor aluguel (R$)</label>
            <input
              name="valorAluguel"
              value={form.valorAluguel}
              onChange={handleChange}
              inputMode="decimal"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Situação</label>
            <select name="status" value={normalizeBaseStatus(form.status)} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full">
              <option value="Disponivel">Disponível</option>
              <option value="Manutencao">Manutenção</option>
              <option value="Inativa">Inativa</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Status “Alugada” é automático quando a peça entra em um pedido (Ativo).</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <button className="hidden" type="submit">Salvar</button>
        </form>
      </Modal>
    </div>
  );
}