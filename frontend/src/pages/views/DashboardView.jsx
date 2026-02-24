import { useState, useEffect } from "react";

const API = "http://localhost:5000";

export default function DashboardView({
  stats,
  showFilter,
  onToggleFilter,
  onSortLatest,
  onSortOldest,
  onOpenSettings,
  token,
}) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchGames();
  }, [token, sortOrder]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortOrder });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`${API}/participant/games?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setGames(await res.json());
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter") fetchGames();
  };

  const getCategoryColor = (cat) => {
    const colors = {
      trust: "#8b5cf6",
      cooperation: "#0ea5e9",
      risk: "#f59e0b",
      social: "#ec4899",
      cognitive: "#10b981",
      behavioral: "#6366f1",
    };
    return colors[cat] || "#64748b";
  };

  const getGameTypeIcon = (type) => {
    const icons = {
      trust_game: "handshake",
      prisoners_dilemma: "lock",
      public_goods: "groups",
      ultimatum: "gavel",
      dictator: "account_balance",
    };
    return icons[type] || "sports_esports";
  };

  return (
    <main className="dashboard-main">
      {/* Top Bar */}
      <header className="topbar">
        <h1>Participant Dashboard</h1>
        <div className="topbar-actions">
          <input
            type="text"
            placeholder="Search games..."
            className="search-input"
            value={searchTerm}
            onChange={handleSearch}
            onKeyDown={handleSearchSubmit}
          />
          <span
            className="material-icons-round"
            onClick={onOpenSettings}
            style={{ cursor: "pointer" }}
          >
            settings
          </span>
        </div>
      </header>

      {/* Welcome */}
      <section className="welcome">
        <h2>Welcome back, {stats.firstName}</h2>
        <p>
          Track your research activity and participate in verified scientific
          studies.
        </p>
      </section>

      {/* Activity Cards */}
      <section className="stats-grid">
        <div className="stat-card green">
          <span className="material-icons-round">check_circle</span>
          <div>
            <p>Sessions Completed</p>
            <h3>{stats.sessionsCompleted}</h3>
          </div>
        </div>

        <div className="stat-card blue">
          <span className="material-icons-round">sports_esports</span>
          <div>
            <p>Available Games</p>
            <h3>{stats.availableGames}</h3>
          </div>
        </div>

        <div className="stat-card yellow">
          <span className="material-icons-round">emoji_events</span>
          <div>
            <p>Games Played</p>
            <h3>{games.filter((g) => g.my_sessions > 0).length}</h3>
          </div>
        </div>
      </section>

      {/* Available Games */}
      <section className="studies">
        <div className="section-header">
          <h3>Published Games</h3>

          <div className="filter-wrapper">
            <button className="filter-btn" onClick={onToggleFilter}>
              <span className="material-icons-round">filter_list</span>
              Filter
            </button>

            {showFilter && (
              <div className="filter-dropdown">
                <div
                  className="filter-option"
                  onClick={() => {
                    setSortOrder("latest");
                    onSortLatest();
                  }}
                >
                  Latest
                </div>
                <div
                  className="filter-option"
                  onClick={() => {
                    setSortOrder("oldest");
                    onSortOldest();
                  }}
                >
                  Oldest
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="games-loading">
            <span className="material-icons-round spin">autorenew</span>
            <p>Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="games-empty">
            <span className="material-icons-round">search_off</span>
            <p>No published games available right now.</p>
            <p>Check back soon!</p>
          </div>
        ) : (
          <div className="study-grid">
            {games.map((game) => (
              <div key={game.id} className="game-card">
                <div className="game-card-top">
                  <span
                    className="game-type-icon"
                    style={{
                      background: `${getCategoryColor(game.category)}15`,
                      color: getCategoryColor(game.category),
                    }}
                  >
                    <span className="material-icons-round">
                      {getGameTypeIcon(game.game_type)}
                    </span>
                  </span>

                  {game.my_sessions > 0 && (
                    <span className="badge played">
                      PLAYED · {game.my_sessions}x
                    </span>
                  )}
                </div>

                <h4 className="game-card-title">{game.name}</h4>
                <p className="game-card-desc">
                  {game.description
                    ? game.description.length > 100
                      ? game.description.slice(0, 100) + "…"
                      : game.description
                    : "No description available."}
                </p>

                <div className="game-card-meta">
                  {game.category && (
                    <span
                      className="game-tag"
                      style={{
                        background: `${getCategoryColor(game.category)}15`,
                        color: getCategoryColor(game.category),
                      }}
                    >
                      {game.category}
                    </span>
                  )}
                  {game.research_tags &&
                    game.research_tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="game-tag">
                        {tag}
                      </span>
                    ))}
                </div>

                <div className="game-card-footer">
                  <small className="game-researcher">
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>person</span>
                    {game.researcher_name}
                  </small>
                  <button
                    className="play-btn"
                    onClick={() => {
                      if (game.production_url) {
                        try {
                          // Extract user ID cleanly from the JWT token
                          const payload = JSON.parse(atob(token.split(".")[1]));
                          const userId = payload.id;

                          const url = new URL(game.production_url);
                          url.searchParams.set("participantId", userId);
                          window.open(url.toString(), "_blank", "noopener,noreferrer");
                        } catch (e) {
                          // Fallback if URL is totally malformed
                          const payload = JSON.parse(atob(token.split(".")[1]));
                          window.open(`${game.production_url}?participantId=${payload.id}`, "_blank", "noopener,noreferrer");
                        }
                      } else {
                        alert("This game doesn't have a production URL yet. Check back later!");
                      }
                    }}
                  >
                    <span className="material-icons-round" style={{ fontSize: "16px" }}>
                      play_arrow
                    </span>
                    Play
                  </button>
                </div>

                {game.my_best_score !== null && game.my_best_score !== undefined && game.my_best_score > 0 && (
                  <div className="game-card-score">
                    <span className="material-icons-round" style={{ fontSize: "14px" }}>emoji_events</span>
                    Best: {game.my_best_score}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
