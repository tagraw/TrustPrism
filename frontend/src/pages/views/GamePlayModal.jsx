import { useState, useEffect } from "react";

const API = "http://localhost:5000";

export default function GamePlayModal({ game, token, onClose }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!game?.id) return;
        fetch(`${API}/participant/games/${game.id}/my-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [game?.id, token]);

    const formatTime = (seconds) => {
        if (!seconds) return "0m";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="gpm-overlay" onClick={onClose}>
            <div className="gpm-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="gpm-header">
                    <div className="gpm-header-info">
                        <h2>{game.name}</h2>
                        <span className="gpm-researcher">by {game.researcher_name}</span>
                    </div>
                    <button className="gpm-close" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <div className="gpm-body">
                    {/* Stats Bar */}
                    <div className="gpm-stats-bar">
                        {loading ? (
                            <span className="gpm-stats-loading">Loading stats...</span>
                        ) : (
                            <>
                                <div className="gpm-stat-chip">
                                    <span className="material-icons-round">play_circle</span>
                                    <span>{stats?.session_count || 0} sessions</span>
                                </div>
                                <div className="gpm-stat-chip">
                                    <span className="material-icons-round">emoji_events</span>
                                    <span>Best: {stats?.best_score || 0}</span>
                                </div>
                                <div className="gpm-stat-chip">
                                    <span className="material-icons-round">avg_pace</span>
                                    <span>Avg: {stats?.avg_score || 0}</span>
                                </div>
                                <div className="gpm-stat-chip">
                                    <span className="material-icons-round">timer</span>
                                    <span>{formatTime(stats?.total_play_time_seconds)}</span>
                                </div>
                                {stats?.last_played && (
                                    <div className="gpm-stat-chip">
                                        <span className="material-icons-round">schedule</span>
                                        <span>Last: {new Date(stats.last_played).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Game iframe */}
                    {game.production_url ? (
                        <div className="gpm-iframe-wrap">
                            <iframe
                                src={game.production_url}
                                title={`Play: ${game.name}`}
                                className="gpm-iframe"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        </div>
                    ) : (
                        <div className="gpm-no-url">
                            <span className="material-icons-round">videogame_asset_off</span>
                            <p>This game doesn't have a production URL yet.</p>
                            <p>Please check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
