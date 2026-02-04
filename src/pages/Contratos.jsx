import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { useCrudStorage } from "../hooks/useCrudStorage";
import { FiSearch, FiX } from "react-icons/fi";
import { FiDownload, FiPrinter } from "react-icons/fi";
import { useEmpresa } from "../hooks/useEmpresa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { maskCep, maskCpfCnpj, maskMoneyBR, maskPhoneBR } from "../utils/masks";

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
  codigo: "",
  clienteId: "",
  evento: "",
  dataEvento: "",
  retirada: "",
  devolucao: "",
  pecasIds: [],
  desconto: "",
  status: "Pendente",
  observacoes: "",
};

const CLIENTE_EMPTY = {
  nome: "",
  cpf: "",
  nascimento: "",
  telefone: "",
  endereco: "",
  cep: "",
};

function nextContratoCodigoFrom(items) {
  let max = 0;
  for (const ct of items || []) {
    const raw = String(ct?.codigo || "");
    const m = raw.match(/(\d+)/g);
    if (!m || m.length === 0) continue;
    const n = Number(m[m.length - 1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `CT-${String(max + 1).padStart(5, "0")}`;
}

function statusBadge(status) {
  const map = {
    Pendente: "bg-yellow-100 text-yellow-700",
    Ativo: "bg-blue-100 text-blue-700",
    Finalizado: "bg-green-100 text-green-700",
    Cancelado: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

function money(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "-";
  return `R$ ${n.toFixed(2)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateBR(iso) {
  if (!iso) return "____/____/______";
  try {
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

function moneyBR(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "R$ 0,00";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function buildPrintableContratoHtml({ empresa, cliente, contrato, pecasSelecionadas, total }) {
  const logo = empresa?.logo || "";
  const clienteNome = cliente?.nome ? escapeHtml(cliente.nome) : "";
  const clienteCpf = cliente?.cpf ? escapeHtml(cliente.cpf) : "";
  const clienteTel = cliente?.telefone ? escapeHtml(cliente.telefone) : "";
  const clienteEndereco = cliente?.endereco ? escapeHtml(cliente.endereco) : "";

  const itemCount = Math.max(6, (pecasSelecionadas || []).length || 0);
  const rows = Array.from({ length: itemCount }).map((_, idx) => {
    const p = (pecasSelecionadas || [])[idx];
    if (!p) {
      return `<tr><td class="cell">&nbsp;</td><td class="cell">&nbsp;</td></tr>`;
    }
    const left = `${escapeHtml(p.codigo || "")}${p.tipo ? ` • ${escapeHtml(p.tipo)}` : ""}${p.tamanho ? ` (${escapeHtml(p.tamanho)})` : ""}${p.descricao ? ` — ${escapeHtml(p.descricao)}` : ""}`;
    return `<tr><td class="cell">${left}</td><td class="cell">&nbsp;</td></tr>`;
  });

  const totalTxt = escapeHtml(moneyBR(total));

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato</title>
  <style>
    /* Modelo ABNT (NBR 14724): margens sup/esq 3cm; inf/dir 2cm.
       Usamos padding no body (em vez de depender só de @page margin),
       porque alguns navegadores/prints ignoram @page e o texto fica “no canto”. */
    @page { size: A4; margin: 0; }
    html, body { height: 100%; }
    body {
      font-family: Arial, sans-serif;
      color: #111;
      margin: 0;
      padding: 30mm 20mm 20mm 30mm;
      box-sizing: border-box;
      font-size: 12pt;
      line-height: 1.5;
      text-align: justify;
      hyphens: auto;
    }
    .wrap { width: 100%; }
    .header { text-align: center; margin-bottom: 10px; }
    .logo { height: 56px; object-fit: contain; display: block; margin: 0 auto 6px; }
    .title { font-weight: 700; font-size: 13px; line-height: 1.35; }
    .subtitle { font-weight: 700; font-size: 12px; margin-top: 2px; }
    .small { font-size: 12pt; line-height: 1.5; }
    .muted { color: #333; }
    .spacer { height: 6px; }
    .line { display: inline-block; border-bottom: 1px solid #000; min-width: 160px; height: 14px; vertical-align: baseline; }
    .block { margin: 0 0 6px 0; }
    .sectionTitle { font-weight: 700; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
    th { background: #f2f2f2; text-transform: uppercase; font-size: 10px; letter-spacing: .2px; padding: 4px; }
    .cell { height: 14px; }
    .footerLines { margin-top: 12px; font-size: 11px; }
    .sigLine { margin-top: 10px; }
    .sig { border-bottom: 1px solid #000; height: 16px; }
    .twoCols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .k { font-weight: 700; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      ${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="Logo" />` : ""}
      <div class="title">Instrumento Particular de Locação de Trajes Finos</div>
      <div class="spacer"></div>
      <div class="subtitle">CLARA ALUGUEL</div>
      <div class="small muted">Contato: (38) 99841-3622</div>
    </div>

    <div class="small block">Clara Aluguel, com sede em Montes Claros- MG, Rua Dois-A, nº 226, Vila Anália, CEP 39402874</div>
    <div class="small block">e <span class="line" style="min-width: 420px;">${clienteNome || ""}</span></div>

    <div class="small block">Tel: <span class="line" style="min-width: 210px;">${clienteTel || ""}</span>, CPF/CNPJ <span class="line" style="min-width: 190px;">${clienteCpf || ""}</span>, residente no endereço:</div>
    <div class="small block"><span class="line" style="min-width: 540px;">${clienteEndereco || ""}</span></div>

    <div class="small block">Resolvem celebrar o presente contrato de locação com as cláusulas e condições seguintes:</div>
    <div class="sectionTitle small">DO OBJETO DO CONTRATO</div>
    <div class="small block">É objeto do presente contrato a locação do(s) seguinte(s) traje(s)s e acessório(s):</div>

    <table>
      <thead>
        <tr>
          <th style="width:75%">&nbsp;</th>
          <th style="width:25%">VALOR TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("\n")}
        <tr>
          <td class="cell">&nbsp;</td>
          <td class="cell" style="text-align:right; font-weight:700;">${totalTxt}</td>
        </tr>
      </tbody>
    </table>

    <div class="spacer"></div>

    <div class="small block">EVENTO: <span class="line" style="min-width: 440px;">${escapeHtml(contrato?.evento || "")}</span></div>
    <div class="small block">BUSCAR NO DIA: ${escapeHtml(formatDateBR(contrato?.retirada))} DEVOLVER NO DIA: ${escapeHtml(formatDateBR(contrato?.devolucao))}</div>
    <div class="small block">ENTRADA: _________________________________________________________________</div>
    <div class="small block">DATA: _____ de _____________ de ______________</div>
    <div class="small block">VALOR RESTANTE:_____________________________________________________________</div>
    <div class="small block">PAGO EM ______ de ________________ de _________</div>

    <div class="spacer"></div>

    <div class="small block">O LOCATÁRIO poderá fazer reserva antecipada dos trajes e/ou acessórios mediante o pagamento</div>
    <div class="small block">antecipado de R$ 50,00 do valor total do aluguel e assinatura do presente instrumento. O valor</div>
    <div class="small block">restante deverá ser efetuado até a data de retirada do traje na loja.</div>

    <div class="small block">O valor referente à reserva não será devolvido sob qualquer hipótese, mesmo em caso de</div>
    <div class="small block">cancelamento do contrato, também não poderá ser transferido ao outro traje.</div>

    <div class="small block">Todos os trajes precisam passar por última prova, para verificação dos ajustes. L</div>

    <div class="small block">Caso os trajes e/ou acessórios sejam devolvidos com excesso de sujeira, manchas ou danificados,</div>
    <div class="small block">será cobrada uma taxa (o valor a pagar será negociado e avaliado as peças danificadas).</div>

    <div class="small block">A não devolução no prazo estabelecido da data prevista, dos trajes e/ou acessórios descritos</div>
    <div class="small block">nesse contrato, será considerada EXTRAVIO ou ROUBO, sendo que o LOCATÁRIO terá que pagar</div>
    <div class="small block">4 (quatro) vezes o valor do aluguel de cada peça.</div>

    <div class="small block">Montes claros, dia __________________________________________de________.</div>
    <div class="small block">Assinatura Locador: ___________________________________________________</div>
    <div class="small block">Assinatura Locatário(a):__________________________________________________</div>
  </div>
</body>
</html>`;
}

function extractStyleAndBodyFromHtml(html) {
  const styleMatch = String(html).match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = String(html).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    css: styleMatch ? styleMatch[1] : "",
    body: bodyMatch ? bodyMatch[1] : String(html),
  };
}

function normalizePecaBaseStatus(status) {
  const s = String(status || "").trim();
  if (s === "Alugada") return "Disponivel";
  if (s === "Manutencao" || s === "Inativa" || s === "Disponivel") return s;
  return "Disponivel";
}

function isContratoReservandoPecas(status) {
  return status === "Ativo";
}

function pecaStatusLabel(status) {
  const map = {
    Disponivel: "Disponível",
    Alugada: "Alugada",
    Manutencao: "Manutenção",
    Inativa: "Inativa",
  };
  return map[status] || status;
}

export default function Contratos() {
  const location = useLocation();
  const navigate = useNavigate();
  const { empresa } = useEmpresa();
  const clientes = useCrudStorage("clientes");
  const pecas = useCrudStorage("pecas");
  const crud = useCrudStorage("contratos", {
    initialItems: [
      {
        id: "seed-c-1",
        codigo: "CT-00001",
        clienteId: "seed-1",
        evento: "Casamento",
        dataEvento: "2026-02-10",
        retirada: "2026-02-08",
        devolucao: "2026-02-11",
        pecasIds: ["seed-p-1"],
        desconto: "0",
        status: "Ativo",
        observacoes: "",
      },
    ],
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pecaSearchOpen, setPecaSearchOpen] = useState(false);
  const [pecaSearch, setPecaSearch] = useState("");

  const [clienteSearch, setClienteSearch] = useState("");

  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteForm, setClienteForm] = useState(CLIENTE_EMPTY);

  const nextContratoCodigo = useMemo(() => {
    return nextContratoCodigoFrom(crud.items);
  }, [crud.items]);

  useEffect(() => {
    if (!location.state?.startCreate) return;

    setEditingId(null);
    setForm({ ...EMPTY, codigo: nextContratoCodigo });
    setPecaSearch("");
    setClienteSearch("");
    setOpen(true);

    navigate("/contratos", { replace: true, state: null });
  }, [location.state, navigate, nextContratoCodigo]);

  const clienteById = useMemo(() => {
    const m = new Map();
    for (const c of clientes.items) m.set(c.id, c);
    return m;
  }, [clientes.items]);

  const clientesFiltered = useMemo(() => {
    const q = String(clienteSearch || "").trim().toLowerCase();
    if (!q) return clientes.items;
    const qDigits = onlyDigits(q);
    return clientes.items.filter((c) => {
      const nome = String(c?.nome || "").toLowerCase();
      const cpf = String(c?.cpf || "").toLowerCase();
      const tel = String(c?.telefone || "").toLowerCase();

      if (nome.includes(q) || cpf.includes(q) || tel.includes(q)) return true;
      if (qDigits) {
        const cpfDigits = onlyDigits(c?.cpf);
        const telDigits = onlyDigits(c?.telefone);
        if (cpfDigits.includes(qDigits) || telDigits.includes(qDigits)) return true;
      }
      return false;
    });
  }, [clientes.items, clienteSearch]);

  const pecaById = useMemo(() => {
    const m = new Map();
    for (const p of pecas.items) m.set(p.id, p);
    return m;
  }, [pecas.items]);

  const pecasReservadas = useMemo(() => {
    const set = new Set();
    for (const ct of crud.items) {
      if (editingId && ct.id === editingId) continue;
      if (!isContratoReservandoPecas(ct?.status)) continue;
      for (const id of ct?.pecasIds || []) set.add(id);
    }
    return set;
  }, [crud.items, editingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return crud.items;
    return crud.items.filter((ct) => {
      const cli = clienteById.get(ct.clienteId);
      const pecasTxt = (ct.pecasIds || []).map((id) => pecaById.get(id)?.codigo || pecaById.get(id)?.descricao || "").join(" ");
      return [ct.codigo, cli?.nome, ct.evento, ct.dataEvento, ct.status, pecasTxt].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [crud.items, query, clienteById, pecaById]);

  const totalPreview = useMemo(() => {
    const sum = (form.pecasIds || []).reduce((acc, id) => {
      const p = pecaById.get(id);
      const n = Number(String(p?.valorAluguel ?? "").replace(",", "."));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const desc = Number(String(form.desconto ?? "").replace(",", "."));
    const total = sum - (Number.isFinite(desc) ? desc : 0);
    return money(total);
  }, [form.pecasIds, form.desconto, pecaById]);

  const totalPreviewNumber = useMemo(() => {
    const sum = (form.pecasIds || []).reduce((acc, id) => {
      const p = pecaById.get(id);
      const n = Number(String(p?.valorAluguel ?? "").replace(",", "."));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const desc = Number(String(form.desconto ?? "").replace(",", "."));
    return sum - (Number.isFinite(desc) ? desc : 0);
  }, [form.pecasIds, form.desconto, pecaById]);

  function handlePrintContrato() {
    const cliente = clienteById.get(form.clienteId);
    const pecasSelecionadas = (form.pecasIds || []).map((id) => pecaById.get(id)).filter(Boolean);
    const html = buildPrintableContratoHtml({
      empresa,
      cliente,
      contrato: form,
      pecasSelecionadas,
      total: totalPreviewNumber,
    });

    // Imprime sem abrir nova página: usa iframe oculto + srcdoc.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "contrato-print");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        // ignore
      }
    };

    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (!w) {
        cleanup();
        alert("Não foi possível abrir o modo de impressão.");
        return;
      }
      // Pequeno delay para garantir layout/fontes.
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } finally {
          // Remove depois para não acumular iframes.
          setTimeout(cleanup, 1000);
        }
      }, 150);
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = html;
  }

  async function handleDownloadContratoPdf() {
    if (!form.clienteId) {
      alert("Selecione um cliente antes de gerar o PDF.");
      return;
    }

    const cliente = clienteById.get(form.clienteId);
    const pecasSelecionadas = (form.pecasIds || []).map((id) => pecaById.get(id)).filter(Boolean);
    const html = buildPrintableContratoHtml({
      empresa,
      cliente,
      contrato: form,
      pecasSelecionadas,
      total: totalPreviewNumber,
    });

    const { css, body } = extractStyleAndBodyFromHtml(html);

    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-contrato-pdf", "1");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.background = "#ffffff";
    container.innerHTML = body;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Força 1 página: escala para caber no A4 mantendo proporção.
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;
      let imgW = availW;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > availH) {
        imgH = availH;
        imgW = (canvas.width * imgH) / canvas.height;
      }
      const x = (pageWidth - imgW) / 2;
      const y = margin;
      pdf.addImage(imgData, "PNG", x, y, imgW, imgH);

      const codigo = String(form.codigo || "").trim();
      pdf.save(codigo ? `contrato-${codigo}.pdf` : "contrato.pdf");
    } finally {
      container.remove();
      styleEl.remove();
    }
  }

  const pecasFilteredByCode = useMemo(() => {
    const q = String(pecaSearch || "").trim().toLowerCase();
    if (!q) return pecas.items;
    return pecas.items.filter((p) => String(p?.codigo || "").toLowerCase().includes(q));
  }, [pecas.items, pecaSearch]);

  function pecaEffectiveStatus(p) {
    const base = normalizePecaBaseStatus(p?.status);
    if (base === "Manutencao" || base === "Inativa") return base;
    if (pecasReservadas.has(p?.id)) return "Alugada";
    return "Disponivel";
  }

  function removePeca(id) {
    setForm((f) => ({ ...f, pecasIds: (f.pecasIds || []).filter((x) => x !== id) }));
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY, codigo: nextContratoCodigo });
    setPecaSearch("");
    setClienteSearch("");
    setOpen(true);
  }

  function startClienteCreate() {
    setClienteForm(CLIENTE_EMPTY);
    setClienteOpen(true);
  }

  function handleClienteChange(e) {
    const { name, value } = e.target;
    let next = value;
    if (name === "cpf") next = maskCpfCnpj(value);
    if (name === "telefone") next = maskPhoneBR(value);
    if (name === "cep") next = maskCep(value);
    setClienteForm((f) => ({ ...f, [name]: next }));
  }

  function handleClienteSubmit(e) {
    e.preventDefault();

    const payload = {
      nome: String(clienteForm.nome ?? "").trim(),
      cpf: String(clienteForm.cpf ?? "").trim(),
      nascimento: String(clienteForm.nascimento ?? "").trim(),
      telefone: String(clienteForm.telefone ?? "").trim(),
      endereco: String(clienteForm.endereco ?? "").trim(),
      cep: String(clienteForm.cep ?? "").trim(),
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
    const cpfExists = clientes.items.some((c) => onlyDigits(c.cpf) === cpfDigits);
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

    const created = clientes.create(payload);
    setForm((f) => ({ ...f, clienteId: created.id }));
    setClienteOpen(false);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo || "",
      clienteId: item.clienteId || "",
      evento: item.evento || "",
      dataEvento: item.dataEvento || "",
      retirada: item.retirada || "",
      devolucao: item.devolucao || "",
      pecasIds: Array.isArray(item.pecasIds) ? item.pecasIds : [],
      desconto: item.desconto ?? "",
      status: item.status || "Pendente",
      observacoes: item.observacoes || "",
    });
    setPecaSearch("");
    setClienteSearch("");
    setOpen(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const next = name === "desconto" ? maskMoneyBR(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  }

  function togglePeca(id) {
    setForm((f) => {
      const cur = new Set(f.pecasIds || []);
      if (cur.has(id)) {
        cur.delete(id);
        return { ...f, pecasIds: Array.from(cur) };
      }

      const p = pecaById.get(id);
      const st = pecaEffectiveStatus(p);
      if (st !== "Disponivel") {
        alert(`Peça indisponível (${pecaStatusLabel(st)}).`);
        return f;
      }

      cur.add(id);
      return { ...f, pecasIds: Array.from(cur) };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const codigoTyped = String(form.codigo ?? "").trim();
    const codigoExisting = editingId ? String(crud.getById(editingId)?.codigo || "").trim() : "";
    const codigo = codigoTyped || codigoExisting || nextContratoCodigo;

    if (!String(form.clienteId || "").trim()) {
      alert("Selecione um cliente.");
      return;
    }
    const pecasIds = Array.isArray(form.pecasIds) ? form.pecasIds : [];
    if (pecasIds.length === 0) {
      alert("Selecione pelo menos 1 peça.");
      return;
    }

    const retirada = String(form.retirada ?? "").trim();
    const devolucao = String(form.devolucao ?? "").trim();
    if (retirada && devolucao && retirada > devolucao) {
      alert("A data de devolução não pode ser menor que a retirada.");
      return;
    }

    const descontoNum = Number(String(form.desconto ?? "").replace(",", "."));
    if (String(form.desconto ?? "").trim() && (!Number.isFinite(descontoNum) || descontoNum < 0)) {
      alert("Desconto inválido.");
      return;
    }
    const subtotal = (pecasIds || []).reduce((acc, id) => {
      const p = pecaById.get(id);
      const n = Number(String(p?.valorAluguel ?? "").replace(",", "."));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    if (Number.isFinite(descontoNum) && descontoNum > subtotal) {
      alert("O desconto não pode ser maior que o valor das peças.");
      return;
    }

    if ((form.status === "Ativo" || form.status === "Finalizado") && (!retirada || !devolucao)) {
      alert("Para status Ativo/Finalizado, informe retirada e devolução.");
      return;
    }

    const payload = {
      ...form,
      codigo,
      pecasIds,
      desconto: String(form.desconto ?? "").trim(),
    };
    if (editingId) crud.update(editingId, payload);
    else crud.create(payload);
    setPecaSearchOpen(false);
    setOpen(false);
  }

  function handleRemove(id) {
    const ok = confirm("Cancelar/excluir este contrato?");
    if (!ok) return;
    crud.remove(id);
  }

  function contratoTotal(ct) {
    const sum = (ct.pecasIds || []).reduce((acc, id) => {
      const p = pecaById.get(id);
      const n = Number(String(p?.valorAluguel ?? "").replace(",", "."));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const desc = Number(String(ct.desconto ?? "").replace(",", "."));
    const total = sum - (Number.isFinite(desc) ? desc : 0);
    return money(total);
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">Contratos</h1>
          <p className="text-gray-500 text-sm">Criação e controle de locações</p>
        </div>
        <button onClick={startCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full md:w-auto">
          + Novo Contrato
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar por código, cliente, evento, status..."
            className="border rounded-lg px-3 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="text-sm text-gray-500">{filtered.length} registro(s)</div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold">Evento</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Peças</th>
                <th className="px-3 py-2 text-left font-semibold">Valor</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ct) => {
                const cli = clienteById.get(ct.clienteId);
                return (
                  <tr key={ct.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-semibold text-gray-800">{ct.codigo || "-"}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{cli?.nome || "(Cliente)"}</td>
                    <td className="px-3 py-2">{ct.evento || "-"}</td>
                    <td className="px-3 py-2">{formatDate(ct.dataEvento)}</td>
                    <td className="px-3 py-2">{(ct.pecasIds || []).length}</td>
                    <td className="px-3 py-2">{contratoTotal(ct)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(ct.status)}`}>{ct.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-3">
                        <button className="text-indigo-700 hover:underline" onClick={() => startEdit(ct)}>Ver / Editar</button>
                        <button className="text-red-700 hover:underline" onClick={() => handleRemove(ct.id)}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">Nenhum contrato encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((ct) => {
            const cli = clienteById.get(ct.clienteId);
            return (
              <div key={ct.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-800">{cli?.nome || "(Cliente)"}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(ct.status)}`}>{ct.status}</span>
                </div>
                <div className="text-sm text-gray-600">Código: {ct.codigo || "-"}</div>
                <div className="text-sm text-gray-600">Evento: {ct.evento || "-"}</div>
                <div className="text-sm text-gray-600">Data: {formatDate(ct.dataEvento)}</div>
                <div className="text-sm text-gray-600">Peças: {(ct.pecasIds || []).length}</div>
                <div className="text-sm text-gray-600">Valor: {contratoTotal(ct)}</div>
                <div className="flex gap-4 mt-2">
                  <button className="text-indigo-700 font-medium" onClick={() => startEdit(ct)}>Ver / Editar</button>
                  <button className="text-red-700 font-medium" onClick={() => handleRemove(ct.id)}>Cancelar</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-center text-gray-500 py-6">Nenhum contrato encontrado</div>}
        </div>
      </div>

      <Modal
        open={open}
        title={editingId ? "Contrato (editar)" : "Novo Contrato"}
        onClose={() => {
          setPecaSearchOpen(false);
          setOpen(false);
        }}
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-white border hover:bg-gray-50 inline-flex items-center gap-2"
              onClick={handlePrintContrato}
              title="Imprimir contrato"
            >
              <FiPrinter />
              Imprimir
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-2"
              onClick={handleDownloadContratoPdf}
              title="Baixar contrato em PDF"
            >
              <FiDownload />
              Baixar PDF
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={() => {
                setPecaSearchOpen(false);
                setOpen(false);
              }}
            >
              Fechar
            </button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => document.getElementById("contrato-form")?.requestSubmit()}>Salvar</button>
          </div>
        }
      >
        <form id="contrato-form" className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Código do Contrato</label>
            <input
              name="codigo"
              value={form.codigo}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder={nextContratoCodigo}
            />
            <p className="text-xs text-gray-500 mt-1">Se deixar vazio, o sistema gera automaticamente.</p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-end justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                onClick={startClienteCreate}
              >
                + Novo cliente
              </button>
            </div>

            <div className="mt-2">
              <input
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Pesquisar cliente por nome, CPF/CNPJ, telefone..."
              />
              <div className="text-xs text-gray-500 mt-1">
                Mostrando {clientesFiltered.length} de {clientes.items.length} cliente(s)
              </div>
            </div>

            <select name="clienteId" value={form.clienteId} onChange={handleChange} required className="border rounded-lg px-3 py-2 w-full">
              <option value="">Selecione...</option>
              {(() => {
                const selected = form.clienteId ? clienteById.get(form.clienteId) : null;
                const selectedMissing = !!selected && !clientesFiltered.some((c) => c.id === selected.id);
                return (
                  <>
                    {selectedMissing && <option value={selected.id}>{selected.nome} (selecionado)</option>}
                    {clientesFiltered.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </>
                );
              })()}
            </select>
            {clientes.items.length === 0 && <p className="text-xs text-gray-500 mt-1">Cadastre clientes primeiro em Clientes.</p>}
            {clientes.items.length > 0 && clientesFiltered.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">Nenhum cliente encontrado para essa pesquisa.</p>
            )}
            {form.clienteId && (() => {
              const cli = clienteById.get(form.clienteId);
              if (!cli) return null;
              return (
                <div className="mt-2 text-sm text-gray-600">
                  <div><span className="font-medium text-gray-700">CPF/CNPJ:</span> {cli.cpf || "-"} • <span className="font-medium text-gray-700">Tel:</span> {cli.telefone || "-"}</div>
                  <div className="truncate"><span className="font-medium text-gray-700">Endereço:</span> {cli.endereco || "-"}</div>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evento</label>
            <input name="evento" value={form.evento} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Casamento, Formatura..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full">
              <option>Pendente</option>
              <option>Ativo</option>
              <option>Finalizado</option>
              <option>Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data do Evento</label>
            <input name="dataEvento" value={form.dataEvento} onChange={handleChange} type="date" className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Retirada</label>
            <input name="retirada" value={form.retirada} onChange={handleChange} type="date" className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Devolução</label>
            <input name="devolucao" value={form.devolucao} onChange={handleChange} type="date" className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Desconto (R$)</label>
            <input name="desconto" value={form.desconto} onChange={handleChange} className="border rounded-lg px-3 py-2 w-full" placeholder="0" />
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="block text-sm font-medium text-gray-700">Peças</label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={pecaSearch}
                    onChange={(e) => setPecaSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const q = String(pecaSearch || "").trim().toLowerCase();
                      if (!q) {
                        setPecaSearchOpen(true);
                        return;
                      }
                      const exact = pecas.items.find((p) => String(p?.codigo || "").trim().toLowerCase() === q);
                      if (exact) {
                        togglePeca(exact.id);
                        setPecaSearch("");
                        return;
                      }
                      setPecaSearchOpen(true);
                    }}
                    className="border rounded-lg px-3 py-2 w-44 sm:w-52"
                    placeholder="Código da peça"
                  />
                  <button
                    type="button"
                    onClick={() => setPecaSearchOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    title="Pesquisar por código"
                  >
                    <FiSearch />
                    <span className="hidden sm:inline">Buscar</span>
                  </button>
                </div>
                <div className="text-sm text-gray-500">Total (prévia): {totalPreview}</div>
              </div>
            </div>

            {(form.pecasIds || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.pecasIds || []).map((id) => {
                  const p = pecaById.get(id);
                  const label = p ? `${p.codigo} • ${p.tipo}${p.tamanho ? ` (${p.tamanho})` : ""}` : id;
                  return (
                    <span key={id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-sm">
                      {label}
                      <button type="button" className="text-indigo-700 hover:text-indigo-900" onClick={() => removePeca(id)} aria-label="Remover peça">
                        <FiX />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="border rounded-lg p-3 max-h-52 overflow-auto">
              {pecas.items.length === 0 && <div className="text-sm text-gray-500">Cadastre peças primeiro em Peças.</div>}
              {pecas.items.map((p) => (
                <label key={p.id} className="flex items-center gap-3 py-1">
                  <input type="checkbox" checked={(form.pecasIds || []).includes(p.id)} onChange={() => togglePeca(p.id)} />
                  <span className="text-sm text-gray-800">{p.codigo} • {p.tipo}{p.tamanho ? ` (${p.tamanho})` : ""}</span>
                  <span className="text-xs text-gray-500 ml-auto">{p.valorAluguel ? money(p.valorAluguel) : "-"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <button className="hidden" type="submit">Salvar</button>
        </form>
      </Modal>

      <Modal
        open={clienteOpen}
        title="Novo Cliente"
        onClose={() => setClienteOpen(false)}
        footer={
          <div className="flex gap-3 justify-end">
            <button type="button" className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => setClienteOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => document.getElementById("cliente-quick-form")?.requestSubmit()}
            >
              Salvar cliente
            </button>
          </div>
        }
      >
        <form id="cliente-quick-form" className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleClienteSubmit}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input name="nome" value={clienteForm.nome} onChange={handleClienteChange} required className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input
              name="cpf"
              value={clienteForm.cpf}
              onChange={handleClienteChange}
              required
              inputMode="numeric"
              pattern="[0-9.\-\/ ]{11,25}"
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nascimento</label>
            <input name="nascimento" value={clienteForm.nascimento} onChange={handleClienteChange} type="date" className="border rounded-lg px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input name="telefone" value={clienteForm.telefone} onChange={handleClienteChange} className="border rounded-lg px-3 py-2 w-full" placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CEP</label>
            <input name="cep" value={clienteForm.cep} onChange={handleClienteChange} className="border rounded-lg px-3 py-2 w-full" placeholder="00000-000" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Endereço</label>
            <input name="endereco" value={clienteForm.endereco} onChange={handleClienteChange} className="border rounded-lg px-3 py-2 w-full" placeholder="Rua, número, bairro" />
          </div>
          <button className="hidden" type="submit">Salvar</button>
        </form>
      </Modal>

      <Modal
        open={pecaSearchOpen}
        title="Pesquisar peça por código"
        onClose={() => setPecaSearchOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-500">{pecasFilteredByCode.length} resultado(s)</div>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPecaSearchOpen(false)}>
              Fechar
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <input
            value={pecaSearch}
            onChange={(e) => setPecaSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Digite o código (ex: 001)"
          />

          <div className="border rounded-xl overflow-hidden">
            {pecas.items.length === 0 && <div className="p-4 text-sm text-gray-500">Cadastre peças primeiro em Peças.</div>}
            {pecas.items.length > 0 && pecasFilteredByCode.length === 0 && (
              <div className="p-4 text-sm text-gray-500">Nenhuma peça encontrada para este código.</div>
            )}
            {pecasFilteredByCode.map((p) => {
              const selected = (form.pecasIds || []).includes(p.id);
              const st = pecaEffectiveStatus(p);
              const canSelect = selected || st === "Disponivel";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePeca(p.id)}
                  disabled={!canSelect}
                  className={
                    `w-full text-left p-3 border-b last:border-b-0 ` +
                    (canSelect ? "hover:bg-indigo-50 " : "opacity-60 cursor-not-allowed ") +
                    (selected ? "bg-indigo-50" : "bg-white")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{p.codigo} • {p.tipo}{p.tamanho ? ` (${p.tamanho})` : ""}</div>
                      <div className="text-sm text-gray-600 truncate">{p.descricao || ""}</div>
                      <div className="text-xs text-gray-500">{p.valorAluguel ? money(p.valorAluguel) : "-"}</div>
                    </div>
                    {selected ? (
                      <div className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Selecionada</div>
                    ) : st === "Disponivel" ? (
                      <div className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700">Selecionar</div>
                    ) : (
                      <div className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">{pecaStatusLabel(st)}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}