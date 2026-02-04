import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { FaTachometerAlt, FaUser, FaUsers, FaTshirt, FaCalendarAlt, FaFileContract, FaChartBar, FaCog } from "react-icons/fa";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Funcionarios from "./pages/Funcionarios";
import Pecas from "./pages/Pecas";
import Agenda from "./pages/Agenda";
import Contratos from "./pages/Contratos";
import Relatorios from "./pages/Relatorios";
import Configuracao from "./pages/Configuracao";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import { useEmpresa } from "./hooks/useEmpresa";
import { useAuth } from "./hooks/useAuth";

function AppShell() {
  const auth = useAuth();
  const { empresa } = useEmpresa();
  const location = useLocation();
  const navigate = useNavigate();

  const [testMode, setTestMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const usuario = useMemo(() => {
    return auth.user ?? { nome: "Modo teste", foto: null };
  }, [auth.user]);

  const usuarioNomeCurto = useMemo(() => {
    const nome = String(usuario?.nome || "").trim();
    if (!nome) return "Usuário";
    return nome.split(/\s+/)[0];
  }, [usuario?.nome]);

  const isAdmin = auth.user?.perfil === "Administrador";

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "F2") setTestMode((v) => !v);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!showProfile) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowProfile(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showProfile]);


  const menuItems = useMemo(() => {
    const items = [
      { to: "/", label: "Início", icon: <FaTachometerAlt /> },
      { to: "/clientes", label: "Clientes", icon: <FaUser /> },
    ];

    if (testMode || isAdmin) {
      items.push({ to: "/funcionarios", label: "Funcionários", icon: <FaUsers /> });
      items.push({ to: "/pecas", label: "Peças", icon: <FaTshirt /> });
    }

    items.push(
      { to: "/agenda", label: "Agenda", icon: <FaCalendarAlt /> },
      { to: "/contratos", label: "Contratos", icon: <FaFileContract /> },
      { to: "/relatorios", label: "Relatórios", icon: <FaChartBar /> }
    );

    if (testMode || isAdmin) {
      items.push({ to: "/configuracao", label: "Configuração", icon: <FaCog /> });
    }

    return items;
  }, [isAdmin, testMode]);

  async function handleLogin(login, senha) {
    const res = await auth.login(login, senha);
    if (res?.ok) navigate("/", { replace: true });
    return res;
  }

  function doLogout() {
    auth.logout();
    setShowProfile(false);
    navigate("/login", { replace: true });
  }

  function openProfile() {
    setShowProfile(true);
  }

  const hideShell = location.pathname === "/login" && !testMode && !auth.isAuthenticated;

  if (hideShell) {
    return (
      <Routes>
        <Route path="/login" element={<Login empresa={empresa} onLogin={handleLogin} />} />
        <Route path="*" element={<Login empresa={empresa} onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside
        className={
          "bg-gradient-to-br from-indigo-900 to-indigo-700 w-64 flex-shrink-0 flex flex-col h-screen fixed inset-y-0 left-0 md:sticky md:top-0 md:inset-auto md:left-auto z-30 transition-transform duration-200 " +
          (menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
      >
        <div className="flex items-center justify-center px-4 py-2 border-b border-indigo-800">
          {empresa?.logo && <img src={empresa.logo} alt="Logo" className="h-24 w-24 md:h-40 md:w-40 object-contain" />}
        </div>

        <nav className="flex-1 overflow-y-auto flex flex-col gap-1 mt-0 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-indigo-600 text-white font-medium"
              onClick={() => {
                if (window.innerWidth < 768) setMenuOpen(false);
              }}
            >
              <span className="text-indigo-200 text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {(auth.isAuthenticated || testMode) && (
          <div className="mt-auto px-2 pb-3 pt-3 border-t border-indigo-800">
            <button
              type="button"
              className="w-full px-3 py-2 rounded bg-red-100 text-red-700 font-medium hover:bg-red-200"
              onClick={() => {
                if (window.innerWidth < 768) setMenuOpen(false);
                doLogout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {menuOpen && (
        <button className="fixed inset-0 bg-black/30 z-20 md:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="bg-white shadow flex items-center justify-between px-3 md:px-6 py-2 md:py-3 sticky top-0 z-20 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="md:hidden mr-2 bg-indigo-600 text-white p-2 rounded shadow"
              aria-label="Abrir menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-lg text-indigo-700 hidden sm:inline">Painel</span>
            {testMode && <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">MODO TESTE</span>}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {(auth.isAuthenticated || testMode) && (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-2.5 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-sm sm:text-base whitespace-nowrap"
                onClick={() => navigate("/contratos", { state: { startCreate: true } })}
              >
                <FaFileContract className="text-base sm:text-lg" />
                <span className="sm:hidden">Pedido</span>
                <span className="hidden sm:inline">Iniciar pedido</span>
              </button>
            )}

            <button className="flex items-center gap-2 px-2.5 py-2 rounded hover:bg-indigo-50 min-w-0" onClick={openProfile}>
              {usuario.foto ? (
                <img src={usuario.foto} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="bg-indigo-200 text-indigo-700 rounded-full h-8 w-8 flex items-center justify-center font-bold">{usuario.nome[0]}</span>
              )}
              <span className="font-medium text-indigo-700 truncate max-w-[9rem] hidden sm:inline">{usuario.nome}</span>
              <span className="font-medium text-indigo-700 truncate max-w-[7rem] sm:hidden">{usuarioNomeCurto}</span>
            </button>
          </div>
        </header>

        <div
          className={
            "fixed inset-0 flex items-center justify-center z-50 bg-black/40 transition-opacity duration-200 " +
            (showProfile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
          }
          role="dialog"
          aria-modal="true"
          aria-hidden={!showProfile}
          onClick={() => setShowProfile(false)}
        >
          <div
            className={
              "bg-white rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4 transition-transform duration-200 " +
              (showProfile ? "scale-100 translate-y-0" : "scale-95 translate-y-2")
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-indigo-700">Usuário</h2>

              <div className="flex items-center gap-3">
                {usuario.foto ? (
                  <img src={usuario.foto} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="bg-indigo-200 text-indigo-700 rounded-full h-12 w-12 flex items-center justify-center font-bold text-2xl">{usuario.nome[0]}</span>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{usuario.nome}</div>
                  <div className="text-sm text-gray-600">{auth.user?.cargo || auth.user?.perfil || ""}</div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                  onClick={() => setShowProfile(false)}
                >
                  Sair do perfil
                </button>
              </div>
          </div>
        </div>

        <main className="flex-1 w-full px-3 md:px-4 py-4 md:py-6">
          <div className="w-full max-w-none">
            <Routes>
              <Route path="/login" element={<Login empresa={empresa} onLogin={handleLogin} />} />
              <Route element={<PrivateRoute isAuthenticated={auth.isAuthenticated} loading={auth.loading} testMode={testMode} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route
                  path="/funcionarios"
                  element={
                    testMode || isAdmin ? (
                      <Funcionarios />
                    ) : (
                      <div className="bg-white rounded-2xl shadow p-6">
                        <h1 className="text-2xl font-bold text-indigo-700">Acesso restrito</h1>
                        <p className="text-gray-600 mt-1">Apenas administradores podem acessar o cadastro de funcionários/usuários.</p>
                      </div>
                    )
                  }
                />
                <Route
                  path="/pecas"
                  element={
                    testMode || isAdmin ? (
                      <Pecas />
                    ) : (
                      <div className="bg-white rounded-2xl shadow p-6">
                        <h1 className="text-2xl font-bold text-indigo-700">Acesso restrito</h1>
                        <p className="text-gray-600 mt-1">Apenas administradores podem acessar o cadastro de peças.</p>
                      </div>
                    )
                  }
                />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route
                  path="/configuracao"
                  element={
                    testMode || isAdmin ? (
                      <Configuracao />
                    ) : (
                      <div className="bg-white rounded-2xl shadow p-6">
                        <h1 className="text-2xl font-bold text-indigo-700">Acesso restrito</h1>
                        <p className="text-gray-600 mt-1">Apenas administradores podem acessar a configuração do sistema.</p>
                      </div>
                    )
                  }
                />
              </Route>
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
