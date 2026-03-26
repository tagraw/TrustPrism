import { useState, useEffect } from "react";
import "./Tickets.css";

const API = "http://localhost:5000";

export default function TicketCreate({ onClose, onCreated, prefilledGameId }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [gameId, setGameId] = useState(prefilledGameId || "");
    const [priority, setPriority] = useState("medium");
    const [category, setCategory] = useState("other");
    const [games, setGames] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    
    useEffect(() => {
        // Fetch games for the dropdown
        async function fetchGames() {
            try {
                const role = localStorage.getItem("role");
                const endpoint = role === "admin" ? "/admin/games" : "/projects";
                const res = await fetch(`${API}${endpoint}`, {
      credentials: "include",
                    headers: {}
                });
                if (res.ok) {
                    const data = await res.json();
                    setGames(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Failed to fetch games:", err);
            }
        }
        if (!prefilledGameId) fetchGames();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim() || !description.trim() || !gameId) {
            setError("Please fill in all required fields.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const res = await fetch(`${API}/api/tickets`, {
      credentials: "include",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
},
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    game_id: gameId,
                    priority,
                    category
                })
            });

            if (res.ok) {
                const ticket = await res.json();
                if (onCreated) onCreated(ticket);
                onClose();
            } else {
                const errData = await res.json();
                setError(errData.error || "Failed to create ticket");
            }
        } catch (err) {
            console.error("Create ticket error:", err);
            setError("Failed to create ticket");
        }
        setSubmitting(false);
    }

    return (
        <div className="ticket-create-overlay" onClick={onClose}>
            <div className="ticket-create-modal" onClick={e => e.stopPropagation()}>
                <div className="ticket-create-header">
                    <h2>
                        <span className="material-icons-round" style={{ fontSize: "1.2rem", verticalAlign: "middle", marginRight: "6px", color: "#0ea5e9" }}>
                            confirmation_number
                        </span>
                        Create New Ticket
                    </h2>
                    <button className="ticket-detail-close material-icons-round" onClick={onClose}>close</button>
                </div>

                <form className="ticket-create-form" onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px",
                            padding: "8px 12px", color: "#dc2626", fontSize: "0.85rem"
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="ticket-form-group">
                        <label>Title *</label>
                        <input
                            type="text"
                            placeholder="Brief summary of the issue"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="ticket-form-group">
                        <label>Description *</label>
                        <textarea
                            placeholder="Describe the issue in detail..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    {!prefilledGameId && (
                        <div className="ticket-form-group">
                            <label>Study *</label>
                            <select value={gameId} onChange={e => setGameId(e.target.value)} required>
                                <option value="">Select a study...</option>
                                {games.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="ticket-form-row">
                        <div className="ticket-form-group">
                            <label>Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value)}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div className="ticket-form-group">
                            <label>Category</label>
                            <select value={category} onChange={e => setCategory(e.target.value)}>
                                <option value="bug">Bug</option>
                                <option value="feature_request">Feature Request</option>
                                <option value="data_issue">Data Issue</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="ticket-create-actions">
                        <button type="button" className="ticket-cancel-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="ticket-submit-btn" disabled={submitting}>
                            <span className="material-icons-round" style={{ fontSize: "18px" }}>
                                {submitting ? "hourglass_empty" : "add_circle"}
                            </span>
                            {submitting ? "Creating..." : "Create Ticket"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
