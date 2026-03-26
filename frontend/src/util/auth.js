export const getAuthRole = () => {
  return localStorage.getItem("role");
};

export const logout = async () => {
  try {
    await fetch("http://localhost:5000/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout failed", err);
  }
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("role");
  localStorage.removeItem("token");
  window.location.href = "/login";
};

export async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json"
    }
  });
}
