import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "../Admin.css";

const SOCKET_URL = "http://localhost:5000";

const GameDetailModal = ({ game, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const token = localStorage.getItem("token");

    // Decode current user from token
    const currentUser = (() => {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return { ...payload, id: String(payload.id) }; // ensure ID is always a string
        } catch { return {}; }
    })();

    useEffect(() => {
        // Fetch existing messages
        fetchMessages();

        // Connect socket
        socketRef.current = io(SOCKET_URL, { transports: ["websocket", "polling"] });
        socketRef.current.emit("join_project", game.id);

        socketRef.current.on("new_message", (msg) => {
            setMessages(prev => {
                // Deduplicate: skip if message with same ID already exists
                if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [game.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`http://localhost:5000/chat/projects/${game.id}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setMessages(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const sendMessage = async () => {
        if (!newMsg.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch(`http://localhost:5000/chat/projects/${game.id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMsg.trim() })
            });
            if (res.ok) {
                const sentMsg = await res.json();
                // Add message immediately from POST response (socket may also deliver it; deduplicated above)
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                setNewMsg("");
            }
        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleApprove = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "approved" })
            });
            if (res.ok) {
                alert("Study approved!");
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRequestChanges = async () => {
        try {
            const res = await fetch(`http://localhost:5000/admin/games/${game.id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "draft" })
            });
            if (res.ok) {
                alert("Sent back for changes.");
                onClose();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Parse experimental_conditions safely
    const conditions = (() => {
        if (!game.experimental_conditions) return null;
        if (typeof game.experimental_conditions === "string") {
            try { return JSON.parse(game.experimental_conditions); } catch { return null; }
        }
        return game.experimental_conditions;
    })();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="game-detail-modal" onClick={e => e.stopPropagation()}>
                {/* Left: Details */}
                <div className="detail-pane">
                    <div className="detail-header">
                        <h2>{game.name}</h2>
                        <button className="icon-btn" onClick={onClose} title="Close">
                            <span className="material-icons-round">close</span>
                        </button>
                    </div>

                    <div className="detail-meta">
                        <span className={`pill ${game.status === 'published' ? 'green' : game.status === 'approved' ? 'blue' : game.status === 'pending_review' ? 'orange' : 'gray'}`}>
                            {game.status?.replace("_", " ")}
                        </span>
                        <span className="meta-item">
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>science</span>
                            {game.game_type}
                        </span>
                        {game.irb_approval && (
                            <span className="meta-item irb-badge">IRB Approved ✓</span>
                        )}
                    </div>

                    <div className="detail-section">
                        <h4>Researcher</h4>
                        <p>{game.researcher_name} — {game.researcher_email}</p>
                    </div>

                    <div className="detail-section">
                        <h4>Description</h4>
                        <p>{game.description || "No description provided."}</p>
                    </div>

                    {game.consent_form_url && (
                        <div className="detail-section">
                            <h4>Consent Form</h4>
                            <a href={game.consent_form_url} target="_blank" rel="noreferrer" className="consent-link">
                                <span className="material-icons-round">description</span>
                                View Consent Form
                            </a>
                        </div>
                    )}

                    {game.target_sample_size && (
                        <div className="detail-section">
                            <h4>Target Sample Size</h4>
                            <p>{game.target_sample_size} participants</p>
                        </div>
                    )}

                    {conditions && (
                        <div className="detail-section">
                            <h4>Experimental Conditions</h4>
                            <pre className="conditions-json">{JSON.stringify(conditions, null, 2)}</pre>
                        </div>
                    )}

                    <div className="detail-section">
                        <h4>Dates</h4>
                        <p>Created: {new Date(game.created_at).toLocaleString()}</p>
                        {game.updated_at && <p>Updated: {new Date(game.updated_at).toLocaleString()}</p>}
                    </div>

                    {game.status === "pending_review" && (
                        <div className="detail-actions">
                            <button className="approve-btn" onClick={handleApprove}>
                                <span className="material-icons-round">check_circle</span>
                                Approve Study
                            </button>
                            <button className="request-btn" onClick={handleRequestChanges}>
                                <span className="material-icons-round">edit_note</span>
                                Request Changes
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Chat */}
                <div className="chat-pane">
                    <div className="chat-header">
                        <span className="material-icons-round">forum</span>
                        <h4>Project Chat</h4>
                        {game.group_id && <small>Shared with researcher group</small>}
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <p className="chat-empty">No messages yet. Start the conversation!</p>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={msg.id || i}
                                className={`chat-bubble ${String(msg.sender_id) === String(currentUser.id) ? "mine" : "theirs"}`}
                            >
                                <div className="chat-bubble-header">
                                    <strong>{msg.first_name} {msg.last_name}</strong>
                                    <span className={`pill tiny ${msg.role === 'admin' ? 'purple' : msg.role === 'researcher' ? 'blue' : 'gray'}`}>
                                        {msg.role}
                                    </span>
                                </div>
                                <p>{msg.message}</p>
                                <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-bar">
                        <textarea
                            value={newMsg}
                            onChange={e => setNewMsg(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={2}
                        />
                        <button onClick={sendMessage} disabled={sending || !newMsg.trim()} className="send-btn">
                            <span className="material-icons-round">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameDetailModal;
