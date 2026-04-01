// src/components/Login.jsx
import { useState, useEffect } from "react";
import { login } from "../../services/authService";
import { FaShieldAlt } from "react-icons/fa";
import "../../styles/Login.css"; 

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await login(user, pass);
      localStorage.setItem("auth_token", data.access);
      window.location.href = "/";
    } catch (e) {
      alert("Credenciales incorrectas");
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
            <input type="text" placeholder="Usuario" value={user} onChange={e => setUser(e.target.value)} />
            <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} />
            <button type="submit">Ingresar</button>
          </form>
        </div>
      </div>
    </div>
  );
}