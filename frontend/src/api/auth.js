const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // make sure this matches your backend

// LOGIN
export async function login({email, password}) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to login");
    }
    return res.json(); // expected: { token, role, ...userData }
  } catch (err) {
    console.error("Login error:", err);
    throw err;
  }
}

// SIGNUP
export async function register(data) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.message || "Failed to register");
    }

    return res.json(); // expected: { token, role, user, createdGroup? }
  } catch (err) {
    console.error("Register error:", err);
    throw err;
  }
}


