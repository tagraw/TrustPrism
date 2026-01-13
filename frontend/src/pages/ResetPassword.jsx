import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo-removebg-preview.png";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setMessage("Passwords do not match.");
    }

    try {
      await axios.post("http://localhost:5000/auth/reset-password", {
        token,
        newPassword: password,
      });
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Reset failed. Link may be expired.");
    }
  };

  return (
    <div className="reset-page fade-in-wrapper">
      {/* Background glow */}
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

      {/* Reset Card */}
      <div className="reset-card">
        <img src={logo} alt="TrustPrism" className="reset-logo" />
        <h1 className="reset-title">Set New Password</h1>
        <p className="reset-subtitle">
          Enter your new password below to regain access.
        </p>

        <form onSubmit={handleSubmit} className="reset-form">
          <label>New Password</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
          />

          <label>Confirm New Password</label>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit" className="login-btn">
            Update Password
          </button>
        </form>

        {message && <p className="status-message">{message}</p>}
      </div>
    </div>
  );
}
