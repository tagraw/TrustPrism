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
  const [consentGame, setConsentGame] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [consentedGameIds, setConsentedGameIds] = useState(new Set());

  useEffect(() => {
    if (!token) return;
    fetchGames();
    fetchConsents();
  }, [token, sortOrder]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortOrder });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`${API}/participant/games?${params}`, {
      credentials: "include",
        headers: {},
      });
      if (res.ok) setGames(await res.json());
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsents = async () => {
    try {
      const res = await fetch(`${API}/participant/consents`, {
      credentials: "include",
        headers: {},
      });
      if (res.ok) {
        const ids = await res.json();
        setConsentedGameIds(new Set(ids));
      }
    } catch (err) {
      console.error("Failed to fetch consents:", err);
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

  const openGame = (game) => {
    if (game.production_url) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.id;
        const url = new URL(game.production_url);
        url.searchParams.set("participantId", userId);
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      } catch (e) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        window.open(`${game.production_url}?participantId=${payload.id}`, "_blank", "noopener,noreferrer");
      }
    } else {
      alert("This game doesn't have a production URL yet. Check back later!");
    }
  };

  const handlePlayClick = (game) => {
    // If game has a consent form AND user hasn't already consented, show it
    if (game.consent_form_url && !consentedGameIds.has(game.id)) {
      setConsentGame(game);
      setConsentAgreed(false);
    } else {
      openGame(game);
    }
  };

  const handleConsentAccept = async () => {
    if (!consentGame) return;

    // Record consent in the backend
    try {
      await fetch(`${API}/participant/consents`, {
      credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: consentGame.id,
          consentFormUrl: consentGame.consent_form_url,
        }),
      });

      // Update local set so it won't show again this session
      setConsentedGameIds((prev) => new Set([...prev, consentGame.id]));
    } catch (err) {
      console.error("Failed to record consent:", err);
    }

    openGame(consentGame);
    setConsentGame(null);
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
                    onClick={() => handlePlayClick(game)}
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

      {/* Consent Form Agreement Modal */}
      {consentGame && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setConsentGame(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "16px", width: "90%", maxWidth: "720px",
              maxHeight: "90vh", display: "flex", flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-icons-round" style={{ color: "#0ea5e9", fontSize: "24px" }}>verified_user</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Consent Form Required</h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>{consentGame.name}</p>
                </div>
              </div>
              <button
                onClick={() => setConsentGame(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.5rem" }}
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* PDF Viewer */}
            <div style={{ flex: 1, overflow: "auto", minHeight: "400px" }}>
              <iframe
                src={`http://localhost:5000${consentGame.consent_form_url}`}
                title="Consent Form"
                style={{ width: "100%", height: "100%", minHeight: "400px", border: "none" }}
              />
            </div>

            {/* Footer with checkbox + button */}
            <div style={{
              padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#f8fafc",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#0ea5e9" }}
                />
                I have read and agree to the consent form
              </label>
              <button
                disabled={!consentAgreed}
                onClick={handleConsentAccept}
                style={{
                  padding: "10px 24px", border: "none", borderRadius: "8px",
                  background: consentAgreed ? "#0ea5e9" : "#cbd5e1",
                  color: "#fff", fontWeight: 600, fontSize: "0.9rem",
                  cursor: consentAgreed ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: "6px",
                  transition: "background 0.2s",
                }}
              >
                <span className="material-icons-round" style={{ fontSize: "18px" }}>play_arrow</span>
                Proceed to Game
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
