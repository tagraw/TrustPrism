import { useState, useContext } from "react";
import { login } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import { validateLogin } from "../util/validators";
import AuthContext from "../context/AuthContext.jsx";
import logo from "../assets/logo-removebg-preview.png";
import "./Login.css";

export default function Login() {
  const { setAuth } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

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
      setAuth({ token, role });

      if (role === "admin") navigate("/admin");
      else if (role === "researcher") navigate("/researcher");
      else navigate("/user");
    } catch (err) {
      setErrors({ server: err.message });
    }
  }

  return (
    <div className="login-page fade-in-wrapper">
      
      {/* Background glow */}
      <div className="glow blue" />
      <div className="glow teal" />
      <div className="glow yellow" />
          
       <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="header-brand">
            <img
              src={logo}
              alt="TrustPrism Logo"
              className="header-logo"
            />
            <span className="brand-name">TrustPrism</span>
          </Link>
        </div>
      </header>
      <div className="login-card">
        <img src={logo} alt="TrustPrism" className="login-logo" />

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Secure access for research integrity
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Email */}
          <label>Email Address</label>
          <input
            className={errors.email ? "error" : ""}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}

          {/* Password */}
          <div className="password-row">
            <label>Password</label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <input
            type="password"
            className={errors.password ? "error" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}

          {errors.server && (
            <span className="error-text">{errors.server}</span>
          )}

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        <div className="divider">
          <span>New to TrustPrism?</span>
        </div>

        <Link to="/register" className="secondary-btn">
          Create a new account
        </Link>
      </div>
    </div>
  );
}
