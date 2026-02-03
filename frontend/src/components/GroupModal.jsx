import { useState, useEffect } from "react";

export default function GroupModal({ group, onClose, onViewProject }) {
    const [activeTab, setActiveTab] = useState("members"); // members, projects
    const [details, setDetails] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");

    useEffect(() => {
        if (!group) return;
        fetchGroupData();
    }, [group]);

    async function fetchGroupData() {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Parallel fetch
            const [detailsRes, projectsRes] = await Promise.all([
                fetch(`http://localhost:5000/groups/${group.id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`http://localhost:5000/groups/${group.id}/games`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (detailsRes.ok) setDetails(await detailsRes.json());
            if (projectsRes.ok) setProjects(await projectsRes.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function sendInvite() {
        if (!inviteEmail) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/groups/${group.id}/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email: inviteEmail })
            });
            if (res.ok) {
                alert(`Invitation sent to ${inviteEmail}`);
                setInviteEmail("");
            }
        } catch (e) {
            alert("Failed to send invite");
        }
    }

    if (!group) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{group.name}</h2>
                    <button className="close-btn material-icons-round" onClick={onClose}>close</button>
                </header>

                <div className="modal-body">
                    <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <button
                            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                            onClick={() => setActiveTab('members')}
                            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'members' ? '2px solid #3b82f6' : 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Members
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                            onClick={() => setActiveTab('projects')}
                            style={{ padding: '10px 20px', border: 'none', background: 'none', borderBottom: activeTab === 'projects' ? '2px solid #3b82f6' : 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Projects
                        </button>
                    </div>

                    {loading ? <p>Loading group data...</p> : (
                        <>
                            {activeTab === 'members' && (
                                <div className="members-view">
                                    <p>{details?.description || group.description}</p>

                                    <div className="invite-box" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                                        <input
                                            placeholder="Enter email to invite..."
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                        />
                                        <button className="primary-btn" onClick={sendInvite}>Invite</button>
                                    </div>

                                    <h3>Members</h3>
                                    <ul className="members-list" style={{ listStyle: 'none', padding: 0 }}>
                                        {details?.members?.map(m => (
                                            <li key={m.id} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <strong>{m.first_name} {m.last_name}</strong>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.email}</div>
                                                </div>
                                                <span className={`badge ${m.role === 'owner' ? 'published' : 'draft'}`} style={{ fontSize: '0.7rem' }}>
                                                    {m.role}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {activeTab === 'projects' && (
                                <div className="group-projects-view">
                                    {projects.length === 0 ? <p>No projects in this group yet.</p> : (
                                        <ul className="project-list">
                                            {projects.map(p => (
                                                <li key={p.id} className="project-list-item" onClick={() => onViewProject(p)} style={{ cursor: 'pointer' }}>
                                                    <strong>{p.name}</strong>
                                                    <span className={`badge ${p.status || 'draft'}`}>{p.status || 'draft'}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
