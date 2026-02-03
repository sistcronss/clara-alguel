import { useState } from "react";
import { useEmpresa } from "../hooks/useEmpresa";
import { maskCnpj, maskPhoneBR } from "../utils/masks";

function onlyDigits(v) {
  return String(v ?? "").replace(/\D+/g, "");
}

export default function Configuracao() {
  const { empresa, saveEmpresa } = useEmpresa();
  const [form, setForm] = useState({
    nome: empresa?.nome || "",
    cnpj: empresa?.cnpj || "",
    endereco: empresa?.endereco || "",
    telefone: empresa?.telefone || "",
    whatsapp: empresa?.whatsapp || "",
    email: empresa?.email || "",
    logo: empresa?.logo || null,
  });
  const [logoPreview, setLogoPreview] = useState(empresa?.logo || null);

  function handleChange(e) {
    const { name, value } = e.target;
    let next = value;
    if (name === "cnpj") next = maskCnpj(value);
    if (name === "telefone") next = maskPhoneBR(value);
    if (name === "whatsapp") next = maskPhoneBR(value);
    setForm((f) => ({ ...f, [name]: next }));
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({ ...f, logo: ev.target.result }));
      setLogoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      ...form,
      nome: String(form.nome ?? "").trim(),
      cnpj: String(form.cnpj ?? "").trim(),
      endereco: String(form.endereco ?? "").trim(),
      telefone: String(form.telefone ?? "").trim(),
      whatsapp: String(form.whatsapp ?? "").trim(),
      email: String(form.email ?? "").trim(),
    };

    if (!payload.nome) {
      alert("Informe o nome da loja.");
      return;
    }
    if (payload.cnpj && onlyDigits(payload.cnpj).length !== 14) {
      alert("CNPJ inválido. Informe 14 dígitos.");
      return;
    }
    if (payload.telefone) {
      const d = onlyDigits(payload.telefone);
      if (!(d.length === 10 || d.length === 11)) {
        alert("Telefone inválido. Informe DDD + número.");
        return;
      }
    }
    if (payload.whatsapp) {
      const d = onlyDigits(payload.whatsapp);
      if (!(d.length === 10 || d.length === 11)) {
        alert("WhatsApp inválido. Informe DDD + número.");
        return;
      }
    }

    saveEmpresa(payload);
    alert("Dados da empresa salvos!");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-indigo-700 mb-2">Cadastro da Empresa</h1>
      <div className="bg-white rounded-xl shadow p-4">
        <form className="flex flex-col gap-4 max-w-lg" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome da Loja</label>
            <input name="nome" value={form.nome} onChange={handleChange} required type="text" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Nome da loja" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CNPJ</label>
            <input name="cnpj" value={form.cnpj} onChange={handleChange} inputMode="numeric" type="text" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="CNPJ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <input name="logo" onChange={handleLogo} type="file" accept="image/*" className="border rounded px-3 py-2 w-full" />
            {logoPreview && (
              <img src={logoPreview} alt="Logo preview" className="mt-2 h-20 object-contain" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Endereço</label>
            <input name="endereco" value={form.endereco} onChange={handleChange} type="text" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Endereço" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input name="telefone" value={form.telefone} onChange={handleChange} inputMode="tel" type="text" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Telefone" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
              <input name="whatsapp" value={form.whatsapp} onChange={handleChange} inputMode="tel" type="text" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="WhatsApp" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input name="email" value={form.email} onChange={handleChange} type="email" className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="E-mail" />
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 mt-4 self-end">Salvar</button>
        </form>
      </div>
    </div>
  );
}