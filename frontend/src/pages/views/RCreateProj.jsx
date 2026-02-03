import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RCreateProj({ onSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gameType: "decision_task",
    experimentalConditions: JSON.stringify({ ai_model: "gpt-4", reliability: 0.8 }, null, 2),
    targetSampleSize: 100,
    irbApproval: false,
    consentForm: null,
    groupId: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/groups/my-groups", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (err) {
        console.error("Failed to load groups", err);
      }
    }
    fetchGroups();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // Content-Type handled automatically for FormData
        body: data
      });

      if (res.ok) {
        alert("Project created successfully!");
        if (onSuccess) onSuccess();
        else navigate("/researcher");
      } else {
        alert("Failed to create project");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="researcher-main">
      <header className="researcher-topbar">
        <h1>Create New Research Project</h1>
      </header>

      <section className="create-project-section" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <form className="create-project-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Research Group (Optional)</label>
            <select name="groupId" value={formData.groupId} onChange={handleChange}>
              <option value="">Select a Group...</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <small>Collaborate smoothly with your group members.</small>
          </div>

          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text" name="name" required
              value={formData.name} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description" required rows="4"
              value={formData.description} onChange={handleChange}
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Game Type</label>
              <select name="gameType" value={formData.gameType} onChange={handleChange}>
                <option value="decision_task">Decision Task</option>
                <option value="image_classification">Image Classification</option>
                <option value="chat_interaction">Chat Interaction</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Sample Size</label>
              <input
                type="number" name="targetSampleSize"
                value={formData.targetSampleSize} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Experimental Conditions (JSON)</label>
            <textarea
              name="experimentalConditions" rows="4" style={{ fontFamily: "monospace" }}
              value={formData.experimentalConditions} onChange={handleChange}
            ></textarea>
            <small>Define AI behavior params here.</small>
          </div>

          <div className="form-group">
            <label>Upload Consent Form (PDF)</label>
            <input
              type="file" name="consentForm" accept=".pdf"
              onChange={handleChange}
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox" name="irbApproval"
                checked={formData.irbApproval} onChange={handleChange}
              />
              Has IRB/Ethics Approval?
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      </section>
    </main>
  );
}
