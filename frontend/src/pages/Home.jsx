import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import clear_logo from "../assets/logo-removebg-preview.png"
import "./Home.css";

export default function Home() {
  return (
    
    <div className="home-container fade-in-wrapper">
      <header className="site-header">
        <div className="header-inner">
          <div className="header-brand">
            <img
              src={logo}
              alt="TrustPrism Logo"
              className="header-logo"
            />
            <span className="brand-name">TrustPrism</span>
          </div>
        </div>
      </header>
      <div className="bg-glow"></div>
      
      <header className="home-header">
      
        {/* Added home-logo-spin class for the rotation */}
        <img src={clear_logo} className="home-logo home-logo-spin" alt="TrustPrism Logo" />
        <h1 className="hero-main-title">
          Welcome to <br /> <span className="gradient-text">TrustPrism</span>
        </h1>
      </header>

      <main className="hero-section">
        <p className="hero-subtext">
          The secure, role-based platform designed for researchers and participants. Advancing scientific integrity through transparent and trusted data exchange.
        </p>
        
        <div className="cta-group">
          <Link to="/login">
            <button className="btn-primary">
              Login to Dashboard
              <span className="material-icons-round">arrow_forward</span>
            </button>
          </Link>
          <Link to="/register">
            <button className="btn-secondary">Create Account</button>
          </Link>
        </div>

        {/* --- NEW SECTION START --- */}
        <div className="features-grid">
          <div className="feature-item group">
            <div className="feature-icon icon-sky">
              <span className="material-icons-round">science</span>
            </div>
            <h3 className="feature-title">For Researchers</h3>
            <p className="feature-description">Manage studies with high-fidelity integrity protocols.</p>
          </div>

          <div className="feature-item group">
            <div className="feature-icon icon-teal">
              <span className="material-icons-round">person_outline</span>
            </div>
            <h3 className="feature-title">For Participants</h3>
            <p className="feature-description">Engage in secure research with full data sovereignty.</p>
          </div>
        </div>
        {/* --- NEW SECTION END --- */}
      </main>

      <footer className="home-footer">
        <p>© 2026 TrustPrism. Secure Infrastructure for Research.</p>
      </footer>
    </div>
  );
}