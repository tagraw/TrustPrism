

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./RCreateProj.css";

export default function RCreateProj({ onSuccess }) {
  const navigate = useNavigate();
  const [aiFeatures, setAiFeatures] = useState({
    hints: false,
    recommendations: false,
    explanations: false,
    confidenceScores: false
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    gameType: "decision_task",
    experimentalConditions: JSON.stringify({ ai_model: "gpt-4", reliability: 0.8 }, null, 2),
    targetSampleSize: 100,
    irbApproval: false,
    consentForm: null,
    groupId: "",
    category: "",
    ageGroup: "",
    researchTags: "",
    aiUsageType: "none"
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

  const handleAiFeatureChange = (feature) => {
    setAiFeatures(prev => {
      const updated = { ...prev, [feature]: !prev[feature] };
      try {
        const currentJson = JSON.parse(formData.experimentalConditions || "{}");
        currentJson.features = updated;
        setFormData(fd => ({ ...fd, experimentalConditions: JSON.stringify(currentJson, null, 2) }));
      } catch (e) {
        console.warn("Could not parse JSON to update features", e);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      if (res.ok) {
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

  const selectedGroupName = groups.find(g => g.id == formData.groupId)?.name || "None selected";

  // Tag rendering
  const tagList = formData.researchTags
    ? formData.researchTags.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <main className="rc-layout">
      {/* Main Content Area */}
      <div className="rc-main">
        <header className="rc-header">
          <h1 style={{ margin: 0 }}>Create New Project</h1>
          <p className="rc-subtitle">Configure your human-AI interaction study parameters below.</p>
        </header>

        <form id="create-project-form" onSubmit={handleSubmit}>

          {/* Section 1: Basic Information */}
          <section className="rc-section">
            <div className="rc-section-header">
              <span className="material-icons-round rc-section-icon">info</span>
              <span>Basic Information</span>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Research Group</label>
              <select className="rc-select" name="groupId" value={formData.groupId} onChange={handleChange}>
                <option value="">Select your research organization</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Game Name</label>
              <input
                className="rc-input"
                type="text" name="name" required
                placeholder="e.g., The Turing Dilemma"
                value={formData.name} onChange={handleChange}
              />
            </div>

            <div className="rc-form-row">
              <div className="rc-form-group">
                <label className="rc-label">Category</label>
                <select className="rc-select" name="category" value={formData.category} onChange={handleChange}>
                  <option value="">Select category</option>
                  <option value="psychology">Psychology</option>
                  <option value="education">Education</option>
                  <option value="economics">Economics</option>
                  <option value="social_science">Social Science</option>
                  <option value="cognitive_science">Cognitive Science</option>
                  <option value="computer_science">Computer Science</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="rc-form-group">
                <label className="rc-label">Age Group</label>
                <select className="rc-select" name="ageGroup" value={formData.ageGroup} onChange={handleChange}>
                  <option value="">Select age group</option>
                  <option value="under_18">Under 18</option>
                  <option value="18-25">18–25</option>
                  <option value="26-35">26–35</option>
                  <option value="36-50">36–50</option>
                  <option value="50+">50+</option>
                  <option value="all_ages">All Ages</option>
                </select>
              </div>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Research Tags</label>
              <input
                className="rc-input"
                type="text" name="researchTags"
                placeholder="trust, bias, LLM, decision-making (comma-separated)"
                value={formData.researchTags} onChange={handleChange}
              />
              {tagList.length > 0 && (
                <div className="rc-tags-preview">
                  {tagList.map((tag, i) => (
                    <span key={i} className="rc-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Consent Form (PDF)</label>
              <div className="rc-upload-area" onClick={() => document.getElementById('consent-upload').click()}>
                <span className="material-icons-round rc-upload-icon">upload_file</span>
                <p style={{ margin: 0, fontWeight: 500, color: '#334155' }}>
                  {formData.consentForm ? formData.consentForm.name : "Click to upload or drag and drop"}
                </p>
                <small style={{ color: '#94a3b8' }}>PDF documents only (max. 10MB)</small>
                <input
                  id="consent-upload"
                  type="file" name="consentForm" accept=".pdf"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Study Details */}
          <section className="rc-section">
            <div className="rc-section-header">
              <span className="material-icons-round rc-section-icon">description</span>
              <span>Study Details</span>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Research Goals</label>
              <textarea
                className="rc-textarea"
                rows="3"
                placeholder="Describe what you aim to discover..."
              ></textarea>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Game Description</label>
              <textarea
                className="rc-textarea"
                name="description" required rows="4"
                placeholder="Details about gameplay, rules, and participant tasks..."
                value={formData.description} onChange={handleChange}
              ></textarea>
            </div>
          </section>

          {/* Section 3: AI Configuration */}
          <section className="rc-section">
            <div className="rc-section-header">
              <span className="material-icons-round rc-section-icon">smart_toy</span>
              <span>AI Configuration</span>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">AI Usage Type</label>
              <div className="rc-ai-usage-grid">
                {[
                  { value: 'none', label: 'None', desc: 'No AI involvement', icon: 'block' },
                  { value: 'assistive', label: 'Assistive', desc: 'AI helps players', icon: 'support_agent' },
                  { value: 'adversarial', label: 'Adversarial', desc: 'AI opposes players', icon: 'sports_kabaddi' },
                  { value: 'adaptive', label: 'Adaptive', desc: 'AI adjusts difficulty', icon: 'tune' },
                  { value: 'generative', label: 'Generative', desc: 'AI generates content', icon: 'auto_awesome' }
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`rc-usage-card ${formData.aiUsageType === opt.value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, aiUsageType: opt.value }))}
                  >
                    <span className="material-icons-round">{opt.icon}</span>
                    <strong>{opt.label}</strong>
                    <small>{opt.desc}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">AI Interaction Features</label>
              <div className="rc-ai-grid">
                <div
                  className={`rc-checkbox-card ${aiFeatures.hints ? 'selected' : ''}`}
                  onClick={() => handleAiFeatureChange('hints')}
                >
                  <input type="checkbox" checked={aiFeatures.hints} readOnly className="rc-checkbox" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>Hints</strong>
                    <small style={{ color: '#64748b' }}>Provide periodic guidance</small>
                  </div>
                </div>

                <div
                  className={`rc-checkbox-card ${aiFeatures.recommendations ? 'selected' : ''}`}
                  onClick={() => handleAiFeatureChange('recommendations')}
                >
                  <input type="checkbox" checked={aiFeatures.recommendations} readOnly className="rc-checkbox" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>Recommendations</strong>
                    <small style={{ color: '#64748b' }}>Suggest specific actions</small>
                  </div>
                </div>

                <div
                  className={`rc-checkbox-card ${aiFeatures.explanations ? 'selected' : ''}`}
                  onClick={() => handleAiFeatureChange('explanations')}
                >
                  <input type="checkbox" checked={aiFeatures.explanations} readOnly className="rc-checkbox" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>Explanations</strong>
                    <small style={{ color: '#64748b' }}>Justify AI logic to users</small>
                  </div>
                </div>

                <div
                  className={`rc-checkbox-card ${aiFeatures.confidenceScores ? 'selected' : ''}`}
                  onClick={() => handleAiFeatureChange('confidenceScores')}
                >
                  <input type="checkbox" checked={aiFeatures.confidenceScores} readOnly className="rc-checkbox" />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>Confidence Scores</strong>
                    <small style={{ color: '#64748b' }}>Show AI certainty levels</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="rc-form-group">
              <label className="rc-label">Game Mechanics &amp; Task Types</label>
              <textarea
                className="rc-textarea"
                rows="3"
                placeholder="Specify how AI interacts with game mechanics..."
                name="experimentalConditions"
                value={formData.experimentalConditions} onChange={handleChange}
              ></textarea>
            </div>
          </section>

        </form>
      </div>

      {/* Sidebar Summary */}
      <aside className="rc-sidebar">
        <div className="rc-summary-card">
          <div className="rc-summary-title">Project Summary</div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Project Name</div>
            <div className={`rc-summary-value ${formData.name ? 'filled' : ''}`}>
              {formData.name || "Not specified yet"}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Group</div>
            <div className={`rc-summary-value ${formData.groupId ? 'filled' : ''}`}>
              {selectedGroupName}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Category</div>
            <div className={`rc-summary-value ${formData.category ? 'filled' : ''}`}>
              {formData.category ? formData.category.replace('_', ' ') : "Not selected"}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Age Group</div>
            <div className={`rc-summary-value ${formData.ageGroup ? 'filled' : ''}`}>
              {formData.ageGroup || "Not selected"}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">AI Usage</div>
            <div className={`rc-summary-value ${formData.aiUsageType !== 'none' ? 'filled' : ''}`}>
              {formData.aiUsageType.charAt(0).toUpperCase() + formData.aiUsageType.slice(1)}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Research Tags</div>
            <div>
              {tagList.length === 0 && <span className="rc-summary-value" style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>None</span>}
              {tagList.map((tag, i) => (
                <span key={i} className="feature-tag">{tag}</span>
              ))}
            </div>
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">Consent Form</div>
            {formData.consentForm ? (
              <div className="rc-summary-value filled" style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icons-round" style={{ fontSize: '1rem' }}>check_circle</span> Uploaded
              </div>
            ) : (
              <div className="rc-summary-warning">
                <span className="material-icons-round" style={{ fontSize: '1rem' }}>warning</span> Missing
              </div>
            )}
          </div>

          <div className="rc-summary-item">
            <div className="rc-summary-label">AI Features</div>
            <div>
              {Object.entries(aiFeatures).filter(([, v]) => v).length === 0 && <span className="rc-summary-value" style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>None</span>}
              {Object.entries(aiFeatures).map(([key, val]) => val && (
                <span key={key} className="feature-tag">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.4' }}>
            Summary updates automatically as you complete the fields. All fields are required before submission.
          </div>
        </div>
      </aside>

      {/* Sticky Footer */}
      <div className="rc-footer">
        <button className="rc-btn-secondary" onClick={() => onSuccess ? onSuccess() : navigate(-1)}>Cancel</button>
        <div style={{ display: 'flex' }}>
          <button className="rc-btn-secondary"><span className="material-icons-round" style={{ fontSize: '1.1rem', marginRight: '6px' }}>save</span> Save Draft</button>
          <button className="rc-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit for Review"} <span className="material-icons-round">send</span>
          </button>
        </div>
      </div>


    </main>
  );
}
