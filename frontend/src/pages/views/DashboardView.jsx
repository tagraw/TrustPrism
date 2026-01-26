export default function DashboardView({
  stats,
  showFilter,
  onToggleFilter,
  onSortLatest,
  onSortOldest,
  onOpenSettings,
}) {
  return (
    <main className="dashboard-main">
      {/* Top Bar */}
      <header className="topbar">
        <h1>Participant Dashboard</h1>
        <div className="topbar-actions">
          <input
            type="text"
            placeholder="Search studies..."
            className="search-input"
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
          <span className="material-icons-round">groups</span>
          <div>
            <p>Active Studies</p>
            <h3>{stats.availableGames}</h3>
          </div>
        </div>

        <div className="stat-card yellow">
          <span className="material-icons-round">emoji_events</span>
          <div>
            <p>Top Game Rank</p>
            <h3>10%</h3>
          </div>
        </div>
      </section>

      {/* Available Studies */}
      <section className="studies">
        <div className="section-header">
          <h3>Available Studies</h3>

          <div className="filter-wrapper">
            <button className="filter-btn" onClick={onToggleFilter}>
              <span className="material-icons-round">filter_list</span>
              Filter
            </button>

            {showFilter && (
              <div className="filter-dropdown">
                <div className="filter-option" onClick={onSortLatest}>
                  Latest
                </div>
                <div className="filter-option" onClick={onSortOldest}>
                  Oldest
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="study-grid">
            <div className="study-card">
                <span className="badge verified">VERIFIED</span>
                    <h4>Sleep Patterns & Mental Focus</h4>
                    <p> Investigating how circadian rhythm impacts cognitive performance. </p>
                    <button className="primary-btn">Join Study →</button> </div> <div className="study-card">
                <span className="badge paid">PAID STUDY</span>
                    <h4>Nutrition & Energy Levels</h4>
                    <p> Observational research on diet variability and sustained energy. </p>
                    <button className="primary-btn">Join Study →</button> </div> <div className="study-card placeholder">
                <span className="material-icons-round">search</span>
                    <p>More studies coming soon</p>
            </div>
        </div>
      </section>
    </main>
  );
}
