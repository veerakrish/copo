import React, { useState } from 'react';
import './MatricesView.css';

const MatricesView = ({ matrices, syllabusData }) => {
  // Defensive Destructuring: Provide empty objects/arrays as fallbacks
  const { 
    coPOMappingMatrix = {}, coPOStrengthMatrix = {}, coPOArticulationMatrix = {},
    coPSOMappingMatrix = {}, coPSOStrengthMatrix = {}, coPSOArticulationMatrix = {},
    poAverages = {}, psoAverages = {} 
  } = matrices || {};

  const { pos = [], psos = [] } = syllabusData || {};

  const [courseName, setCourseName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  // Get CO keys safely and sort them numerically
  const cos = Object.keys(coPOMappingMatrix).length > 0 
    ? Object.keys(coPOMappingMatrix).sort((a, b) => parseInt(a) - parseInt(b))
    : [1, 2, 3, 4, 5]; // Fallback if matrix is empty
  
  const formatCO = (co) => `CO${co}`;

  // Combined outcomes: all POs then all PSOs
  const allOutcomes = [
    ...pos.map(p => ({ no: p.poNo, type: 'PO', label: `PO${p.poNo}` })),
    ...psos.map(p => ({ no: p.psoNo, type: 'PSO', label: `PSO${p.psoNo}` }))
  ];

  // Helper for safe data access
  const getCellData = (co, outcome, poData, psoData) => {
    const data = outcome.type === 'PO' ? poData : psoData;
    return data && data[co] && data[co][outcome.no] !== undefined ? data[co][outcome.no] : null;
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const addMatrixToCSV = (title, poData, psoData, valueType) => {
      csvContent += `${title}\n`;
      csvContent += `CO,${allOutcomes.map(o => o.label).join(',')}\n`;
      
      cos.forEach(co => {
        let row = formatCO(co);
        allOutcomes.forEach(out => {
          const cell = getCellData(co, out, poData, psoData);
          if (!cell) {
            row += `,`;
          } else if (valueType === 'mapping') {
            row += `,="${cell.numerator}/${cell.denominator}"`;
          } else if (valueType === 'strength') {
            row += `,${cell.percentage}%`;
          } else {
            // articulation or direct value
            row += `,${typeof cell === 'object' ? (cell.weight || '') : cell}`;
          }
        });
        csvContent += row + "\n";
      });

      if (valueType === 'articulation') {
        let avgRow = `Average`;
        allOutcomes.forEach(out => {
          const avgData = out.type === 'PO' ? poAverages[out.no] : psoAverages[out.no];
          const avg = avgData && avgData.count > 0 ? Math.round(avgData.average * 100) / 100 : '';
          avgRow += `,${avg}`;
        });
        csvContent += avgRow + "\n";
      }
      csvContent += "\n"; 
    };

    addMatrixToCSV('CO-PO-PSO Mapping Matrix', coPOMappingMatrix, coPSOMappingMatrix, 'mapping');
    addMatrixToCSV('CO-PO-PSO Strength Matrix', coPOStrengthMatrix, coPSOStrengthMatrix, 'strength');
    addMatrixToCSV('CO-PO-PSO Articulation Matrix', coPOArticulationMatrix, coPSOArticulationMatrix, 'articulation');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${courseName || 'matrices'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  const handleFinalize = async () => {
    if (!courseName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please enter a course name before finalizing.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: '', message: '' });

    try {
      const articulationData = {
        coPOArticulationMatrix,
        coPSOArticulationMatrix,
        poAverages,
        psoAverages,
        pos,
        psos,
        cos: cos.map(co => ({ no: co, label: `CO${co}` }))
      };

      const response = await fetch('/api/matrices/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseName, articulationData }),
      });

      const data = await response.json();
      if (response.ok) {
        setSaveStatus({ type: 'success', message: data.message });
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderCombinedMatrix = (title, poData, psoData, valueType) => (
    <div className="matrix-container">
      <h2>{title}</h2>
      <div className="matrix-table">
        <table>
          <thead>
            <tr>
              <th>CO</th>
              {allOutcomes.map(out => (
                <th key={out.label} className={out.type === 'PSO' ? 'pso-header' : ''}>
                  {out.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cos.map(co => (
              <tr key={co}>
                <td><strong>{formatCO(co)}</strong></td>
                {allOutcomes.map(out => {
                  const cell = getCellData(co, out, poData, psoData);
                  if (!cell) return <td key={out.label}>-</td>;

                  if (valueType === 'mapping') {
                    return <td key={out.label} className="matrix-cell">{cell.numerator}/{cell.denominator}</td>;
                  }
                  if (valueType === 'strength') {
                    return <td key={out.label} className="matrix-cell">{cell.percentage}%</td>;
                  }
                  return <td key={out.label} className="matrix-cell">{typeof cell === 'object' ? cell.weight : cell}</td>;
                })}
              </tr>
            ))}
            {valueType === 'articulation' && (
              <tr className="average-row">
                <td><strong>Average</strong></td>
                {allOutcomes.map(out => {
                  const avgData = out.type === 'PO' ? poAverages[out.no] : psoAverages[out.no];
                  const avg = avgData && avgData.count > 0 ? avgData.average : '-';
                  return <td key={out.label} className="matrix-cell">{avg}</td>;
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="matrices-view">
      <div className="matrices-actions no-print">
        <div className="finalize-section">
          <input 
            type="text" 
            placeholder="Course Name (e.g., CS301 - Microprocessors)"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="course-name-input"
            disabled={isSaving}
          />
          <button 
            className="btn btn-success" 
            onClick={handleFinalize}
            disabled={isSaving || !courseName.trim()}
          >
            {isSaving ? 'Finalizing...' : 'Finalize & Save'}
          </button>
        </div>
        <div className="action-buttons-group">
          <button className="btn btn-secondary" onClick={downloadCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={handlePrint}>Print Report</button>
        </div>
      </div>

      {saveStatus.message && (
        <div className={`status-banner ${saveStatus.type} no-print`}>
          {saveStatus.message}
        </div>
      )}

      <div className="justification-section">
        <h2>NBA Compliance Report</h2>
        <p>Generated by Agentic Auditor. Calculation utilizes fractional topic-level mapping for auditable transparency.</p>
      </div>

      <div className="matrices-content">
        {renderCombinedMatrix('1. Mapping Matrix', coPOMappingMatrix, coPSOMappingMatrix, 'mapping')}
        {renderCombinedMatrix('2. Strength Matrix', coPOStrengthMatrix, coPSOStrengthMatrix, 'strength')}
        {renderCombinedMatrix('3. Articulation Matrix', coPOArticulationMatrix, coPSOArticulationMatrix, 'articulation')}
      </div>
    </div>
  );
};

export default MatricesView;
