import { useState, useEffect } from "react";
import GroupModal from "../../components/GroupModal";

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

  if (loading) return <div className="p-8">Loading groups...</div>;

  return (
    <main className="researcher-main">
      <header className="researcher-topbar">
        <h1>Research Groups</h1>

        <div className="topbar-actions">
          <input
            className="search-input"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="create-btn" onClick={handleCreateGroup}>
            <span className="material-icons-round">add</span>
            Create New Group
          </button>
        </div>
      </header>

      <section className="groups-section">
        <div className="groups-header">
          <div>
            <h2>Your Research Groups</h2>
            <p>Manage active cohorts and collaborate with other researchers.</p>
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <p className="empty-state">
            {searchQuery ? "No groups match your search." : "You have not created or joined any research groups yet."}
          </p>
        ) : (
          <div className="groups-grid">
            {filteredGroups.map((g) => (
              <div key={g.id} className="group-card">
                <div className="group-icon">
                  <span className="material-icons-round">groups</span>
                </div>

                <span className="status active">ACTIVE</span>

                <h3>{g.name}</h3>
                <p className="group-id">ID: {g.id}</p>
                <p className="description">{g.description || "No description"}</p>

                <div className="group-footer">
                  <button className="manage-btn" onClick={() => setSelectedGroup(g)}>View Details</button>
                  <button className="manage-btn secondary" onClick={() => setSelectedGroup(g)}>Invite</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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