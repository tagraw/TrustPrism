import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const { token, role } = await login({
        email: email.trim(),
        password: password.trim(),
      });
      


      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      // Role-based redirect
      if (role === "admin") navigate("/admin");
      if (role === "researcher") navigate("/researcher");
      if (role === "user") navigate("/user");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Login</button>
      <p>No account?</p>
      <Link to="/register">
        <button>Sign Up</button>
      </Link>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
