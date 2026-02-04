import { useState, useEffect } from "react";
import GroupModal from "../../components/GroupModal";
import "./RGroups.css";

export default function RGroups({ onViewProject }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  async function fetchMyGroups() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/groups/my-groups", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateGroup = async () => {
    // Placeholder: In a real app, this would open a modal
    const name = prompt("Enter Group Name:");
    if (!name) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, description: "Created via Dashboard" })
      });

      const data = await res.json();

      if (res.ok) {
        fetchMyGroups(); // Refresh list
        alert("Group created successfully!");
      } else {
        // Handle validation errors or custom errors
        if (data.errors) {
          alert(`Failed: ${data.errors.map(e => e.msg).join(", ")}`);
        } else {
          alert(`Failed: ${data.error || "Unknown error"}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Network or server error.");
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    g.id.includes(searchQuery)
  );

  // Helper to pick a consistent icon color based on ID string
  const getIconColorClass = (id) => {
    const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ["rg-icon-blue", "rg-icon-orange", "rg-icon-green", "rg-icon-purple", "rg-icon-pink"];
    return colors[sum % colors.length];
  };

  if (loading) return <div className="p-8">Loading groups...</div>;

  return (
    <main className="rg-layout">
      {/* Header */}
      <header className="rg-header">
        <div className="rg-title">
          <h1>Research Groups</h1>
          <p>Manage active cohorts and collaborate with other researchers.</p>
        </div>
        <button className="rg-create-btn" onClick={handleCreateGroup}>
          <span className="material-icons-round">group_add</span>
          Create New Group
        </button>
      </header>

      {/* Stats Row */}
      <section className="rg-stats-row">
        <div className="rg-stat-card">
          <div>
            <div className="rg-stat-label">Total Groups</div>
            <div className="rg-stat-value">{groups.length < 10 ? `0${groups.length}` : groups.length}</div>
          </div>
        </div>
        <div className="rg-stat-card">
          <div>
            <div className="rg-stat-label">Active Collaborators</div>
            <div className="rg-stat-value">0</div>
          </div>
        </div>
      </section>

      {/* Groups Grid */}
      <section className="rg-grid">
        {/* Render filtered groups as cards */}
        {filteredGroups.map((g) => {
          // Mocking member count for visual fidelity if not present
          const memberCount = 0
          const displayCount = memberCount > 15 ? 15 : memberCount; // max for avatars logic maybe?

          return (
            <div key={g.id} className="rg-card" onClick={() => setSelectedGroup(g)}>
              <div className="rg-card-header">
                <div className={`rg-icon-wrapper ${getIconColorClass(g.id)}`}>
                  <span className="material-icons-round">
                    {/* Randomize icon slightly based on name length for variety */}
                    {g.name.length % 2 === 0 ? 'security' : g.name.length % 3 === 0 ? 'psychology' : 'groups'}
                  </span>
                </div>
                <span className="material-icons-round rg-card-menu">more_horiz</span>
              </div>

              <h3 className="rg-card-title">{g.name}</h3>
              <p className="rg-card-desc">
                {g.description || "Research group focused on human-AI interaction studies and ethical guidelines."}
              </p>

              <div className="rg-card-footer">
                <div className="rg-members">
                  <span className="material-icons-round" style={{ fontSize: '1.2rem', color: '#94a3b8' }}>people</span>
                  {memberCount} Members
                </div>
                <div className="rg-avatars">
                </div>
              </div>
            </div>
          );
        })}

        {/* 'Create New' Card as the last item in the grid */}
        <div className="rg-card-new" onClick={handleCreateGroup}>
          <div className="rg-add-circle">
            <span className="material-icons-round" style={{ fontSize: '1.8rem' }}>add</span>
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>Start a new group</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', width: '70%', textAlign: 'center' }}>
            Invite collaborators and share resources.
          </p>
        </div>
      </section>

      {/* Active Collaborators Section */}
      <section className="rg-collab-section">
        <div className="rg-collab-header">
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Collaborators</h2>
          <span className="rg-view-all">View All Directory</span>
        </div>

        <div className="rg-collab-list">

        </div>
      </section>

      {/* Group Details Modal */}
      {selectedGroup && (
        <GroupModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onViewProject={(p) => {
            setSelectedGroup(null); // Close group modal
            onViewProject(p.id); // Open project modal
          }}
        />
      )}
    </main>
  );
}