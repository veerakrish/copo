import React, { useState, useEffect } from 'react';
import './AISyllabusGenerator.css';

const AISyllabusGenerator = ({ onSyllabusGenerated, pos, psos }) => {
  const [units, setUnits] = useState([
    { unitNo: 1, text: '', co: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [referenceRequest, setReferenceRequest] = useState(null);

  // Constants for NBA Compliance
  const TOTAL_HOURS_BUDGET = 50;

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      // Logic to close any hanging SSE if user leaves page
    };
  }, []);

  const addUnit = () => {
    if (units.length >= 5) {
      setError('Maximum 5 units allowed');
      return;
    }
    setUnits([...units, { unitNo: units.length + 1, text: '', co: '' }]);
    setError('');
  };

  const removeUnit = (index) => {
    if (units.length === 1) {
      setError('At least one unit is required');
      return;
    }
    const newUnits = units.filter((_, i) => i !== index);
    const renumberedUnits = newUnits.map((unit, i) => ({
      ...unit,
      unitNo: i + 1
    }));
    setUnits(renumberedUnits);
    setError('');
  };

  const updateUnitText = (index, text) => {
    const newUnits = [...units];
    newUnits[index].text = text;
    setUnits(newUnits);
    setError('');
  };

  const updateUnitCO = (index, co) => {
    const newUnits = [...units];
    newUnits[index].co = co;
    setUnits(newUnits);
    setError('');
  };

  const handleGenerate = async () => {
    setError('');
    setReferenceRequest(null);
    setLoading(true);
    setStatusMessage('Initializing Agentic System...');

    // Validation
    const invalidUnits = units.filter(u => !u.text.trim() || !u.co.trim());
    if (invalidUnits.length > 0) {
      setError(`Unit ${invalidUnits[0].unitNo} is incomplete.`);
      setLoading(false);
      return;
    }

    const clientId = `client-${Math.random().toString(36).substr(2, 9)}`;
    const eventSource = new EventSource(`/api/ai/status/${clientId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setStatusMessage(data.status);
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    eventSource.onerror = () => {
      // SSE is non-critical for the actual result, so we just log it
      console.warn('Status updates disconnected, but generation continues...');
      eventSource.close();
    };

    try {
      const response = await fetch('/api/ai/generate-ilos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units: units.map(u => ({ text: u.text, co: u.co, unitNo: u.unitNo })),
          pos: pos || [],
          psos: psos || [],
          clientId: clientId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // FORMALIZING DATA CONTRACT:
        // We ensure the 'cos' array is populated for the parent component
        const formattedCos = units.map(u => ({
          coNo: u.unitNo,
          statement: u.co
        }));

        const syllabusData = {
          units: data.units,
          cos: formattedCos,
          pos: pos || [],
          psos: psos || []
        };

        if (data.didAnyUnitNeedReference) {
          const feedbackList = data.units
            .filter(u => u.needsReference)
            .map(u => `Unit ${u.unitNo}: ${u.auditFeedback || 'Requires more detail'}`);
          setReferenceRequest(feedbackList);
        }
        
        onSyllabusGenerated(syllabusData);
        setError('');
      }
    } catch (err) {
      console.error('Generation Error:', err);
      setError(err.message || 'The AI agents encountered an error. Please try again.');
    } finally {
      setLoading(false);
      setStatusMessage('');
      eventSource.close();
    }
  };

  return (
    <div className="ai-syllabus-generator">
      <div className="form-container">
        <header className="generator-header">
          <h2>Agentic Syllabus Generator</h2>
          <span className="badge">Target: {TOTAL_HOURS_BUDGET} Hours</span>
        </header>
        
        <p className="description">
          Our three-stage Agentic Pipeline (Planner, Executor, Auditor) ensures 
          NBA compliance with high-density CO-PO mappings.
        </p>

        {error && <div className="error-message">⚠️ {error}</div>}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="status-indicator">{statusMessage}</p>
            <p className="loading-note">
              Agents are reasoning and mapping (Attempts: 1-3 per unit). 
              Average wait time: 45-90 seconds.
            </p>
          </div>
        )}

        {referenceRequest && (
          <div className="info-box warning-box reference-request">
            <h4>⚠️ Low Alignment Detected</h4>
            <p>The Auditor Agent flagged these units for low mapping strength:</p>
            <ul>
              {referenceRequest.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            <p className="hint">Tip: Add more specific technical keywords to the syllabus text below.</p>
          </div>
        )}

        <div className="units-scroll-area">
          {units.map((unit, index) => (
            <div key={index} className="unit-input-section animate-in">
              <div className="unit-header">
                <h3>Unit {unit.unitNo}</h3>
                {units.length > 1 && (
                  <button
                    className="btn-text-danger"
                    onClick={() => removeUnit(index)}
                    disabled={loading}
                  >
                    × Remove
                  </button>
                )}
              </div>
              
              <div className="form-group">
                <label>Course Outcome Statement (CO{unit.unitNo}):</label>
                <textarea
                  value={unit.co}
                  onChange={(e) => updateUnitCO(index, e.target.value)}
                  placeholder="Students will be able to design and implement..."
                  rows="2"
                  disabled={loading}
                  className="co-textarea"
                />
              </div>

              <div className="form-group">
                <label>Syllabus Content (Topics):</label>
                <textarea
                  value={unit.text}
                  onChange={(e) => updateUnitText(index, e.target.value)}
                  placeholder="Topic 1, Topic 2, ... (Separate with commas or new lines)"
                  rows="6"
                  disabled={loading}
                  className="content-textarea"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          {units.length < 5 && (
            <button
              className="btn btn-secondary"
              onClick={addUnit}
              disabled={loading}
            >
              + Add Unit
            </button>
          )}
          
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || units.some(u => !u.text.trim() || !u.co.trim())}
          >
            {loading ? 'Agents Working...' : 'Generate Syllabus'}
          </button>
        </div>

        <footer className="agent-features">
          <div className="feature"><span>📅</span> Planner: Budgeting</div>
          <div className="feature"><span>🛠️</span> Executor: Mapping</div>
          <div className="feature"><span>⚖️</span> Auditor: Compliance</div>
        </footer>
      </div>
    </div>
  );
};

export default AISyllabusGenerator;
