import LogoutButton from "../components/LogoutButton";
import logo from "../assets/logo-removebg-preview.png";
import "./User.css";

export default function User() {
  // Later: replace with real data from backend
  const user = {
    firstName: "Alex",
    role: "participant",
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="TrustPrism Logo" />
          <span>TrustPrism</span>
        </div>

        <nav className="sidebar-nav">
          <a className="active">
            <span className="material-icons-round">dashboard</span>
            Dashboard
          </a>
          <a>
            <span className="material-icons-round">person</span>
            My Profile
          </a>
          <a>
            <span className="material-icons-round">history</span>
            Study History
          </a>
          <a>
            <span className="material-icons-round">help_outline</span>
            Support
          </a>
        </nav>

        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="topbar">
          <h1>Participant Dashboard</h1>
          <div className="topbar-actions">
            <input
              type="text"
              placeholder="Search studies..."
              className="search-input"
            />
            <span className="material-icons-round">notifications</span>
            <span className="material-icons-round">settings</span>
          </div>
        </header>

        {/* Welcome */}
        <section className="welcome">
          <h2>Welcome back, {user.firstName}</h2>
          <p>
            Track your research activity and participate in verified scientific
            studies.
          </p>
        </section>

        {/* Activity Cards */}
        <section className="stats-grid">
          <div className="stat-card green">
            <span className="material-icons-round">check_circle</span>
            <div>
              <p>Sessions Completed</p>
              <h3>12</h3>
            </div>
          </div>

          <div className="stat-card blue">
            <span className="material-icons-round">groups</span>
            <div>
              <p>Active Studies</p>
              <h3>3</h3>
            </div>
          </div>

          <div className="stat-card yellow">
            <span className="material-icons-round">hourglass_empty</span>
            <div>
              <p>Pending Reviews</p>
              <h3>2</h3>
            </div>
          </div>
        </section>

        {/* Available Studies */}
        <section className="studies">
          <div className="section-header">
            <h3>Available Studies</h3>
            <button className="filter-btn">
              <span className="material-icons-round">filter_list</span>
              Filter
            </button>
          </div>

          <div className="study-grid">
            <div className="study-card">
              <span className="badge verified">VERIFIED</span>
              <h4>Sleep Patterns & Mental Focus</h4>
              <p>
                Investigating how circadian rhythm impacts cognitive performance.
              </p>
              <button className="primary-btn">Join Study →</button>
            </div>

            <div className="study-card">
              <span className="badge paid">PAID STUDY</span>
              <h4>Nutrition & Energy Levels</h4>
              <p>
                Observational research on diet variability and sustained energy.
              </p>
              <button className="primary-btn">Join Study →</button>
            </div>

            <div className="study-card placeholder">
              <span className="material-icons-round">search</span>
              <p>More studies coming soon</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
