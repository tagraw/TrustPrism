import { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import logo from "../assets/logo-removebg-preview.png";
import "./User.css";

import DashboardView from "./views/DashboardView";
import StudyHistoryView from "./views/StudyHistoryView";
import SettingsView from "./views/SettingsView";

export default function User() {
  const { auth } = useContext(AuthContext);
  const [activeView, setActiveView] = useState("dashboard");
  const [stats, setStats] = useState({
    firstName: "Loading...",
    sessionsCompleted: 0,
    availableGames: 0,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState("latest");


  useEffect(() => {
    if (!auth.token) return;

    fetch("http://127.0.0.1:5000/auth/profile-stats", {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, [auth.token]);

  const renderContent = () => {
    switch (activeView) {
      case "history":
        return <StudyHistoryView />;
      case "profile":
        return <SettingsView />;
      default:
        return (
          <DashboardView
            stats={stats}
            showFilter={showFilter}
            onToggleFilter={() => setShowFilter((p) => !p)}
            onSortLatest={() => {
              setSortOrder("latest");
              setShowFilter(false);
            }}
            onSortOldest={() => {
              setSortOrder("oldest");
              setShowFilter(false);
            }}
            onOpenSettings={() => setActiveView("profile")}
            token={auth.token}
          />
        );
    }
  };
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="TrustPrism Logo" />
          <span>TrustPrism</span>
        </div>

        <nav className="sidebar-nav">
          <a className={activeView === "dashboard" ? "active" : ""} onClick={() => setActiveView("dashboard")}>
            <span className="material-icons-round">dashboard</span>
            Dashboard
          </a>

          <a className={activeView === "profile" ? "active" : ""} onClick={() => setActiveView("profile")}>
            <span className="material-icons-round">person</span>
            My Profile
          </a>

          <a className={activeView === "history" ? "active" : ""} onClick={() => setActiveView("history")}>
            <span className="material-icons-round">history</span>
            Study History
          </a>
        </nav>

        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside>

      {renderContent()}
    </div>
  );
}
