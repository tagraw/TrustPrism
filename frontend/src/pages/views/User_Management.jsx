import { useState, useEffect } from "react";
import "../Admin.css"; // Reuse Admin styles
import "../../pages/Admin.css"; // Ensure styles are imported if path differs

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null); // For modals
    const [modalType, setModalType] = useState(null); // 'role' or 'access' or 'group'
    const [formData, setFormData] = useState({});
    const [scopes, setScopes] = useState({}); // For access scopes editing

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("No token found for user management");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/admin/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/users/${selectedUser.id}/role`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ role: formData.role })
            });
            if (res.ok) {
                alert("Role updated successfully");
                closeModal();
                fetchUsers();
            } else {
                alert("Failed to update role");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStatusUpdate = async (userId, newStatus) => {
        if (!window.confirm(`Are you sure you want to set this user to ${newStatus}?`)) return;
        try {
            const res = await fetch(`http://localhost:5000/admin/users/${userId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchUsers();
            } else {
                alert("Failed to update status");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleScopeUpdate = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/researchers/${selectedUser.id}/scopes`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ access_scopes: scopes })
            });
            if (res.ok) {
                alert("Scopes updated successfully");
                closeModal();
                fetchUsers();
            } else {
                alert("Failed to update scopes");
            }
        } catch (err) {
            console.error(err);
        }
    };



    const openModal = (type, user) => {
        setModalType(type);
        setSelectedUser(user);
        if (type === 'role') setFormData({ role: user.role });
        if (type === 'access') {
            // Initialize scopes from researcher_profile or default
            const currentScopes = user.researcher_profile?.access_scopes || { games: [], data: [] };
            setScopes(currentScopes);
        }
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedUser(null);
        setFormData({});
    };

    const filteredUsers = users.filter(u =>
        u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="loading-spinner">Loading users...</div>;

    return (
        <div className="admin-card wide">
            <div className="card-header">
                <h3>User Management</h3>
                <input
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                />
            </div>

            <table className="user-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Verification</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => (
                        <tr key={user.id}>
                            <td>
                                <strong>{user.first_name} {user.last_name}</strong>
                                <span>{user.email}</span>
                            </td>
                            <td>
                                <span className={`pill ${user.role === 'admin' ? 'purple' : user.role === 'researcher' ? 'blue' : 'gray'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className={user.is_verified ? "verified" : "pending"}>
                                {user.is_verified ? "Verified" : "Pending"}
                            </td>
                            <td>
                                <span className={`pill ${user.status === 'active' ? 'green' : 'red'}`}>
                                    {user.status || 'active'}
                                </span>
                            </td>
                            <td>
                                <div className="action-buttons">
                                    <button className="icon-btn" onClick={() => openModal('role', user)} title="Edit Role">
                                        <span className="material-icons-round">manage_accounts</span>
                                    </button>

                                    {user.role === 'researcher' && (
                                        <button className="icon-btn" onClick={() => openModal('access', user)} title="Access Scopes">
                                            <span className="material-icons-round">vpn_key</span>
                                        </button>
                                    )}

                                    {user.status !== 'suspended' && (
                                        <button className="icon-btn" onClick={() => handleStatusUpdate(user.id, 'suspended')} title="Suspend User">
                                            <span className="material-icons-round red-text">block</span>
                                        </button>
                                    )}

                                    {user.status === 'suspended' && (
                                        <button className="icon-btn" onClick={() => handleStatusUpdate(user.id, 'active')} title="Activate User">
                                            <span className="material-icons-round green-text">check_circle</span>
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modals */}
            {modalType && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>
                            {modalType === 'role' && 'Edit User Role'}
                            {modalType === 'access' && 'Manage Access Scopes'}
                        </h3>

                        {modalType === 'role' && (
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="researcher">Researcher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        )}

                        {modalType === 'access' && (
                            <div className="form-group">
                                <p>Manage what this researcher can access.</p>
                                <label>Raw JSON Scopes (Games/Data)</label>
                                <textarea
                                    className="code-editor"
                                    rows={5}
                                    value={JSON.stringify(scopes, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            setScopes(JSON.parse(e.target.value));
                                        } catch (err) {
                                            // allow typing
                                        }
                                    }}
                                />
                                <small>Format: &#123; "games": ["*"], "data": ["*"] &#125;</small>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button onClick={closeModal} className="cancel-btn">Cancel</button>
                            <button
                                onClick={modalType === 'role' ? handleRoleUpdate : handleScopeUpdate}
                                className="save-btn"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
