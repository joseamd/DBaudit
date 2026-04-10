// src/components/Login.jsx
import { useState, useEffect } from "react";
import { login } from "../../services/authService";
import { FaShieldAlt } from "react-icons/fa";
import "../../styles/Login.css"; 

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(""); // tipo de error
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validación de campos vacíos
    if (!user.trim() || !pass.trim()) {
      setError("Por favor completa todos los campos");
      setErrorType("warning");
      return;
    }

    try {
      const data = await login(user, pass);

      if (!data.access) {
        throw new Error("Token inválido");
      }

      localStorage.setItem("auth_token", data.access);
      window.location.href = "/";

    } catch (e) {
      if (e.message === "NETWORK_ERROR") {
        setError("No se pudo conectar con el servidor");
        setErrorType("network");
      } else {
        setError("Usuario o contraseña incorrectos");
        setErrorType("error");
      }
    }
  };

  return (
    <div className={`login-container ${loaded ? "loaded" : ""}`}>
      {/* Columna izquierda */}
      <div className="login-left">        
        <footer className="login-left-footer">
          &copy; 2026 Alex Muñoz. Todos los derechos reservados.
        </footer>
      </div>

      {/* Columna derecha */}
      <div className="login-right">
        <div className="login-right-content">
          <div className="icon-wrapper">
            <FaShieldAlt className="login-icon" />
          </div>
          <h1 className="app-name">Bienvenido a DBaudit</h1>
        </div>
        <div className="login-form">
          <p>Inicia sesión con tu cuenta</p>

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Usuario"
              autoComplete="username"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError(""); // limpia error
                setErrorType("");
              }}
            />
            <input
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setError(""); // limpia error
                setErrorType("");
              }}
            />
            {error && (
              <p className={`error ${errorType}`}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}