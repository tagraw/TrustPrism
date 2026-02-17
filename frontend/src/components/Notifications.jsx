import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./Notifications.css";

const SOCKET_URL = "http://localhost:5000";

export default function Notifications({ onOpenProject }) {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const socketRef = useRef(null);
    const dropdownRef = useRef(null);
    const token = localStorage.getItem("token");

    // Decode user id from token
    const userId = (() => {
        try {
            return JSON.parse(atob(token.split(".")[1])).id;
        } catch { return null; }
    })();

    useEffect(() => {
        fetchNotifications();

        // Connect socket and join user room for real-time notifications
        if (userId) {
            socketRef.current = io(SOCKET_URL, { transports: ["websocket", "polling"] });
            socketRef.current.emit("join_user", userId);

            socketRef.current.on("notification", (notif) => {
                setNotifications(prev => [notif, ...prev]);
            });
        }

        return () => {
            socketRef.current?.disconnect();
        };
    }, [userId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        }
        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDropdown]);

    async function fetchNotifications() {
        try {
            const res = await fetch("http://localhost:5000/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setNotifications(await res.json());
        } catch (e) { console.error(e); }
    }

    async function markAsRead(id) {
        try {
            await fetch(`http://localhost:5000/notifications/${id}/read`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (e) { console.error(e); }
    }

    async function markAllRead() {
        const unread = notifications.filter(n => !n.is_read);
        for (const n of unread) {
            await markAsRead(n.id);
        }
    }

    function handleNotificationClick(n) {
        // Mark as read
        if (!n.is_read) markAsRead(n.id);

        // If notification has a game_id in metadata, open the modal
        const gameId = n.metadata?.game_id;
        if (gameId && onOpenProject) {
            onOpenProject(gameId);
            setShowDropdown(false);
        }
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;

    function getIcon(type) {
        switch (type) {
            case "message": return "chat";
            case "approval": return "check_circle";
            default: return "info";
        }
    }

    function getTimeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    return (
        <div className="notif-wrapper" ref={dropdownRef}>
            <button
                className={`notif-bell ${unreadCount > 0 ? "has-unread" : ""}`}
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <span className="material-icons-round">notifications</span>
                {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all" onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <span className="material-icons-round" style={{ fontSize: "2rem", color: "#cbd5e1" }}>
                                    notifications_none
                                </span>
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${n.is_read ? "" : "unread"}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className={`notif-icon ${n.type || "info"}`}>
                                        <span className="material-icons-round">{getIcon(n.type)}</span>
                                    </div>
                                    <div className="notif-body">
                                        <p className="notif-msg">{n.message}</p>
                                        <small className="notif-time">{getTimeAgo(n.created_at)}</small>
                                    </div>
                                    {!n.is_read && <div className="notif-dot" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
