import { useState } from "react";
import TicketList from "../../components/tickets/TicketList";
import TicketDetail from "../../components/tickets/TicketDetail";
import TicketCreate from "../../components/tickets/TicketCreate";
import "../../components/tickets/Tickets.css";

export default function RTickets() {
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="tickets-page">
            <div className="tickets-topbar">
                <h1>My Tickets</h1>
                <button className="tickets-create-btn" onClick={() => setShowCreate(true)}>
                    <span className="material-icons-round" style={{ fontSize: "18px" }}>add_circle</span>
                    Create Ticket
                </button>
            </div>

            <TicketList
                key={refreshKey}
                role="researcher"
                onSelectTicket={(id) => setSelectedTicketId(id)}
            />

            {selectedTicketId && (
                <TicketDetail
                    ticketId={selectedTicketId}
                    role="researcher"
                    onClose={() => {
                        setSelectedTicketId(null);
                        setRefreshKey(k => k + 1);
                    }}
                    onStatusChange={() => setRefreshKey(k => k + 1)}
                />
            )}

            {showCreate && (
                <TicketCreate
                    onClose={() => setShowCreate(false)}
                    onCreated={() => setRefreshKey(k => k + 1)}
                />
            )}
        </div>
    );
}
