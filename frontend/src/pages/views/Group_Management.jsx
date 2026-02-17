import { useState, useEffect } from "react";
import "../Admin.css";

const GroupManagement = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [transferModal, setTransferModal] = useState(null); // group object
    const [newOwnerId, setNewOwnerId] = useState("");
    const [researchers, setResearchers] = useState([]);

    useEffect(() => {
        fetchGroups();
        fetchResearchers(); // Need list of researchers for transfer dropdown
    }, []);

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5000/admin/groups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setGroups(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch groups", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchResearchers = async () => {
        try {
            const token = localStorage.getItem("token");
            // reusing admin users endpoint to filter for researchers manually or we could add a specific endpoint
            // fast approach: fetch all users and filter client side for 'researcher' role
            const res = await fetch("http://localhost:5000/admin/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const users = await res.json();
                setResearchers(users.filter(u => u.role === 'researcher'));
            }
        } catch (err) {
            console.error("Failed to fetch researchers", err);
        }
    };

    const handleTransfer = async () => {
        if (!newOwnerId) return alert("Please select a new owner");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:5000/admin/groups/${transferModal.id}/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ newOwnerId })
            });

            if (res.ok) {
                alert("Ownership transferred successfully");
                setTransferModal(null);
                setNewOwnerId("");
                fetchGroups();
            } else {
                const data = await res.json();
                alert(data.error || "Transfer failed");
            }
        } catch (err) {
            console.error(err);
            alert("Transfer failed");
        }
    };

    if (loading) return <div className="loading-spinner">Loading groups...</div>;

    return (
        <div className="admin-card wide">
            <div className="card-header">
                <h3>Group Management</h3>
            </div>

            <table className="user-table">
                <thead>
                    <tr>
                        <th>Group Name</th>
                        <th>Owner</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map(group => (
                        <tr key={group.id}>
                            <td>
                                <strong>{group.name}</strong>
                                <p className="subtext">{group.description}</p>
                            </td>
                            <td>{group.owner_name}</td>
                            <td>{new Date(group.created_at).toLocaleDateString()}</td>
                            <td>
                                <button
                                    className="icon-btn"
                                    onClick={() => setTransferModal(group)}
                                    title="Transfer Ownership"
                                >
                                    <span className="material-icons-round">swap_horiz</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                    {groups.length === 0 && (
                        <tr><td colSpan="4" className="text-center">No groups found</td></tr>
                    )}
                </tbody>
            </table>

            {/* Transfer Modal */}
            {transferModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Transfer Ownership: {transferModal.name}</h3>
                        <p>Select the researcher to transfer ownership to. The current owner will become a member.</p>

                        <div className="form-group">
                            <label>New Owner</label>
                            <select
                                value={newOwnerId}
                                onChange={(e) => setNewOwnerId(e.target.value)}
                            >
                                <option value="">-- Select Researcher --</option>
                                {researchers.map(r => (
                                    <option key={r.id} value={r.researcher_profile?.id || r.id}>
                                        {r.first_name} {r.last_name} ({r.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setTransferModal(null)} className="cancel-btn">Cancel</button>
                            <button onClick={handleTransfer} className="save-btn warning">
                                Transfer Ownership
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupManagement;
