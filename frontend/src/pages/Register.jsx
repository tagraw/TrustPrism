import { useState } from "react";
import { register } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.png";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");

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

    try {
      const res = await register({
        ...form,
        role,
      });

      // Save token/role if your backend returns it
      if (res.token) localStorage.setItem("token", res.token);
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


            <button className="primary-btn" type="submit">
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
    </div>
  );
}