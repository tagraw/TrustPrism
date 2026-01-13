import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.png";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await axios.post("http://localhost:5000/auth/forgot-password", { email });
      setMessage("If an account exists with that email, a reset link has been sent.");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="forgot-page fade-in-wrapper">
      {/* Background glowing orbs */}
      <div className="glow blue" />
      <div className="glow teal" />
      <div className="glow yellow" />

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="header-brand">
            <img src={logo} alt="TrustPrism Logo" className="header-logo" />
            <span className="brand-name">TrustPrism</span>
          </Link>
        </div>
      </header>

      {/* Card */}
      <div className="login-card">
        <img src={logo} alt="TrustPrism" className="login-logo" />
        <h1 className="login-title">Forgot Password</h1>
        <p className="login-subtitle">Enter your email to reset your password.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="login-btn">
            Send Reset Link
          </button>

          {message && <span className="success">{message}</span>}
          {error && <span className="error-text">{error}</span>}
        </form>

        <div className="divider">
          <span>Remembered your password?</span>
        </div>

        <Link to="/login" className="secondary-btn">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
