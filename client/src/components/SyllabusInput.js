import React, { useState } from 'react';
import './SyllabusInput.css';

const SyllabusInput = ({ onSubmit, onCalculateMatrices }) => {
  const [units, setUnits] = useState([
    { unitNo: 1, totalClasses: 10, topics: [{ topicName: '', hours: 1, cos: ['CO1'], pos: '', psos: '' }] },
  ]);
  const [pos, setPos] = useState([
    { poNo: 1, description: 'Engineering Knowledge' },
    { poNo: 2, description: 'Problem Analysis' },
    { poNo: 3, description: 'Design/Development of Solutions' },
    { poNo: 4, description: 'Conduct Investigations' },
    { poNo: 5, description: 'Modern Tool Usage' },
    { poNo: 6, description: 'The Engineer and Society' },
    { poNo: 7, description: 'Environment and Sustainability' },
    { poNo: 8, description: 'Ethics' },
    { poNo: 9, description: 'Individual and Team Work' },
    { poNo: 10, description: 'Communication' },
    { poNo: 11, description: 'Project Management and Finance' },
    { poNo: 12, description: 'Life-long Learning' }
  ]);
  const [psos, setPsos] = useState([
    { psoNo: 1, description: 'Ability to apply in depth problem solving and programming skills' },
    { psoNo: 2, description: 'Ability to do collaborative development of software solutions' },
    { psoNo: 3, description: 'Ability to design and integrate hardware and software components' }
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addUnit = () => {
    if (units.length >= 5) { setError('Maximum 5 units allowed'); return; }
    const newUnitNo = units.length + 1;
    setUnits([...units, {
      unitNo: newUnitNo,
      totalClasses: 10,
      topics: [{ topicName: '', hours: 1, cos: [`CO${newUnitNo}`], pos: '', psos: '' }]
    }]);
    setError('');
  };

  const removeUnit = (unitIndex) => {
    if (units.length === 1) { setError('At least one unit is required'); return; }
    const newUnits = units.filter((_, i) => i !== unitIndex);
    newUnits.forEach((u, i) => { u.unitNo = i + 1; });
    setUnits(newUnits);
    setError('');
  };

  const updateUnitClasses = (unitIndex, val) => {
    const newUnits = [...units];
    newUnits[unitIndex].totalClasses = parseFloat(val) || 0;
    setUnits(newUnits);
  };

  const addTopic = (unitIndex) => {
    const newUnits = [...units];
    const unitNo = newUnits[unitIndex].unitNo;
    newUnits[unitIndex].topics.push({ topicName: '', hours: 1, cos: [`CO${unitNo}`], pos: '', psos: '' });
    setUnits(newUnits);
  };

  const removeTopic = (unitIndex, topicIndex) => {
    const newUnits = [...units];
    if (newUnits[unitIndex].topics.length === 1) { setError('At least one topic per unit'); return; }
    newUnits[unitIndex].topics.splice(topicIndex, 1);
    setUnits(newUnits);
    setError('');
  };

  const updateTopic = (unitIndex, topicIndex, field, value) => {
    const newUnits = [...units];
    if (field === 'hours') {
      newUnits[unitIndex].topics[topicIndex].hours = parseFloat(value) || 0;
    } else {
      newUnits[unitIndex].topics[topicIndex][field] = value;
    }
    setUnits(newUnits);
  };

  const getUnitTopicHours = (unit) => unit.topics.reduce((sum, t) => sum + t.hours, 0);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validate
    for (const unit of units) {
      if (unit.topics.length === 0) {
        setError(`Unit ${unit.unitNo} has no topics.`);
        return;
      }
      for (const topic of unit.topics) {
        if (!topic.topicName.trim()) {
          setError(`Unit ${unit.unitNo} has a topic without a name.`);
          return;
        }
        if (!topic.pos.trim()) {
          setError(`Unit ${unit.unitNo} topic "${topic.topicName}" is missing PO mapping.`);
          return;
        }
      }
      const topicHours = getUnitTopicHours(unit);
      if (topicHours !== unit.totalClasses) {
        setError(`Unit ${unit.unitNo}: topic hours (${topicHours}) don't match total classes (${unit.totalClasses}).`);
        return;
      }
    }

    const syllabusData = { units, cos: [], pos, psos };
    onSubmit(syllabusData);

    try {
      const response = await fetch('/api/matrices/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syllabusData),
      });

      if (response.ok) {
        const matrices = await response.json();
        onCalculateMatrices(matrices);
        setSuccess('Matrices calculated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to calculate matrices');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to calculate matrices.');
    }
  };

  return (
    <div className="syllabus-input">
      <div className="form-container">
        <h2>Manual Syllabus Input</h2>
        <p className="description">Enter your syllabus topics, hours, and PO/PSO mappings below. Matrices will be calculated automatically.</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {units.map((unit, unitIndex) => (
          <div key={unitIndex} className="unit-section">
            <div className="unit-header">
              <h3>Unit {unit.unitNo}</h3>
              <div className="unit-header-controls">
                <label>Total Hours: </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={unit.totalClasses}
                  onChange={(e) => updateUnitClasses(unitIndex, e.target.value)}
                  style={{ width: '70px' }}
                />
                <span className="hours-info">
                  (Topics: {getUnitTopicHours(unit)}h)
                </span>
                {units.length > 1 && (
                  <button className="btn btn-danger btn-small" onClick={() => removeUnit(unitIndex)}>
                    Remove Unit
                  </button>
                )}
              </div>
            </div>

            <div className="syllabus-table-input">
              <table>
                <thead>
                  <tr>
                    <th style={{width: '40px'}}>S.No</th>
                    <th style={{width: '40%'}}>Topic Name (ILO)</th>
                    <th style={{width: '60px'}}>Hours</th>
                    <th style={{width: '90px'}}>CO</th>
                    <th>POs</th>
                    <th>PSOs</th>
                    <th style={{width: '60px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {unit.topics.map((topic, topicIndex) => (
                    <tr key={topicIndex}>
                      <td className="sno-cell">{topicIndex + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={topic.topicName}
                          onChange={(e) => updateTopic(unitIndex, topicIndex, 'topicName', e.target.value)}
                          placeholder="e.g., Understand KVL and KCL in DC circuits"
                          className="table-input topic-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={topic.hours}
                          onChange={(e) => updateTopic(unitIndex, topicIndex, 'hours', e.target.value)}
                          className="table-input hours-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={topic.cos.join(',')}
                          onChange={(e) => {
                            const newUnits = [...units];
                            newUnits[unitIndex].topics[topicIndex].cos = e.target.value.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                            setUnits(newUnits);
                          }}
                          placeholder={`CO${unit.unitNo}`}
                          className="table-input co-input-cell"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={topic.pos}
                          onChange={(e) => updateTopic(unitIndex, topicIndex, 'pos', e.target.value)}
                          placeholder="PO1,PO2,PO3"
                          className="table-input po-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={topic.psos}
                          onChange={(e) => updateTopic(unitIndex, topicIndex, 'psos', e.target.value)}
                          placeholder="PSO1"
                          className="table-input pso-input"
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-small btn-remove-row"
                          onClick={() => removeTopic(unitIndex, topicIndex)}
                          title="Remove topic"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-secondary btn-small add-topic-btn" onClick={() => addTopic(unitIndex)}>
                + Add Topic
              </button>
            </div>
          </div>
        ))}

        <div className="action-buttons">
          {units.length < 5 && (
            <button className="btn btn-secondary" onClick={addUnit}>
              + Add Unit {units.length + 1}
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit}>
            Calculate Matrices
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyllabusInput;
