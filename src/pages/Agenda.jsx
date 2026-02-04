import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextEventFromContract(ct, todayIso) {
  const options = [
    ct.retirada ? { kind: "Retirada", data: ct.retirada } : null,
    ct.dataEvento ? { kind: "Evento", data: ct.dataEvento } : null,
    ct.devolucao ? { kind: "Devolução", data: ct.devolucao } : null,
  ].filter(Boolean);

  const future = options.filter((o) => o.data >= todayIso).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  if (future.length > 0) return future[0];
  const all = options.sort((a, b) => String(a.data).localeCompare(String(b.data)));
  return all[0] || null;
}

export default function Agenda() {
  const contratos = useCrudStorage("contratos");
  const clientes = useCrudStorage("clientes");
  const pecas = useCrudStorage("pecas");
  const [query, setQuery] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState(null);

  const clienteById = useMemo(() => {
    const m = new Map();
    for (const c of clientes.items) m.set(c.id, c);
    return m;
  }, [clientes.items]);

  const pecaById = useMemo(() => {
    const m = new Map();
    for (const p of pecas.items) m.set(p.id, p);
    return m;
  }, [pecas.items]);

  const todayIso = useMemo(() => isoToday(), []);

  const groups = useMemo(() => {
    const byCliente = new Map();
    for (const ct of contratos.items) {
      const cli = clienteById.get(ct.clienteId);
      const key = ct.clienteId || "__sem_cliente__";
      if (!byCliente.has(key)) {
        byCliente.set(key, {
          clienteId: ct.clienteId || "",
          cliente: cli || { id: "", nome: "(Cliente)" },
          contratos: [],
        });
      }

      const pecasFull = (ct.pecasIds || []).map((id) => {
        const p = pecaById.get(id);
        return p
          ? {
              id,
              codigo: p.codigo,
              tipo: p.tipo,
              tamanho: p.tamanho,
              descricao: p.descricao,
            }
          : { id, codigo: id, tipo: "", tamanho: "", descricao: "" };
      });

      byCliente.get(key).contratos.push({
        id: ct.id,
        codigo: ct.codigo || "",
        evento: ct.evento,
        status: ct.status,
        retirada: ct.retirada,
        dataEvento: ct.dataEvento,
        devolucao: ct.devolucao,
        pecas: pecasFull,
      });
    }

    const list = Array.from(byCliente.values()).map((g) => {
      const allNext = g.contratos
        .map((ct) => {
          const next = nextEventFromContract(ct, todayIso);
          return next ? { ...next, contratoId: ct.id, evento: ct.evento } : null;
        })
        .filter(Boolean)
        .sort((a, b) => String(a.data).localeCompare(String(b.data)));

      const next = allNext.find((n) => n.data >= todayIso) || allNext[0] || null;
      const totalEventos = g.contratos.reduce((acc, ct) => acc + (ct.retirada ? 1 : 0) + (ct.dataEvento ? 1 : 0) + (ct.devolucao ? 1 : 0), 0);

      return {
        ...g,
        next,
        totalEventos,
      };
    });

    list.sort((a, b) => {
      const ad = a.next?.data || "9999-12-31";
      const bd = b.next?.data || "9999-12-31";
      return String(ad).localeCompare(String(bd));
    });

    return list;
  }, [contratos.items, clienteById, pecaById, todayIso]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const cli = g.cliente;
      const text = [
        cli?.nome,
        cli?.cpf,
        cli?.telefone,
        ...g.contratos.map((ct) => ct.evento),
        ...g.contratos.flatMap((ct) => (ct.pecas || []).map((p) => p.codigo || "")),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [groups, query]);

  const selectedGroup = useMemo(() => {
    if (!selectedClienteId) return null;
    return groups.find((g) => g.clienteId === selectedClienteId) || null;
  }, [groups, selectedClienteId]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-indigo-700">Agenda</h1>
        <p className="text-gray-500 text-sm">Por cliente • Retirada • Evento • Devolução (baseado em Contratos)</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Filtrar por cliente, peça, status..."
            className="border rounded-lg px-3 py-2 w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="text-sm text-gray-500">{filtered.length} cliente(s)</div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold">Próximo</th>
                <th className="px-3 py-2 text-left font-semibold">Contratos</th>
                <th className="px-3 py-2 text-left font-semibold">Eventos</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.clienteId || g.cliente?.nome} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{g.cliente?.nome || "(Cliente)"}</td>
                  <td className="px-3 py-2">
                    {g.next ? (
                      <span className="text-gray-700">{g.next.kind} • {formatDate(g.next.data)}</span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{g.contratos.length}</td>
                  <td className="px-3 py-2">{g.totalEventos}</td>
                  <td className="px-3 py-2">
                    <button className="text-indigo-700 hover:underline" onClick={() => setSelectedClienteId(g.clienteId)}>
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">Nenhum cliente/evento encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((g) => (
            <button
              key={g.clienteId || g.cliente?.nome}
              type="button"
              onClick={() => setSelectedClienteId(g.clienteId)}
              className="border rounded-xl p-3 text-left hover:bg-indigo-50"
            >
              <div className="font-semibold text-gray-800">{g.cliente?.nome || "(Cliente)"}</div>
              <div className="text-sm text-gray-600">Contratos: {g.contratos.length} • Eventos: {g.totalEventos}</div>
              <div className="text-sm text-gray-600">Próximo: {g.next ? `${g.next.kind} • ${formatDate(g.next.data)}` : "-"}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum cliente/evento encontrado</div>}
        </div>
      </div>

      <Modal
        open={!!selectedGroup}
        title={selectedGroup ? `Agenda do cliente: ${selectedGroup.cliente?.nome || "(Cliente)"}` : "Agenda do cliente"}
        onClose={() => setSelectedClienteId(null)}
        footer={
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setSelectedClienteId(null)}>
              Fechar
            </button>
          </div>
        }
      >
        {selectedGroup && (
          <div className="flex flex-col gap-4">
            <div className="bg-indigo-50 rounded-xl p-3">
              <div className="font-semibold text-gray-800">{selectedGroup.cliente?.nome}</div>
              <div className="text-sm text-gray-700">CPF/CNPJ: {selectedGroup.cliente?.cpf || "-"}</div>
              <div className="text-sm text-gray-700">Telefone: {selectedGroup.cliente?.telefone || "-"}</div>
            </div>

            {selectedGroup.contratos.map((ct) => (
              <div key={ct.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-800">{ct.evento || "(Sem evento)"}</div>
                  <div className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">{ct.status || "-"}</div>
                </div>

                <div className="text-sm text-gray-600 mt-1">Código: {ct.codigo || "-"}</div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div className="bg-white rounded-lg border p-2">
                    <div className="text-gray-500 text-xs">Retirada</div>
                    <div className="text-gray-800">{formatDate(ct.retirada)}</div>
                  </div>
                  <div className="bg-white rounded-lg border p-2">
                    <div className="text-gray-500 text-xs">Evento</div>
                    <div className="text-gray-800">{formatDate(ct.dataEvento)}</div>
                  </div>
                  <div className="bg-white rounded-lg border p-2">
                    <div className="text-gray-500 text-xs">Devolução</div>
                    <div className="text-gray-800">{formatDate(ct.devolucao)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold text-gray-700">Peças</div>
                  <div className="text-sm text-gray-700 mt-1">
                    {(ct.pecas || []).length === 0 && <span className="text-gray-500">-</span>}
                    {(ct.pecas || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(ct.pecas || []).map((p) => (
                          <span key={p.id} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800">
                            {p.codigo}{p.tipo ? ` • ${p.tipo}` : ""}{p.tamanho ? ` (${p.tamanho})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {selectedGroup.contratos.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum contrato para este cliente.</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}