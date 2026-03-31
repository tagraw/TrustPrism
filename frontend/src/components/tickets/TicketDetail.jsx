import { useState, useEffect } from "react";
import "./Tickets.css";

const API = "http://localhost:5000";

export default function TicketDetail({ ticketId, onClose, role, onStatusChange }) {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (ticketId) fetchTicket();
    }, [ticketId]);

    async function fetchTicket() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/tickets/${ticketId}`, {
      credentials: "include",
                headers: {}
            });
            if (res.ok) setTicket(await res.json());
        } catch (err) {
            console.error("Failed to fetch ticket:", err);
        }
        setLoading(false);
    }

    async function updateStatus(newStatus) {
        try {
            const res = await fetch(`${API}/api/tickets/${ticketId}/status`, {
                credentials: "include",
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                const updated = await res.json();
                setTicket(prev => ({ ...prev, ...updated }));
                if (onStatusChange) onStatusChange();
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    }

    async function assignToSelf() {
        try {
            const res = await fetch(`${API}/api/tickets/${ticketId}/assign`, {
                credentials: "include",
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (res.ok) {
                if (onStatusChange) onStatusChange();
                // Re-fetch to get full join data
                fetchTicket();
            }
        } catch (err) {
            console.error("Failed to assign ticket:", err);
        }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleString(undefined, {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    if (!ticketId) return null;

    return (
        <div className="ticket-detail-overlay" onClick={onClose}>
            <div className="ticket-detail-container" onClick={e => e.stopPropagation()}>
                {loading || !ticket ? (
                    <div className="tickets-loading" style={{ padding: "3rem" }}>Loading ticket...</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="ticket-detail-header">
                            <div>
                                <h2>{ticket.title}</h2>
                                <div className="ticket-detail-meta">
                                    <span className={`ticket-status ${ticket.status}`}>
                                        {ticket.status.replace("_", " ")}
                                    </span>
                                    <span className={`ticket-priority ${ticket.priority}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="ticket-category">
                                        {(ticket.category || "other").replace(/_/g, " ")}
                                    </span>
                                </div>
                            </div>
                            <button className="ticket-detail-close material-icons-round" onClick={onClose}>close</button>
                        </div>

                        {/* Info Grid */}
                        <div className="ticket-detail-info">
                            <div className="ticket-info-item">
                                <span className="ticket-info-label">Study</span>
                                <span className="ticket-info-value">{ticket.game_name}</span>
                            </div>
                            <div className="ticket-info-item">
                                <span className="ticket-info-label">Created By</span>
                                <span className="ticket-info-value">{ticket.creator_first_name} {ticket.creator_last_name}</span>
                            </div>
                            <div className="ticket-info-item">
                                <span className="ticket-info-label">Assigned To</span>
                                <span className="ticket-info-value">
                                    {ticket.assignee_first_name ? `${ticket.assignee_first_name} ${ticket.assignee_last_name}` : "Unassigned"}
                                </span>
                            </div>
                            <div className="ticket-info-item">
                                <span className="ticket-info-label">Created</span>
                                <span className="ticket-info-value">{formatDateTime(ticket.created_at)}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="ticket-detail-description">
                            <h4>Description</h4>
                            <p>{ticket.description}</p>
                        </div>

                        {/* Admin Actions */}
                        {role === "admin" && (
                            <div className="ticket-admin-actions">
                                {!ticket.assigned_to && (
                                    <button className="ticket-action-btn primary" onClick={assignToSelf}>
                                        <span className="material-icons-round" style={{ fontSize: "16px" }}>person_add</span>
                                        Assign to Me
                                    </button>
                                )}
                                {ticket.status === "open" && (
                                    <button className="ticket-action-btn warning" onClick={() => updateStatus("in_progress")}>
                                        <span className="material-icons-round" style={{ fontSize: "16px" }}>play_arrow</span>
                                        Mark In Progress
                                    </button>
                                )}
                                {ticket.status === "in_progress" && (
                                    <button className="ticket-action-btn success" onClick={() => updateStatus("resolved")}>
                                        <span className="material-icons-round" style={{ fontSize: "16px" }}>check_circle</span>
                                        Mark Resolved
                                    </button>
                                )}
                                {(ticket.status === "resolved") && (
                                    <button className="ticket-action-btn" onClick={() => updateStatus("closed")}>
                                        <span className="material-icons-round" style={{ fontSize: "16px" }}>lock</span>
                                        Close Ticket
                                    </button>
                                )}
                            </div>
                        )}

                    </>
                )}
            </div>
        </div>
    );
}
