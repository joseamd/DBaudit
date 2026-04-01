import { useState, useRef, useEffect } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Obtener usuario desde JWT
  const token = localStorage.getItem("auth_token");
  let username = "Usuario";

  try {
    if (token) {
      const decoded = jwtDecode(token);

      // Verificar expiración
      const now = Date.now() / 1000; // tiempo actual en segundos
      if (decoded.exp && decoded.exp < now) {
      // Token expirado: limpiar y redirigir
      localStorage.removeItem("auth_token");
      window.location.href = "/"; // vuelve a login
      } else {
      // Token válido: obtener nombre de usuario
      username = decoded.username || decoded.user || "Admin";
      }
    }
  } catch (e) {
    console.warn("Token inválido:", e);
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  }

  // Iniciales (avatar)
  const initials = username
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  };

  return (
    <div style={{
      height: 60,
      background: "#fff",
      borderBottom: "1px solid #e2e8f0",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      padding: "0 24px",
      position: "relative",
      zIndex: 50,
    }}>

      {/* User dropdown */}
      <div ref={ref} style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            padding: "6px 10px",
            borderRadius: 10,
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {/* Avatar */}
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
          }}>
            {initials}
          </div>

          {/* Username */}
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
          }}>
            {username}
          </span>

          <ChevronDown size={14} color="#64748b" />
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute",
            right: 0,
            top: 50,
            width: 180,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}>

            {/* Perfil */}
            <div style={{
              padding: "10px 14px",
              fontSize: 12,
              color: "#64748b",
              borderBottom: "1px solid #f1f5f9",
            }}>
              Sesión activa
            </div>

            <button style={itemStyle}>
              <User size={14} />
              Perfil
            </button>

            <button
              onClick={logout}
              style={{ ...itemStyle, color: "#ef4444" }}
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Estilo reutilizable
const itemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  fontSize: 13,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};