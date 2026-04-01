export const login = async (username, password) => {
  const res = await fetch("http://localhost:8000/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  // CLAVE: validar respuesta
  if (!res.ok) {
    throw new Error(data.detail || "Error de autenticación");
  }

  // SOLO guardar si es válido
  localStorage.setItem("auth_token", data.access);

  return data;
};