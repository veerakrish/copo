import React, { useState } from 'react';
import './AISyllabusGenerator.css';

const AISyllabusGenerator = ({ onSyllabusGenerated, pos, psos }) => {
  const [units, setUnits] = useState([
    { unitNo: 1, text: '', co: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [referenceRequest, setReferenceRequest] = useState(null);

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
    newUnits.forEach((unit, i) => {
      unit.unitNo = i + 1;
    });
    setUnits(newUnits);
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

    const emptyUnits = units.filter(u => !u.text.trim());
    if (emptyUnits.length > 0) {
      setError(`Please provide syllabus text for Unit ${emptyUnits[0].unitNo}`);
      setLoading(false);
      return;
    }

    const emptyCO = units.filter(u => !u.co.trim());
    if (emptyCO.length > 0) {
      setError(`Please provide Course Outcome (CO) statement for Unit ${emptyCO[0].unitNo}`);
      setLoading(false);
      return;
    }

    const shortUnits = units.filter(u => u.text.trim().length < 50);
    if (shortUnits.length > 0) {
      setError(`Unit ${shortUnits[0].unitNo} content is too short.`);
      setLoading(false);
      return;
    }

    const clientId = `client-${Math.random().toString(36).substr(2, 9)}`;
    const eventSource = new EventSource(`/api/ai/status/${clientId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status) {
        setStatusMessage(data.status);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE Connection Error:', err);
      // Don't fail the whole request, just fallback to local status
    };

    try {
      const response = await fetch('/api/ai/generate-ilos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          units: units.map(u => ({ text: u.text, co: u.co })),
          pos: pos || [],
          psos: psos || [],
          clientId: clientId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ILOs (${response.status})`);
      }

      const data = await response.json();
      
      if (data.success) {
        const syllabusData = {
          units: data.units,
          cos: [],
          pos: pos || [],
          psos: psos || []
        };
        if (data.didAnyUnitNeedReference) {
          const feedbackList = data.units
            .filter(u => u.needsReference)
            .map(u => `Unit ${u.unitNo}: ${u.auditFeedback}`);
          setReferenceRequest(feedbackList);
        }
        
        onSyllabusGenerated(syllabusData);
        setError('');
      }
    } catch (err) {
      console.error('Error generating ILOs:', err);
      setError(err.message || 'Failed to generate ILOs.');
    } finally {
      setLoading(false);
      setStatusMessage('');
      eventSource.close();
    }
  };

  return (
    <div className="ai-syllabus-generator">
      <div className="form-container">
        <h2>Agentic Syllabus Generator</h2>
        <p className="description">
          Our three-stage Agentic Pipeline (Planner, Executor, Auditor) will now ensure 
          a strict 50-hour budget and high-density CO-PO mappings.
        </p>

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="status-indicator">{statusMessage}</p>
            <p className="loading-note">The Agents are reasoning, mapping, and auditing for quality (up to 3 attempts per unit). This may take up to 2-3 minutes...</p>
          </div>
        )}

        {referenceRequest && (
          <div className="info-box warning-box reference-request">
            <h4>⚠️ Academic Reference Required</h4>
            <p>The AI Auditor could not achieve Strength 3 (High Alignment) for some units after 3 attempts. This usually happens when the syllabus content is too brief or disconnected from the Course Outcome.</p>
            <p><strong>Please provide a textbook name or reference material for the following units to help the agents revise the statements better:</strong></p>
            <ul>
              {referenceRequest.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            <div className="form-group" style={{marginTop: '15px'}}>
              <label>Provide Reference/Textbook Info:</label>
              <input type="text" placeholder="e.g., 'Modern Operating Systems' by Andrew S. Tanenbaum, 4th Edition" className="co-input" />
              <p className="loading-note">Note: For now, you can refine your syllabus text below and try generating again with more detail.</p>
            </div>
          </div>
        )}

        {units.map((unit, index) => (
          <div key={index} className="unit-input-section">
            <div className="unit-header">
              <h3>Unit {unit.unitNo}</h3>
              {units.length > 1 && (
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeUnit(index)}
                  disabled={loading}
                >
                  Remove Unit
                </button>
              )}
            </div>
            <div className="form-group">
              <label>Course Outcome (CO{unit.unitNo}):</label>
              <textarea
                value={unit.co}
                onChange={(e) => updateUnitCO(index, e.target.value)}
                placeholder={`e.g., CO${unit.unitNo}: Students will be able to understand and apply...`}
                rows="3"
                disabled={loading}
                className="co-input"
              />
            </div>
            <div className="form-group">
              <label>Syllabus Content:</label>
              <textarea
                value={unit.text}
                onChange={(e) => updateUnitText(index, e.target.value)}
                placeholder={`Enter syllabus for Unit ${unit.unitNo}...`}
                rows="8"
                disabled={loading}
              />
            </div>
          </div>
        ))}

        <div className="action-buttons">
          {units.length < 5 && (
            <button
              className="btn btn-secondary"
              onClick={addUnit}
              disabled={loading}
            >
              Add Unit {units.length + 1}
            </button>
          )}
          
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || units.some(u => !u.text.trim() || !u.co.trim())}
          >
            {loading ? 'Processing...' : 'Generate with Agents'}
          </button>
        </div>

        <div className="info-box agentic-info">
          <h4>Agentic System Features:</h4>
          <ul>
            <li><strong>Planner Agent:</strong> Enforces exactly 50 total hours.</li>
            <li><strong>Executor Agent:</strong> Ensures dense mapping (3+ POs per topic).</li>
            <li><strong>Auditor Agent:</strong> Validates for NBA compliance and Weightage 3.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AISyllabusGenerator;
