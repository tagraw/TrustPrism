import { useState, useEffect } from "react";
import GameDetailModal from "./GameDetailModal";
import "../Admin.css";

const StudyApprovals = ({ openGameId, onGameOpened }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedGame, setSelectedGame] = useState(null);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchGames();
    }, []);

    // When a notification triggers opening a specific game
    useEffect(() => {
        if (openGameId && games.length > 0) {
            const game = games.find(g => g.id === openGameId);
            if (game) {
                setSelectedGame(game);
            }
            onGameOpened?.();
        }
    }, [openGameId, games]);

    const fetchGames = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5000/admin/games", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setGames(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch games", err);
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (status) => {
        switch (status) {
            case "published": return "green";
            case "approved": return "blue";
            case "pending_review": return "orange";
            case "draft": return "gray";
            default: return "gray";
        }
    };

    const filtered = filter === "all"
        ? games
        : games.filter(g => g.status === filter);

    if (loading) return <div className="loading-spinner">Loading studies...</div>;

    return (
        <>
            <div className="admin-card wide">
                <div className="card-header">
                    <h3>All Researcher Studies</h3>
                    <div className="filter-bar">
                        {["all", "draft", "pending_review", "approved", "published"].map(s => (
                            <button
                                key={s}
                                className={`filter-btn ${filter === s ? "active" : ""}`}
                                onClick={() => setFilter(s)}
                            >
                                {s === "all" ? "All" : s.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="approval-list">
                    {filtered.length === 0 && (
                        <p className="text-center">No studies found.</p>
                    )}
                    {filtered.map(game => (
                        <div
                            className="approval-item clickable"
                            key={game.id}
                            onClick={() => setSelectedGame(game)}
                        >
                            <div className="approval-info">
                                <strong>{game.name}</strong>
                                <span>By {game.researcher_name} ({game.researcher_email})</span>
                                <small>
                                    Type: {game.game_type} •
                                    <span className={`pill ${statusColor(game.status)}`} style={{ marginLeft: "4px" }}>
                                        {game.status?.replace("_", " ")}
                                    </span>
                                    {game.irb_approval && " • IRB ✓"}
                                </small>
                            </div>
                            <div className="approval-actions">
                                <small>{new Date(game.created_at).toLocaleDateString()}</small>
                                <button className="icon-btn" title="View Details">
                                    <span className="material-icons-round">visibility</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedGame && (
                <GameDetailModal
                    game={selectedGame}
                    onClose={() => {
                        setSelectedGame(null);
                        fetchGames(); // refresh in case status changed
                    }}
                />
            )}
        </>
    );
};

export default StudyApprovals;
