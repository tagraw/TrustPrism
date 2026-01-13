import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo-removebg-preview.png";
import "./VerifyEmail.css";

export default function VerifyEmail() {
  const hasCalledProvider = useRef(false);
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hasCalledProvider.current) return;
    hasCalledProvider.current = true;

    const verify = async () => {
      const token = searchParams.get("token");
      try {
        const response = await axios.get(
          `http://localhost:5000/auth/verify-email?token=${token}`
        );
        setStatus("success");
        setMessage(response.data.message);
      } catch (err) {
        const errorMessage = err.response?.data?.error || "";
        
        // If the error contains "already used", assume the update worked on a previous attempt
        if (errorMessage.toLowerCase().includes("already used") || 
            errorMessage.toLowerCase().includes("already verified")) {
          setStatus("success");
          setMessage("Email verified! You can now log in.");
        } else {
          setStatus("error");
          setMessage(errorMessage || "Verification failed.");
        }
}
    };
    verify();
  }, [searchParams]);

  return (
    <div className="verify-page fade-in-wrapper">
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

      {/* Card */}
      <div className="verify-card">
        <img src={logo} alt="TrustPrism" className="verify-logo" />
        {status === "verifying" && <h2 className="verify-title">Verifying your email...</h2>}

        {status === "success" && (
          <>
            <h2 className="verify-success">✅ Email Verified!</h2>
            <p className="verify-message">{message}</p>
            <Link to="/login" className="primary-btn">
              Go to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h2 className="verify-error">❌ Verification Failed</h2>
            <p className="verify-message">{message}</p>
            <Link to="/register" className="secondary-btn">
              Try Registering Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
