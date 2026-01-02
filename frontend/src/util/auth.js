import jwtDecode from "jwt-decode";

export function getStoredUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    // token expired?
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      return null;
    }

    return {
      id: decoded.id,
      role: decoded.role,
      token
    };
  } catch {
    return null;
  }
}

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json"
    }
  });
}
