import { useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d, delta) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

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

function kindBadge(kind) {
  const map = {
    Retirada: "bg-indigo-100 text-indigo-700",
    Evento: "bg-green-100 text-green-700",
    Devolucao: "bg-orange-100 text-orange-700",
  };
  return map[kind] || "bg-gray-100 text-gray-700";
}

function kindLabel(kind) {
  const map = { Retirada: "Retirada", Evento: "Evento", Devolucao: "Devolução" };
  return map[kind] || kind;
}

export default function Dashboard() {
  const contratos = useCrudStorage("contratos");
  const clientes = useCrudStorage("clientes");
  const pecas = useCrudStorage("pecas");

  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);

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

  const events = useMemo(() => {
    const out = [];
    for (const ct of contratos.items) {
      const cli = clienteById.get(ct.clienteId);
      const pecasTxt = (ct.pecasIds || [])
        .map((id) => pecaById.get(id)?.codigo || pecaById.get(id)?.descricao || "")
        .filter(Boolean);

      if (ct.retirada) {
        out.push({
          id: `${ct.id}-retirada`,
          contratoId: ct.id,
          contratoCodigo: ct.codigo || "",
          kind: "Retirada",
          data: ct.retirada,
          evento: ct.evento,
          cliente: cli?.nome || "(Cliente)",
          pecas: pecasTxt,
          status: ct.status,
        });
      }
      if (ct.dataEvento) {
        out.push({
          id: `${ct.id}-evento`,
          contratoId: ct.id,
          contratoCodigo: ct.codigo || "",
          kind: "Evento",
          data: ct.dataEvento,
          evento: ct.evento,
          cliente: cli?.nome || "(Cliente)",
          pecas: pecasTxt,
          status: ct.status,
        });
      }
      if (ct.devolucao) {
        out.push({
          id: `${ct.id}-devolucao`,
          contratoId: ct.id,
          contratoCodigo: ct.codigo || "",
          kind: "Devolucao",
          data: ct.devolucao,
          evento: ct.evento,
          cliente: cli?.nome || "(Cliente)",
          pecas: pecasTxt,
          status: ct.status,
        });
      }
    }
    out.sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
    return out;
  }, [contratos.items, clienteById, pecaById]);

  const eventsByDate = useMemo(() => {
    const m = new Map();
    for (const ev of events) {
      const key = String(ev.data || "");
      if (!key) continue;
      m.set(key, [...(m.get(key) || []), ev]);
    }
    return m;
  }, [events]);

  const todayIso = useMemo(() => isoFromDate(new Date()), []);
  const next7Iso = useMemo(() => isoFromDate(addDays(new Date(), 7)), []);

  const stats = useMemo(() => {
    const contratosAtivos = contratos.items.filter((c) => c.status === "Ativo").length;
    const totalClientes = clientes.items.length;
    const totalPecas = pecas.items.length;
    const eventosProx = events.filter((ev) => ev.data >= todayIso && ev.data <= next7Iso).length;
    return { contratosAtivos, totalClientes, totalPecas, eventosProx };
  }, [contratos.items, clientes.items.length, pecas.items.length, events, todayIso, next7Iso]);

  const calendarCells = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const firstDow = first.getDay(); // 0=Dom
    const start = addDays(first, -firstDow);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const iso = isoFromDate(d);
      const inMonth = d.getMonth() === monthCursor.getMonth();
      const count = (eventsByDate.get(iso) || []).length;
      cells.push({ iso, day: d.getDate(), inMonth, count });
    }
    return cells;
  }, [monthCursor, eventsByDate]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [eventsByDate, selectedDate]);

  const monthLabel = useMemo(() => {
    try {
      return monthCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    } catch {
      return `${monthCursor.getMonth() + 1}/${monthCursor.getFullYear()}`;
    }
  }, [monthCursor]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-700">Início</h1>
        <p className="text-gray-500 text-sm">Resumo rápido e próximos eventos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-indigo-100 rounded-xl p-4 flex flex-col items-center shadow">
          <span className="text-3xl font-bold text-indigo-700">{stats.contratosAtivos}</span>
          <span className="text-sm text-indigo-800 mt-1">Contratos ativos</span>
        </div>
        <div className="bg-green-100 rounded-xl p-4 flex flex-col items-center shadow">
          <span className="text-3xl font-bold text-green-700">{stats.totalPecas}</span>
          <span className="text-sm text-green-800 mt-1">Peças cadastradas</span>
        </div>
        <div className="bg-yellow-100 rounded-xl p-4 flex flex-col items-center shadow">
          <span className="text-3xl font-bold text-yellow-700">{stats.totalClientes}</span>
          <span className="text-sm text-yellow-800 mt-1">Clientes</span>
        </div>
        <div className="bg-red-100 rounded-xl p-4 flex flex-col items-center shadow">
          <span className="text-3xl font-bold text-red-700">{stats.eventosProx}</span>
          <span className="text-sm text-red-800 mt-1">Eventos (7 dias)</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-indigo-700">Calendário</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={() => setMonthCursor((d) => addMonths(d, -1))}
              aria-label="Mês anterior"
            >
              <FiChevronLeft />
            </button>
            <div className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</div>
            <button
              type="button"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={() => setMonthCursor((d) => addMonths(d, 1))}
              aria-label="Próximo mês"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mt-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="text-xs text-gray-500 font-semibold text-center">
              {d}
            </div>
          ))}

          {calendarCells.map((c) => {
            const isToday = c.iso === todayIso;
            const has = c.count > 0;
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => setSelectedDate(c.iso)}
                className={
                  "h-16 md:h-20 rounded-2xl border text-left px-3 py-2 flex flex-col justify-between hover:bg-indigo-50 " +
                  (c.inMonth ? "bg-white" : "bg-gray-50 text-gray-400") +
                  (isToday ? " ring-2 ring-indigo-200" : "")
                }
              >
                <div className="text-sm font-semibold">{c.day}</div>
                <div className="flex items-center justify-between">
                  {has ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold">{c.count}</span>
                  ) : (
                    <span className="text-xs text-gray-300">&nbsp;</span>
                  )}
                  <span className={"text-xs " + (has ? "text-indigo-600" : "text-gray-300")}>{has ? "ver" : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!selectedDate}
        title={selectedDate ? `Eventos do dia ${formatDate(selectedDate)}` : "Eventos do dia"}
        onClose={() => setSelectedDate(null)}
        footer={
          <div className="flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setSelectedDate(null)}>
              Fechar
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {selectedEvents.map((ev) => (
            <div key={ev.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${kindBadge(ev.kind)}`}>{kindLabel(ev.kind)}</span>
                <div className="text-xs text-gray-500">{ev.status || "-"}</div>
              </div>
              <div className="mt-1 font-semibold text-gray-800">{ev.cliente}</div>
              <div className="text-sm text-gray-600">Evento: {ev.evento || "-"}</div>
              <div className="text-sm text-gray-600">Contrato: {ev.contratoCodigo || "-"}</div>
              <div className="text-sm text-gray-600">Peças: {(ev.pecas || []).join(", ") || "-"}</div>
            </div>
          ))}
          {selectedEvents.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum evento neste dia.</div>}
        </div>
      </Modal>
    </div>
  );
}
