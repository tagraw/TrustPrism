import { useState, useEffect } from "react";
import "./GroupModal.css";

export default function GroupModal({ group, onClose, onViewProject }) {
    const [activeTab, setActiveTab] = useState("members"); // members, projects
    const [details, setDetails] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Invite State
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("Researcher (Full Access)");

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
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            if (res.ok) {
                alert(`Invitation sent to ${inviteEmail}`);
                setInviteEmail("");
            } else {
                alert("Failed to send invite");
            }
        } catch (e) {
            alert("Network error sending invite");
        }
    }

    if (!group) return null;

    const memberCount = details?.members?.length || 0;
    const projectCount = projects?.length || 0;

    return (
        <div className="gm-overlay" onClick={onClose}>
            <div className="gm-content" onClick={e => e.stopPropagation()}>
                {/* Close Button Top Right */}
                <button className="material-icons-round gm-close-abs" onClick={onClose}>close</button>

                {/* Left Side: Main Content */}
                <div className="gm-main">
                    {/* Header */}
                    <div className="gm-header">
                        <div className="gm-icon-large">
                            <span className="material-icons-round" style={{ fontSize: '2rem' }}>groups</span>
                        </div>
                        <div className="gm-header-info">
                            <h2>{group.name}</h2>
                            <p className="gm-header-desc">
                                {details?.description || group.description || "Research collective focused on human-AI interaction."}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="gm-tabs">
                        <button className={`gm-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
                            <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>people</span>
                            Members <span className="gm-badge">{loading ? '-' : memberCount}</span>
                        </button>
                        <button className={`gm-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                            <span className="material-icons-round" style={{ fontSize: '1.2rem' }}>science</span>
                            Group Studies <span className="gm-badge">{loading ? '-' : projectCount}</span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="gm-tab-content">
                        {loading && <p>Loading...</p>}

                        {!loading && activeTab === 'members' && (
                            <div className="gm-members-view">
                                <div className="gm-list-header">
                                    <span>Member</span>
                                    <div style={{ display: 'flex', gap: '3rem', marginRight: '1rem' }}>
                                        <span>Role</span>
                                        <span>Activity</span>
                                    </div>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {details?.members?.map((m, i) => (
                                        <li key={m.id} className="gm-member-row">
                                            <div className="gm-member-info">
                                                <div>
                                                    <strong style={{ display: 'block', color: '#0f172a' }}>{m.first_name} {m.last_name}</strong>
                                                    <small style={{ color: '#64748b' }}>{m.email}</small>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                                                <span className={`gm-role-badge ${m.role === 'owner' ? '' : m.role === 'researcher' ? 'researcher' : 'viewer'}`}>
                                                    {m.role || 'Member'}
                                                </span>
                                                <span style={{ fontSize: '0.85rem', color: '#64748b', minWidth: '70px', textAlign: 'right' }}>
                                                    {i === 0 ? '2 mins ago' : i === 1 ? '1 hour ago' : 'Yesterday'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                    {(!details?.members || details.members.length === 0) && <p>No members found.</p>}
                                </ul>
                            </div>
                        )}

                        {!loading && activeTab === 'projects' && (
                            <div className="gm-projects-view">
                                <div className="gm-section-title">Group Study Activity</div>
                                {projects.map(p => (
                                    <div key={p.id} className="gm-project-card" onClick={() => onViewProject(p)}>
                                        <div className="gm-proj-header">
                                            <span className={`gm-status ${p.status === 'published' ? 'active' : 'draft'}`}>
                                                {p.status || 'DRAFT'}
                                            </span>
                                            <span className="material-icons-round" style={{ fontSize: '1rem', color: '#94a3b8' }}>chat</span>
                                        </div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#0f172a' }}>{p.name}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Audit in progress</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0ea5e9' }}>View Info</span>
                                        </div>
                                    </div>
                                ))}
                                {projects.length === 0 && <p style={{ color: '#64748b' }}>No studies started yet.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Sidebar */}
                <aside className="gm-sidebar">
                    <div className="gm-sb-title">Quick Invite</div>

                    <div className="gm-input-group">
                        <label className="gm-label">Email Address</label>
                        <input
                            className="gm-input"
                            placeholder="colleague@research.edu"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                    </div>

                    <div className="gm-input-group">
                        <label className="gm-label">Assign Role</label>
                        <select
                            className="gm-select"
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value)}
                        >
                            <option>Researcher (Full Access)</option>
                            <option>Viewer (Read Only)</option>
                            <option>Admin</option>
                        </select>
                    </div>

                    <button className="gm-btn-invite" onClick={sendInvite}>Send Invitation</button>


                </aside>

            </div>
        </div>
    );
}
