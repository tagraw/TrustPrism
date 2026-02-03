import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function RDataInsights() {
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'detail'
  const [publishedGames, setPublishedGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  const [stats, setStats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch published games list
  useEffect(() => {
    async function fetchGames() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/projects?status=published", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setPublishedGames(await res.json());
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchGames();
  }, []);

  // Fetch stats when a game is selected
  useEffect(() => {
    if (!selectedGame) return;

    async function fetchData() {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch(`http://localhost:5000/insights/stats?gameId=${selectedGame.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5000/insights/logs?gameId=${selectedGame.id}&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (logsRes.ok) setLogs(await logsRes.json());
      } catch (err) {
        console.error("Failed to load insights", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedGame]);

  const handleExport = async (format) => {
    if (!selectedGame) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/insights/${selectedGame.id}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game_${selectedGame.id}_data.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) { console.error(e); }
  };

  if (loading && !selectedGame && publishedGames.length === 0) return <div className="p-8">Loading insights...</div>;

  return (
    <main className="researcher-main">
      <header className="researcher-topbar">
        <h1>{viewMode === 'detail' && selectedGame ? `Analytics: ${selectedGame.name}` : "Data Insights"}</h1>
        {viewMode === 'detail' && (
          <div className="topbar-actions">
            <button className="secondary-btn" onClick={() => { setViewMode('list'); setSelectedGame(null); }}>Back to Projects</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="export-btn" onClick={() => handleExport('csv')}>Export CSV</button>
              <button className="export-btn" onClick={() => handleExport('json')}>Export JSON</button>
            </div>
          </div>
        )}
      </header>

      {viewMode === 'list' ? (
        <div className="insights-container" style={{ padding: "1.5rem" }}>
          <h2>Your Published Games</h2>
          {publishedGames.length === 0 ? <p>No published games to analyze.</p> : (
            <div className="games-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {publishedGames.map(game => (
                <div key={game.id} className="game-card"
                  onClick={() => { setSelectedGame(game); setViewMode('detail'); }}
                  style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <h3 style={{ marginTop: 0 }}>{game.name}</h3>
                  <p className="description" style={{ color: '#64748b', fontSize: '0.9rem' }}>{game.description}</p>
                  <div style={{ marginTop: '15px' }}>
                    <span className="badge published">Published</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="insights-container" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Usage Chart */}
          <section className="chart-section" style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h2>AI Interaction Trends</h2>
            {loading ? <p>Loading stats...</p> : (
              <div style={{ height: 300, width: "100%" }}>
                <ResponsiveContainer>
                  <LineChart data={stats}>
                    <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(str) => new Date(str).toLocaleDateString()} />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                {stats.length === 0 && <p className="text-center text-gray-500">No interaction data available.</p>}
              </div>
            )}
          </section>

          {/* logs Table */}
          <section className="logs-section" style={{ background: "white", padding: "1.5rem", borderRadius: "12px" }}>
            <h2>Interaction Logs</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Time</th>
                  <th style={{ padding: "0.75rem" }}>Event Type</th>
                  <th style={{ padding: "0.75rem" }}>AI Model</th>
                  <th style={{ padding: "0.75rem" }}>Participant (Anon)</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "0.75rem" }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{
                          background: "#eff6ff", color: "#2563eb",
                          padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem"
                        }}>
                          {log.event_type}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>{log.ai_model || "N/A"}</td>
                      <td style={{ padding: "0.75rem" }}>{log.participant_id ? `anon_${log.participant_id.substring(0, 6)}` : "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </main>
  );
}