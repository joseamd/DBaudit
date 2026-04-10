export const login = async (username, password) => {
  let res;

  try {
    res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    // Error de red
    throw new Error("NETWORK_ERROR");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.detail || "AUTH_ERROR");
  }

  return data;
};