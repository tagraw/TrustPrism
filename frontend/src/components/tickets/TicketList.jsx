import { useState, useEffect, useContext, useRef } from "react";
import { io } from "socket.io-client";
import AuthContext from "../../context/AuthContext";
import "./Tickets.css";

const API = "http://localhost:5000";

export default function TicketList({ onSelectTicket, gameId, role }) {
    const { auth } = useContext(AuthContext);
    const socketRef = useRef(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterGame, setFilterGame] = useState(gameId || "");
    
    useEffect(() => {
        fetchTickets();

        // Connect socket for live ticket status updates if user is authenticated
        const userId = auth?.id;
        if (userId) {
            if (!socketRef.current) {
                socketRef.current = io(API, { transports: ["websocket", "polling"] });
                socketRef.current.emit("join_user", userId);
            }

            // Remove existing listeners to avoid duplicates if useEffect re-runs
            socketRef.current.off("ticket_status_update");
            socketRef.current.on("ticket_status_update", (data) => {
                setTickets(prev => prev.map(t => 
                    t.id === data.ticket_id ? { ...t, status: data.status } : t
                ));
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [filterStatus, filterPriority, filterGame, auth?.id]);

    async function fetchTickets() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set("status", filterStatus);
            if (filterPriority) params.set("priority", filterPriority);
            if (filterGame) params.set("game_id", filterGame);

            const res = await fetch(`${API}/api/tickets?${params}`, {
      credentials: "include",
                headers: {}
            });
            if (res.ok) setTickets(await res.json());
        } catch (err) {
            console.error("Failed to fetch tickets:", err);
        }
        setLoading(false);
    }

    function formatDate(dateStr) {
        if (!dateStr) return "—";
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function formatCategory(cat) {
        return (cat || "other").replace(/_/g, " ");
    }

    // Compute stats
    const openCount = tickets.filter(t => t.status === "open").length;
    const inProgressCount = tickets.filter(t => t.status === "in_progress").length;
    const resolvedCount = tickets.filter(t => t.status === "resolved").length;
    const totalCount = tickets.length;

    if (loading) {
        return <div className="tickets-loading">Loading tickets...</div>;
    }

    return (
        <div>
            {/* Stats */}
            {!gameId && (
                <div className="tickets-stats">
                    <div className="tickets-stat-card">
                        <span className="material-icons-round" style={{ color: "#dc2626" }}>error_outline</span>
                        <div>
                            <div className="stat-value">{openCount}</div>
                            <div className="stat-label">Open</div>
                        </div>
                    </div>
                    <div className="tickets-stat-card">
                        <span className="material-icons-round" style={{ color: "#d97706" }}>pending</span>
                        <div>
                            <div className="stat-value">{inProgressCount}</div>
                            <div className="stat-label">In Progress</div>
                        </div>
                    </div>
                    <div className="tickets-stat-card">
                        <span className="material-icons-round" style={{ color: "#16a34a" }}>check_circle</span>
                        <div>
                            <div className="stat-value">{resolvedCount}</div>
                            <div className="stat-label">Resolved</div>
                        </div>
                    </div>
                    <div className="tickets-stat-card">
                        <span className="material-icons-round" style={{ color: "#0284c7" }}>confirmation_number</span>
                        <div>
                            <div className="stat-value">{totalCount}</div>
                            <div className="stat-label">Total</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="tickets-filters">
                <div className="tickets-filter-group">
                    <label>Status</label>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
                <div className="tickets-filter-group">
                    <label>Priority</label>
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">All</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {tickets.length === 0 ? (
                <div className="tickets-empty">
                    <span className="material-icons-round">confirmation_number</span>
                    <p>No tickets found</p>
                </div>
            ) : (
                <table className="tickets-table">
                    <thead>
                        <tr>
                            <th>Ticket</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Category</th>
                            <th>Study</th>
                            {role === "admin" && <th>Created By</th>}
                            <th>Assigned</th>
                            <th>Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map(t => (
                            <tr key={t.id} onClick={() => onSelectTicket(t.id)}>
                                <td className="ticket-title-cell">
                                    {t.title}
                                    <small>#{t.id.slice(0, 8)}</small>
                                </td>
                                <td>
                                    <span className={`ticket-status ${t.status}`}>
                                        {t.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td>
                                    <span className={`ticket-priority ${t.priority}`}>
                                        {t.priority}
                                    </span>
                                </td>
                                <td>
                                    <span className="ticket-category">{formatCategory(t.category)}</span>
                                </td>
                                <td style={{ fontSize: "0.82rem", color: "#475569" }}>{t.game_name}</td>
                                {role === "admin" && (
                                    <td style={{ fontSize: "0.82rem" }}>
                                        {t.creator_first_name} {t.creator_last_name}
                                    </td>
                                )}
                                <td style={{ fontSize: "0.82rem", color: "#475569" }}>
                                    {t.assignee_first_name ? `${t.assignee_first_name} ${t.assignee_last_name}` : "—"}
                                </td>
                                <td style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                                    {formatDate(t.updated_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
