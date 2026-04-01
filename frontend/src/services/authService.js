export const login = async (username, password) => {
  const res = await fetch("http://localhost:8000/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  localStorage.setItem("auth_token", data.access);
  return data;
};