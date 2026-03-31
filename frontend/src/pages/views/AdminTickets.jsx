import { useState } from "react";
import TicketList from "../../components/tickets/TicketList";
import TicketDetail from "../../components/tickets/TicketDetail";
import "../../components/tickets/Tickets.css";

export default function AdminTickets() {
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="tickets-page">
            <div className="tickets-topbar">
                <h1>Ticket Dashboard</h1>
            </div>

            <TicketList
                key={refreshKey}
                role="admin"
                onSelectTicket={(id) => setSelectedTicketId(id)}
            />

            {selectedTicketId && (
                <TicketDetail
                    ticketId={selectedTicketId}
                    role="admin"
                    onClose={() => {
                        setSelectedTicketId(null);
                        setRefreshKey(k => k + 1);
                    }}
                    onStatusChange={() => setRefreshKey(k => k + 1)}
                />
            )}
        </div>
    );
}
