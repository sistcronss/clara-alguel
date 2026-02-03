import { useState } from "react";

export function useEmpresa() {
  const [empresa, setEmpresa] = useState(() => {
    const saved = localStorage.getItem("empresa");
    return saved ? JSON.parse(saved) : null;
  });
  function saveEmpresa(data) {
    setEmpresa(data);
    localStorage.setItem("empresa", JSON.stringify(data));
  }
  return { empresa, saveEmpresa };
}
