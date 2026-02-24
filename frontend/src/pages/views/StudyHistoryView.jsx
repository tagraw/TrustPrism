import { useState, useEffect, useContext } from "react";
import AuthContext from "../../context/AuthContext";

const API = "http://localhost:5000";

export default function StudyHistoryView() {
  const { auth } = useContext(AuthContext);
  const [overallStats, setOverallStats] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) return;

    Promise.all([
      fetch(`${API}/participant/my-stats`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      }).then((r) => r.json()),
      fetch(`${API}/participant/games`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      }).then((r) => r.json()),
    ])
      .then(([stats, allGames]) => {
        setOverallStats(stats);
        // Only show games the user has played
        setGames(allGames.filter((g) => g.my_sessions > 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [auth.token]);

  const formatTime = (seconds) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <main className="dashboard-main">
        <div className="games-loading">
          <span className="material-icons-round spin">autorenew</span>
          <p>Loading your history...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      <header className="topbar">
        <h1>Study History</h1>
      </header>

      {/* Overall Summary */}
      {overallStats && (
        <section className="stats-grid" style={{ marginBottom: "2rem" }}>
          <div className="stat-card green">
            <span className="material-icons-round">check_circle</span>
            <div>
              <p>Completed Sessions</p>
              <h3>{overallStats.completed_sessions}</h3>
            </div>
          </div>
          <div className="stat-card blue">
            <span className="material-icons-round">sports_esports</span>
            <div>
              <p>Games Played</p>
              <h3>{overallStats.games_played}</h3>
            </div>
          </div>
          <div className="stat-card yellow">
            <span className="material-icons-round">emoji_events</span>
            <div>
              <p>Best Score</p>
              <h3>{overallStats.best_score}</h3>
            </div>
          </div>
        </section>
      )}

      {overallStats && (
        <section className="history-extra-stats">
          <div className="history-extra-chip">
            <span className="material-icons-round">avg_pace</span>
            Average Score: <strong>{overallStats.avg_score}</strong>
          </div>
          <div className="history-extra-chip">
            <span className="material-icons-round">timer</span>
            Total Play Time: <strong>{formatTime(overallStats.total_play_time_seconds)}</strong>
          </div>
          <div className="history-extra-chip">
            <span className="material-icons-round">bar_chart</span>
            Total Sessions: <strong>{overallStats.total_sessions}</strong>
          </div>
        </section>
      )}

      {/* Per-Game History */}
      <section className="studies" style={{ marginTop: "2rem" }}>
        <h3>Games You've Played</h3>
        {games.length === 0 ? (
          <div className="games-empty">
            <span className="material-icons-round">history</span>
            <p>You haven't played any games yet.</p>
            <p>Head to the Dashboard to explore available games!</p>
          </div>
        ) : (
          <div className="study-grid" style={{ marginTop: "1rem" }}>
            {games.map((game) => (
              <div key={game.id} className="history-card">
                <h4>{game.name}</h4>
                <p className="game-card-desc">
                  {game.description
                    ? game.description.length > 80
                      ? game.description.slice(0, 80) + "…"
                      : game.description
                    : ""}
                </p>
                <div className="history-card-stats">
                  <span>
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>
                      play_circle
                    </span>
                    {game.my_sessions} sessions
                  </span>
                  {game.my_best_score !== null && (
                    <span>
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        emoji_events
                      </span>
                      Best: {game.my_best_score}
                    </span>
                  )}
                  {game.last_played && (
                    <span>
                      <span className="material-icons-round" style={{ fontSize: "14px" }}>
                        schedule
                      </span>
                      {new Date(game.last_played).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
