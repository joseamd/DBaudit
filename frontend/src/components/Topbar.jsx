import { useState, useRef, useEffect } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("Usuario");
  const ref = useRef();

  const MAX_IDLE = 10 * 60; // 10 minutos (segundos)

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("last_activity");
    window.location.href = "/";
  };

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem("auth_token");
      const now = Date.now() / 1000;

      try {
        if (!token) {
          logout();
          return;
        }

        const decoded = jwtDecode(token);

        // Expiración del token
        if (decoded.exp && decoded.exp < now) {
          logout();
          return;
        }

        // Expiración por inactividad
        const lastActivity = localStorage.getItem("last_activity");

        if (lastActivity && now - lastActivity > MAX_IDLE) {
          logout();
          return;
        }

        // Usuario válido
        setUsername(decoded.username || decoded.user || "Admin");

        // actualizar actividad
        localStorage.setItem("last_activity", now);
      } catch (e) {
        console.warn("Token inválido:", e);
        logout();
      }
    };

    // Ejecutar al cargar
    checkSession();

    // Revisar cada minuto
    const interval = setInterval(checkSession, 60 * 1000);

    // Detectar actividad
    const updateActivity = () => {
      localStorage.setItem("last_activity", Date.now() / 1000);
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("mousemove", updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("mousemove", updateActivity);
    };
  }, []);

  // Iniciales (avatar)
  const initials = username
    .split(" ")
    .map((w) => w[0])
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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      style={{
        height: 60,
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        position: "relative",
        zIndex: 50,
      }}
    >
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
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#f1f5f9")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {/* Avatar */}
          <div
            style={{
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
            }}
          >
            {initials}
          </div>

          {/* Username */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {username}
          </span>

          <ChevronDown size={14} color="#64748b" />
        </div>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 50,
              width: 180,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                fontSize: 12,
                color: "#64748b",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
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