import { useState, useEffect } from "react";

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    async function fetchNotifications() {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5000/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch (e) { console.error(e); }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="notifications-wrapper" style={{ position: 'relative' }}>
            <button
                className="icon-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
                <span className="material-icons-round" style={{ fontSize: '24px' }}>notifications</span>
                {unreadCount > 0 && (
                    <span className="notification-badge" style={{
                        position: 'absolute', top: -5, right: -5,
                        background: 'red', color: 'white', borderRadius: '50%',
                        width: '18px', height: '18px', fontSize: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="notifications-dropdown" style={{
                    position: 'absolute', top: '100%', right: 0,
                    background: 'white', border: '1px solid #ccc', borderRadius: '8px',
                    width: '300px', maxHeight: '400px', overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000,
                    marginTop: '10px'
                }}>
                    <div style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Notifications</div>
                    {notifications.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No notifications</div> : (
                        notifications.map(n => (
                            <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid #eee', background: n.is_read ? 'white' : '#f0f9ff' }}>
                                <p style={{ margin: 0, fontSize: '14px' }}>{n.message}</p>
                                <small style={{ color: '#888', fontSize: '11px' }}>{new Date(n.created_at).toLocaleDateString()}</small>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
