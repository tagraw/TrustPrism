import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import { validateLogin } from "../util/validators";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    // Frontend validation
    const validationErrors = validateLogin({
      email: email.trim(),
      password: password.trim(),
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const { token, role } = await login({
        email: email.trim(),
        password: password.trim(),
      });

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      // Role-based redirect
      if (role === "admin") navigate("/admin");
      else if (role === "researcher") navigate("/researcher");
      else navigate("/user");
    } catch (err) {
      setErrors({ server: err.message });
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
      {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}

      {errors.server && <p style={{ color: "red" }}>{errors.server}</p>}

      <button type="submit">Login</button>

      <p>No account?</p>
      <Link to="/register">
        <button type="button">Sign Up</button>
      </Link>
    </form>
  );
}
