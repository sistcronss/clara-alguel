import { useMemo, useState } from "react";
import { FiDownload, FiPrinter, FiSearch } from "react-icons/fi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

function parseMoney(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "R$ 0,00";
  return `R$ ${v.toFixed(2)}`;
}

function isIsoInRange(iso, start, end) {
  if (!iso) return false;
  const v = String(iso);
  if (start && v < String(start)) return false;
  if (end && v > String(end)) return false;
  return true;
}

function contractMatchesDateMode(ct, start, end, dateMode) {
  if (!start && !end) return true;
  const fields =
    dateMode === "Evento"
      ? [ct.dataEvento]
      : dateMode === "Retirada"
        ? [ct.retirada]
        : dateMode === "Devolução"
          ? [ct.devolucao]
          : [ct.retirada, ct.dataEvento, ct.devolucao];

  return fields.some((iso) => isIsoInRange(iso, start, end));
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[\n\r";]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(";"));
  for (const r of rows) lines.push(r.map(csvEscape).join(";"));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const contratos = useCrudStorage("contratos");
  const clientes = useCrudStorage("clientes");
  const pecas = useCrudStorage("pecas");

  const [query, setQuery] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [status, setStatus] = useState("");
  const [dateMode, setDateMode] = useState("Qualquer");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedContratoId, setSelectedContratoId] = useState(null);

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

  const contratosEnriched = useMemo(() => {
    return contratos.items.map((ct) => {
      const cli = clienteById.get(ct.clienteId);
      const pecasList = (ct.pecasIds || []).map((id) => pecaById.get(id)).filter(Boolean);
      const subtotal = pecasList.reduce((acc, p) => acc + parseMoney(p.valorAluguel), 0);
      const desconto = parseMoney(ct.desconto);
      const total = subtotal - desconto;
      return {
        ...ct,
        clienteNome: cli?.nome || "(Cliente)",
        pecasList,
        subtotal,
        desconto,
        total,
      };
    });
  }, [contratos.items, clienteById, pecaById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const st = status.trim();
    const cid = clienteId.trim();

    return contratosEnriched.filter((ct) => {
      if (cid && String(ct.clienteId) !== cid) return false;
      if (st && String(ct.status || "") !== st) return false;
      if (!contractMatchesDateMode(ct, start, end, dateMode)) return false;

      if (!q) return true;
      const pecasTxt = (ct.pecasList || []).map((p) => `${p.codigo || ""} ${p.tipo || ""} ${p.descricao || ""}`.trim()).join(" ");
      return [ct.codigo, ct.clienteNome, ct.evento, ct.status, ct.retirada, ct.dataEvento, ct.devolucao, pecasTxt]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [contratosEnriched, query, clienteId, status, start, end, dateMode]);

  const stats = useMemo(() => {
    const totalContratos = filtered.length;
    const bruto = filtered.reduce((acc, ct) => acc + (Number.isFinite(ct.subtotal) ? ct.subtotal : 0), 0);
    const descontos = filtered.reduce((acc, ct) => acc + (Number.isFinite(ct.desconto) ? ct.desconto : 0), 0);
    const liquido = filtered.reduce((acc, ct) => acc + (Number.isFinite(ct.total) ? ct.total : 0), 0);
    const ativos = filtered.filter((ct) => ct.status === "Ativo").length;
    return { totalContratos, bruto, descontos, liquido, ativos };
  }, [filtered]);

  const topClientes = useMemo(() => {
    const by = new Map();
    for (const ct of filtered) {
      const key = ct.clienteId || "__";
      const cur = by.get(key) || { clienteId: ct.clienteId || "", nome: ct.clienteNome, contratos: 0, receita: 0 };
      cur.contratos += 1;
      cur.receita += Number.isFinite(ct.total) ? ct.total : 0;
      by.set(key, cur);
    }
    return Array.from(by.values()).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [filtered]);

  const topPecas = useMemo(() => {
    const by = new Map();
    for (const ct of filtered) {
      for (const pid of ct.pecasIds || []) {
        const p = pecaById.get(pid);
        const key = pid;
        const label = p ? `${p.codigo} • ${p.tipo}${p.tamanho ? ` (${p.tamanho})` : ""}` : pid;
        const cur = by.get(key) || { pecaId: pid, label, qtd: 0 };
        cur.qtd += 1;
        by.set(key, cur);
      }
    }
    return Array.from(by.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [filtered, pecaById]);

  const selectedContrato = useMemo(() => {
    if (!selectedContratoId) return null;
    return contratosEnriched.find((c) => c.id === selectedContratoId) || null;
  }, [selectedContratoId, contratosEnriched]);

  function exportContratosCsv() {
    downloadCsv(
      "relatorio-contratos.csv",
      ["Código", "Cliente", "Evento", "Retirada", "Data do Evento", "Devolução", "Status", "Peças", "Bruto", "Desconto", "Total"],
      filtered.map((ct) => [
        ct.codigo || "",
        ct.clienteNome,
        ct.evento || "",
        ct.retirada || "",
        ct.dataEvento || "",
        ct.devolucao || "",
        ct.status || "",
        (ct.pecasList || []).map((p) => p.codigo).filter(Boolean).join(", "),
        ct.subtotal,
        ct.desconto,
        ct.total,
      ])
    );
  }

  function exportContratosPdf() {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const title = "Relatório de Contratos";
    doc.setFontSize(14);
    doc.text(title, 14, 14);

    doc.setFontSize(10);
    const filtros = [
      clienteId ? `Cliente: ${clientes.items.find((c) => c.id === clienteId)?.nome || clienteId}` : "Cliente: Todos",
      status ? `Status: ${status}` : "Status: Todos",
      dateMode ? `Datas: ${dateMode}` : "Datas: Qualquer",
      start || end ? `Período: ${formatDate(start)} – ${formatDate(end)}` : "Período: (não definido)",
      query ? `Busca: ${query}` : "Busca: (vazia)",
    ];
    doc.text(filtros.join("   |   "), 14, 20, { maxWidth: 180 });

    doc.setFontSize(10);
    doc.text(`Contratos: ${stats.totalContratos}   |   Receita líquida: ${money(stats.liquido)}`, 14, 28);

    const head = [["Código", "Cliente", "Evento", "Retirada", "Evento", "Devolução", "Status", "Total"]];
    const body = filtered.map((ct) => [
      ct.codigo || "-",
      ct.clienteNome,
      ct.evento || "-",
      formatDate(ct.retirada),
      formatDate(ct.dataEvento),
      formatDate(ct.devolucao),
      ct.status || "-",
      money(ct.total),
    ]);

    autoTable(doc, {
      startY: 32,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [238, 242, 255], textColor: 40 },
      columnStyles: {
        7: { halign: "right" },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, 200, 292, { align: "right" });
      },
    });

    doc.save("relatorio-contratos.pdf");
  }

  function exportTopClientesCsv() {
    downloadCsv(
      "relatorio-top-clientes.csv",
      ["Cliente", "Contratos", "Receita (R$)"],
      topClientes.map((c) => [c.nome, c.contratos, c.receita.toFixed(2)])
    );
  }

  function exportTopPecasCsv() {
    downloadCsv(
      "relatorio-top-pecas.csv",
      ["Peça", "Quantidade"],
      topPecas.map((p) => [p.label, p.qtd])
    );
  }

  function exportTopClientesPdf() {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Top clientes (receita)", 14, 14);

    doc.setFontSize(10);
    doc.text(`Período: ${formatDate(start)} – ${formatDate(end)}   |   Status: ${status || "Todos"}`, 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Cliente", "Contratos", "Receita"]],
      body: topClientes.map((c) => [c.nome, String(c.contratos), money(c.receita)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [238, 242, 255], textColor: 40 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });

    doc.save("relatorio-top-clientes.pdf");
  }

  function exportTopPecasPdf() {
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Top peças (mais alugadas)", 14, 14);

    doc.setFontSize(10);
    doc.text(`Período: ${formatDate(start)} – ${formatDate(end)}   |   Status: ${status || "Todos"}`, 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [["Peça", "Quantidade"]],
      body: topPecas.map((p) => [p.label, String(p.qtd)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [238, 242, 255], textColor: 40 },
      columnStyles: { 1: { halign: "right" } },
    });

    doc.save("relatorio-top-pecas.pdf");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-indigo-700">Relatórios</h1>
        <p className="text-gray-500 text-sm">Resumo por período, cliente, status e peças (baseado em Contratos)</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Filtro rápido</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente, peça, evento..."
                className="border rounded-lg pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
              <option value="">Todos</option>
              {clientes.items.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
              <option value="">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Ativo">Ativo</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Considerar datas</label>
            <select value={dateMode} onChange={(e) => setDateMode(e.target.value)} className="border rounded-lg px-3 py-2 w-full">
              <option>Qualquer</option>
              <option>Evento</option>
              <option>Retirada</option>
              <option>Devolução</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Período</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={start} onChange={(e) => setStart(e.target.value)} type="date" className="border rounded-lg px-3 py-2 w-full" />
              <input value={end} onChange={(e) => setEnd(e.target.value)} type="date" className="border rounded-lg px-3 py-2 w-full" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-600">{stats.totalContratos} contrato(s) no filtro</div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => window.print()}>
              <FiPrinter />
              Imprimir
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={exportContratosCsv}>
              <FiDownload />
              Exportar contratos (CSV)
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={exportContratosPdf}>
              <FiDownload />
              Exportar contratos (PDF)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-indigo-100 rounded-2xl p-4 shadow">
          <div className="text-sm text-indigo-800">Contratos</div>
          <div className="text-2xl font-bold text-indigo-700">{stats.totalContratos}</div>
        </div>
        <div className="bg-green-100 rounded-2xl p-4 shadow">
          <div className="text-sm text-green-800">Receita bruta</div>
          <div className="text-xl font-bold text-green-700">{money(stats.bruto)}</div>
        </div>
        <div className="bg-yellow-100 rounded-2xl p-4 shadow">
          <div className="text-sm text-yellow-800">Descontos</div>
          <div className="text-xl font-bold text-yellow-700">{money(stats.descontos)}</div>
        </div>
        <div className="bg-blue-100 rounded-2xl p-4 shadow">
          <div className="text-sm text-blue-800">Receita líquida</div>
          <div className="text-xl font-bold text-blue-700">{money(stats.liquido)}</div>
        </div>
        <div className="bg-red-100 rounded-2xl p-4 shadow">
          <div className="text-sm text-red-800">Ativos</div>
          <div className="text-2xl font-bold text-red-700">{stats.ativos}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-indigo-700">Contratos (detalhado)</h2>
        </div>

        <div className="hidden md:block overflow-x-auto mt-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold">Evento</th>
                <th className="px-3 py-2 text-left font-semibold">Datas</th>
                <th className="px-3 py-2 text-left font-semibold">Peças</th>
                <th className="px-3 py-2 text-left font-semibold">Total</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ct) => (
                <tr key={ct.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-semibold text-gray-800">{ct.codigo || "-"}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">{ct.clienteNome}</td>
                  <td className="px-3 py-2">{ct.evento || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    <div>Retirada: {formatDate(ct.retirada)}</div>
                    <div>Evento: {formatDate(ct.dataEvento)}</div>
                    <div>Devolução: {formatDate(ct.devolucao)}</div>
                  </td>
                  <td className="px-3 py-2">{(ct.pecasList || []).length}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">{money(ct.total)}</td>
                  <td className="px-3 py-2">{ct.status || "-"}</td>
                  <td className="px-3 py-2">
                    <button className="text-indigo-700 hover:underline" onClick={() => setSelectedContratoId(ct.id)}>Ver</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">Nenhum contrato no período/filtros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3 mt-3">
          {filtered.map((ct) => (
            <button key={ct.id} type="button" className="border rounded-xl p-3 text-left hover:bg-indigo-50" onClick={() => setSelectedContratoId(ct.id)}>
              <div className="font-semibold text-gray-800">{ct.clienteNome}</div>
              <div className="text-sm text-gray-600">Código: {ct.codigo || "-"}</div>
              <div className="text-sm text-gray-600">Evento: {ct.evento || "-"}</div>
              <div className="text-sm text-gray-600">Data: {formatDate(ct.dataEvento) !== "-" ? formatDate(ct.dataEvento) : formatDate(ct.retirada)}</div>
              <div className="text-sm text-gray-600">Peças: {(ct.pecasList || []).length} • Total: {money(ct.total)}</div>
              <div className="text-sm text-gray-600">Status: {ct.status || "-"}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum contrato no período/filtros</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-indigo-700">Top clientes (receita)</h2>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={exportTopClientesCsv}>
                <FiDownload />
                CSV
              </button>
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={exportTopClientesPdf}>
                <FiDownload />
                PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-left font-semibold">Contratos</th>
                  <th className="px-3 py-2 text-left font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((c) => (
                  <tr key={c.clienteId || c.nome} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium text-gray-800">{c.nome}</td>
                    <td className="px-3 py-2">{c.contratos}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{money(c.receita)}</td>
                  </tr>
                ))}
                {topClientes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-gray-500">Sem dados no filtro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-indigo-700">Top peças (mais alugadas)</h2>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={exportTopPecasCsv}>
                <FiDownload />
                CSV
              </button>
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={exportTopPecasPdf}>
                <FiDownload />
                PDF
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {topPecas.map((p) => {
              const max = topPecas[0]?.qtd || 1;
              const pct = Math.max(5, Math.round((p.qtd / max) * 100));
              return (
                <div key={p.pecaId} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-gray-800 truncate">{p.label}</div>
                    <div className="text-sm text-gray-600 whitespace-nowrap">{p.qtd}x</div>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topPecas.length === 0 && <div className="text-center text-gray-500 py-6">Sem dados no filtro</div>}
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedContrato}
        title={selectedContrato ? `Contrato ${selectedContrato.codigo ? `• ${selectedContrato.codigo} ` : ""}• ${selectedContrato.clienteNome}` : "Contrato"}
        onClose={() => setSelectedContratoId(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setSelectedContratoId(null)}>
              Fechar
            </button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        }
      >
        {selectedContrato && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Retirada</div>
                <div className="font-semibold text-gray-800">{formatDate(selectedContrato.retirada)}</div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Evento</div>
                <div className="font-semibold text-gray-800">{formatDate(selectedContrato.dataEvento)}</div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Devolução</div>
                <div className="font-semibold text-gray-800">{formatDate(selectedContrato.devolucao)}</div>
              </div>
            </div>

            <div className="border rounded-xl p-3">
              <div className="text-sm font-semibold text-gray-700">Evento</div>
              <div className="text-gray-800">{selectedContrato.evento || "-"}</div>
              <div className="text-sm text-gray-600 mt-1">Status: {selectedContrato.status || "-"}</div>
              <div className="text-sm text-gray-600">Código: {selectedContrato.codigo || "-"}</div>
            </div>

            <div className="border rounded-xl p-3">
              <div className="text-sm font-semibold text-gray-700">Peças</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(selectedContrato.pecasList || []).map((p) => (
                  <span key={p.id} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800">
                    {p.codigo} • {p.tipo}{p.tamanho ? ` (${p.tamanho})` : ""}
                  </span>
                ))}
                {(selectedContrato.pecasList || []).length === 0 && <span className="text-gray-500">-</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Bruto</div>
                <div className="font-semibold text-gray-800">{money(selectedContrato.subtotal)}</div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Desconto</div>
                <div className="font-semibold text-gray-800">{money(selectedContrato.desconto)}</div>
              </div>
              <div className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-semibold text-gray-800">{money(selectedContrato.total)}</div>
              </div>
            </div>

            {selectedContrato.observacoes && (
              <div className="border rounded-xl p-3">
                <div className="text-sm font-semibold text-gray-700">Observações</div>
                <div className="text-gray-800 whitespace-pre-wrap">{selectedContrato.observacoes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}