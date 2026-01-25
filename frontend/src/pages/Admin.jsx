import LogoutButton from "../components/LogoutButton";
import logo from "../assets/logo-removebg-preview.png";
import "./Admin.css";

export default function Admin() {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logo} alt="TrustPrism" />
          <div>
            <strong>TrustPrism</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="admin-nav">
          <a className="active">
            <span className="material-icons-round">grid_view</span>
            Overview
          </a>
          <a>
            <span className="material-icons-round">people</span>
            Users
          </a>
          <a>
            <span className="material-icons-round">checklist</span>
            Study Approvals
          </a>
          <a>
            <span className="material-icons-round">description</span>
            Reports
          </a>
          <a>
            <span className="material-icons-round">security</span>
            Security Settings
          </a>
        </nav>

        <div className="admin-footer">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <h1>System Dashboard</h1>

          <div className="topbar-actions">
            <span className="material-icons-round bell">notifications</span>
            <button className="invite-btn">
              <span className="material-icons-round">add</span>
              Invite Member
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="material-icons-round blue">groups</span>
            <p>Total Participants</p>
            <h2>12,402</h2>
            <small className="positive">+5%</small>
          </div>

          <div className="stat-card">
            <span className="material-icons-round purple">school</span>
            <p>Active Researchers</p>
            <h2>842</h2>
            <small className="positive">+2%</small>
          </div>

          <div className="stat-card">
            <span className="material-icons-round orange">hourglass_empty</span>
            <p>Pending Approvals</p>
            <h2>24</h2>
            <small className="warning">Requires Attention</small>
          </div>

          <div className="stat-card">
            <span className="material-icons-round green">check_circle</span>
            <p>System Status</p>
            <h2>Healthy</h2>
            <small>Operational</small>
          </div>
        </section>

        {/* Main Grid */}
        <section className="admin-grid">
          {/* User Management */}
          <div className="admin-card wide">
            <div className="card-header">
              <h3>User Management</h3>
              <input placeholder="Search users by name, role..." />
            </div>

            <table className="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Dr. Aris Thorne</strong>
                    <span>aris.thorne@uni-research.edu</span>
                  </td>
                  <td><span className="pill blue">Researcher</span></td>
                  <td className="verified">Verified</td>
                  <td>2 mins ago</td>
                </tr>
                <tr>
                  <td>
                    <strong>Sarah Jenkins</strong>
                    <span>s.jenkins88@email.com</span>
                  </td>
                  <td><span className="pill gray">Participant</span></td>
                  <td className="pending">Pending</td>
                  <td>14 hours ago</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Activity */}
          <div className="admin-card">
            <h3>Recent System Activity</h3>

            <ul className="activity-list">
              <li>
                <span className="dot blue" />
                Researcher Verified
                <small>12:45 PM Today</small>
              </li>
              <li>
                <span className="dot green" />
                System Backup Successful
                <small>04:00 AM Today</small>
              </li>
              <li>
                <span className="dot orange" />
                New Study Submission
                <small>4 hours ago</small>
              </li>
            </ul>
          </div>
        </section>

        {/* Study Approvals */}
        <section className="study-approvals">
          <div className="admin-card">
            <div className="card-header">
              <h3>Study Approval Requests</h3>
              <span className="subtle-text">Pending ethical and integrity review</span>
            </div>

            <div className="approval-list">
              <div className="approval-item">
                <div className="approval-info">
                  <strong>Cognitive Bias in AI Decisions</strong>
                  <span>Submitted by Dr. Aris Thorne</span>
                  <small>Risk Level: Medium • Data Type: Behavioral</small>
                </div>

                <div className="approval-actions">
                  <button className="approve-btn">Approve</button>
                  <button className="request-btn">Request Changes</button>
                </div>
              </div>

              <div className="approval-item">
                <div className="approval-info">
                  <strong>Youth Social Media Impact Study</strong>
                  <span>Submitted by Dr. Elaine Morris</span>
                  <small>Risk Level: High • Data Type: Survey</small>
                </div>

                <div className="approval-actions">
                  <button className="approve-btn">Approve</button>
                  <button className="request-btn">Request Changes</button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
