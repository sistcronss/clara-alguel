function onlyDigits(v) {
  return String(v ?? "").replace(/\D+/g, "");
}

export function maskCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (!d) return "";
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export function maskCnpj(value) {
  const d = onlyDigits(value).slice(0, 14);
  if (!d) return "";
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `/${p4}`;
  if (p5) out += `-${p5}`;
  return out;
}

export function maskCep(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (!d) return "";
  const p1 = d.slice(0, 5);
  const p2 = d.slice(5, 8);
  return p2 ? `${p1}-${p2}` : p1;
}

export function maskPhoneBR(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;

  const ddd = d.slice(0, 2);
  const rest = d.slice(2);

  if (rest.length <= 4) return `(${ddd}) ${rest}`;

  // 10 dígitos total => (DD) NNNN-NNNN
  if (d.length <= 10) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4, 8);
    return p2 ? `(${ddd}) ${p1}-${p2}` : `(${ddd}) ${p1}`;
  }

  // 11 dígitos total => (DD) NNNNN-NNNN
  const p1 = rest.slice(0, 5);
  const p2 = rest.slice(5, 9);
  return p2 ? `(${ddd}) ${p1}-${p2}` : `(${ddd}) ${p1}`;
}

export function maskMoneyBR(value) {
  let s = String(value ?? "");
  s = s.replace(/[^\d.,]/g, "");
  s = s.replace(/\./g, ",");

  // mantém só a primeira vírgula
  const firstComma = s.indexOf(",");
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }

  const [intRaw, decRaw] = s.split(",");
  const intPart = (intRaw || "").replace(/\D/g, "");
  const decPart = (decRaw || "").replace(/\D/g, "").slice(0, 2);

  if (!intPart && !decPart) return "";
  if (firstComma !== -1) {
    return `${intPart || "0"},${decPart}`;
  }
  return intPart;
}
