import { useState } from "react";
import { register } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.png";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    dob: "",
    password: "",
    groupId: "",
    createGroupName: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!termsAccepted) {
      setError("You must accept the Terms and Conditions to register.");
      return;
    }

    try {
      const res = await register({
        ...form,
        role,
        terms_accepted: true,
      });

      // Save auth status locally
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("role", role); // store role locally

      // Redirect based on role
      if (role === "researcher") {
        navigate("/researcher");
      } else if (role === "user") {
        navigate("/user");
      }
      // Optional message
      if (res.createdGroup) {
        setMessage(`Account created. New Group ID: ${res.createdGroup}`);
      } else {
        setMessage("Account created successfully");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="register-page fade-in-wrapper">
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
      {/* Main */}
      <main className="register-container">
        <div className="register-card">
          <h2>Create your account</h2>

          <form onSubmit={submit}>
            <div className="row">
              <div className="field">
                <label>First name</label>
                <input
                  name="first_name"
                  placeholder="John"
                  onChange={update}
                  required
                />
              </div>

              <div className="field">
                <label>Last name</label>
                <input
                  name="last_name"
                  placeholder="Doe"
                  onChange={update}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Email address</label>
              <input
                name="email"
                placeholder="john.doe@example.com"
                onChange={update}
                required
              />
            </div>


            <div className="field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                onChange={update}
                required
              />
            </div>

            <div className="role-toggle">
              <button
                type="button"
                className={role === "user" ? "active" : ""}
                onClick={() => setRole("user")}
              >
                <span className="material-icons-round">person_outline</span>
                Participant
              </button>
              <button
                type="button"
                className={role === "researcher" ? "active" : ""}
                onClick={() => setRole("researcher")}
              >
                <span className="material-icons-round">science</span>
                Researcher
              </button>
            </div>


            {role === "user" && (
              <div className="field">
                <label>Date of birth</label>
                <input type="date" name="dob" onChange={update} required />
              </div>
            )}

            {role === "researcher" && (
              <>
                <div className="field">
                  <label>Join Group ID (optional)</label>
                  <input
                    name="groupId"
                    placeholder="e.g. TP-48291"
                    onChange={update}
                  />
                </div>

                <div className="field">
                  <label>Create new group</label>
                  <input
                    name="createGroupName"
                    placeholder="Trust & AI Lab"
                    onChange={update}
                  />
                </div>
              </>
            )}

            {/* Terms & Conditions Checkbox */}
            <div className="terms-row">
              <label className="terms-label">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="terms-link"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms and Conditions
                  </button>
                </span>
              </label>
            </div>

            <button
              className="primary-btn"
              type="submit"
              disabled={!termsAccepted}
              style={{ opacity: termsAccepted ? 1 : 0.5, cursor: termsAccepted ? "pointer" : "not-allowed" }}
            >
              Complete Registration →
            </button>

            <p className="footer-text">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>

            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}
          </form>
        </div>
      </main>

      {/* Terms & Conditions Modal */}
      {showTerms && (
        <div className="terms-overlay" onClick={() => setShowTerms(false)}>
          <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="terms-modal-header">
              <div className="terms-modal-title">
                <span className="material-icons-round" style={{ color: "#14b8a6", fontSize: "24px" }}>gavel</span>
                <h3>Terms and Conditions</h3>
              </div>
              <button className="terms-modal-close" onClick={() => setShowTerms(false)}>
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="terms-modal-body">
              <p><strong>Last Updated:</strong> March 2026</p>

              <h4>1. Acceptance of Terms</h4>
              <p>
                By creating an account on TrustPrism, you agree to be bound by these Terms and Conditions.
                If you do not agree, you may not use the platform.
              </p>

              <h4>2. Platform Purpose</h4>
              <p>
                TrustPrism is a research platform designed to facilitate behavioral game studies involving
                trust, cooperation, and AI interaction. By participating, you contribute to scientific research
                aimed at understanding human decision-making.
              </p>

              <h4>3. User Accounts</h4>
              <p>
                You must provide accurate and complete information during registration. You are responsible
                for maintaining the confidentiality of your account credentials and for all activities
                under your account.
              </p>

              <h4>4. Data Collection & Privacy</h4>
              <p>
                We collect data related to your participation in research games, including responses,
                session data, and interaction patterns. All data is anonymized and used solely for
                research purposes. We do not sell your personal information.
              </p>

              <h4>5. Research Participation</h4>
              <p>
                Each research game may have its own consent form, which you must review and accept
                before participating. You may withdraw from any study at any time without penalty.
              </p>

              <h4>6. Acceptable Use</h4>
              <p>
                You agree not to misuse the platform, including but not limited to: submitting
                false data, attempting to manipulate research outcomes, or accessing other users' accounts.
              </p>

              <h4>7. Intellectual Property</h4>
              <p>
                All content, design, and technology on TrustPrism are the property of TrustPrism
                and its licensors. You may not reproduce, distribute, or create derivative works
                without permission.
              </p>

              <h4>8. Limitation of Liability</h4>
              <p>
                TrustPrism is provided "as is" without warranty. We are not liable for any damages
                arising from your use of the platform.
              </p>

              <h4>9. Changes to Terms</h4>
              <p>
                We may update these terms at any time. Continued use of the platform after changes
                constitutes acceptance of the updated terms.
              </p>

              <h4>10. Contact</h4>
              <p>
                For questions regarding these terms, please contact us at support@trustprism.io.
              </p>
            </div>

            <div className="terms-modal-footer">
              <button
                className="terms-accept-btn"
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTerms(false);
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>check_circle</span>
                Accept & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}