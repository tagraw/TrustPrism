import { useState, useEffect } from "react";
import { getMyGroups } from "../api/groups";
import LogoutButton from "../components/LogoutButton";

import logo from "../assets/logo-removebg-preview.png";
import "./Researcher.css";


import RCreateProj from "./views/RCreateProj";
import RDataInsights from "./views/RDataInsights";
import RSettings from "./views/RSettings";
import RDashboard from "./views/RDashboard";
import RGroups from "./views/RGroups";
import RProjectDetails from "./views/RProjectDetails";
import ProjectModal from "../components/ProjectModal";


export default function Researcher() {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null); // For page routing (insights)
  const [modalProject, setModalProject] = useState(null); // For popup modal
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await getMyGroups();
        setGroups(data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      }
    }
    fetchGroups();
  }, []);

  const openProjectModal = async (projectOrId) => {
    // If it's a string ID (from groups view), fetch the full project object
    if (typeof projectOrId === 'string') {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/projects/${projectOrId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setModalProject(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch project:", err);
      }
    } else {
      setModalProject(projectOrId);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "groups":
        return <RGroups groups={groups} onViewProject={openProjectModal} />;

      case "insights":
        return <RDataInsights initialProjectId={selectedProject} />;

      case "settings":
        return <RSettings />;

      case "create":
        return <RCreateProj onSuccess={() => setActiveView("dashboard")} />;

      case "project_details":
        return <RProjectDetails projectId={selectedProject} goBack={() => setActiveView("dashboard")} />;

      default:
        return <RDashboard
          groups={groups}
          setActiveView={setActiveView}
          onViewProject={openProjectModal}
          onViewInsights={(id) => { setSelectedProject(id); setActiveView("insights"); }}
        />;
    }
  };

  return (
    <div className="researcher-layout">
      {/* Sidebar */}
      <aside className="researcher-sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="TrustPrism" />
          <div>
            <strong>TrustPrism</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a
            className={activeView === "dashboard" ? "active" : ""}
            onClick={() => setActiveView("dashboard")}
          >
            <span className="material-icons-round">dashboard</span>
            Dashboard
          </a>

          <a
            className={activeView === "groups" ? "active" : ""}
            onClick={() => setActiveView("groups")}
          >
            <span className="material-icons-round">groups</span>
            Research Groups
          </a>

          <a
            className={activeView === "insights" ? "active" : ""}
            onClick={() => setActiveView("insights")}
          >
            <span className="material-icons-round">insights</span>
            Data Insights
          </a>

          <a
            className={activeView === "settings" ? "active" : ""}
            onClick={() => setActiveView("settings")}
          >
            <span className="material-icons-round">settings</span>
            Settings
          </a>
        </nav>


        <div className="sidebar-footer">
          <LogoutButton />
        </div>
      </aside >

      {renderContent()}

      {
        modalProject && (
          <ProjectModal
            project={modalProject}
            onClose={() => setModalProject(null)}
            onViewInsights={() => {
              setModalProject(null);
              setSelectedProject(modalProject.id);
              setActiveView("insights");
            }}
          />
        )
      }
    </div >
  );
}
