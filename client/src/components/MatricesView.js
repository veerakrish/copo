import React, { useState } from 'react';
import './MatricesView.css';

const MatricesView = ({ matrices, syllabusData }) => {
  const { 
    coPOMappingMatrix, coPOStrengthMatrix, coPOArticulationMatrix,
    coPSOMappingMatrix, coPSOStrengthMatrix, coPSOArticulationMatrix,
    poAverages, psoAverages 
  } = matrices;
  const { pos, psos } = syllabusData;

  const [courseName, setCourseName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  const cos = Object.keys(coPOMappingMatrix).sort((a, b) => parseInt(a) - parseInt(b));
  
  const formatCO = (co) => `CO${co}`;

  // Combined outcomes: all POs then all PSOs
  const allOutcomes = [
    ...pos.map(p => ({ no: p.poNo, type: 'PO', label: `PO${p.poNo}` })),
    ...psos.map(p => ({ no: p.psoNo, type: 'PSO', label: `PSO${p.psoNo}` }))
  ];

  const getCellData = (co, outcome, poData, psoData) => {
    if (outcome.type === 'PO') {
      return poData[co] && poData[co][outcome.no] ? poData[co][outcome.no] : null;
    }
    return psoData[co] && psoData[co][outcome.no] ? psoData[co][outcome.no] : null;
  };

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    const addMatrixToCSV = (title, poData, psoData, valueType) => {
      csvContent += `${title}\n`;
      // Header row
      csvContent += `CO,${allOutcomes.map(o => o.label).join(',')}\n`;
      
      // Data rows
      cos.forEach(co => {
        let row = formatCO(co);
        allOutcomes.forEach(out => {
          const cell = getCellData(co, out, poData, psoData);
          if (!cell) {
            row += `,`;
          } else if (valueType === 'mapping') {
            row += `,="${cell.numerator}/${cell.denominator}"`; // Use ="..." to prevent excel date auto-formatting
          } else if (valueType === 'strength') {
            row += `,${cell.percentage}%`;
          } else if (valueType === 'articulation') {
            row += `,${cell}`;
          } else {
            row += `,${cell}`;
          }
        });
        csvContent += row + "\n";
      });

      // Add average row for articulation
      if (valueType === 'articulation') {
        let avgRow = `Average`;
        allOutcomes.forEach(out => {
          const avgData = out.type === 'PO' ? poAverages[out.no] : psoAverages[out.no];
          const avg = avgData && avgData.count > 0 ? Math.round(avgData.average * 100) / 100 : '';
          avgRow += `,${avg}`;
        });
        csvContent += avgRow + "\n";
      }
      csvContent += "\n"; // Empty line between tables
    };

    addMatrixToCSV('CO-PO-PSO Mapping Matrix', coPOMappingMatrix, coPSOMappingMatrix, 'mapping');
    addMatrixToCSV('CO-PO-PSO Strength Matrix', coPOStrengthMatrix, coPSOStrengthMatrix, 'strength');
    addMatrixToCSV('CO-PO-PSO Articulation Matrix', coPOArticulationMatrix, coPSOArticulationMatrix, 'articulation');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "co_po_matrices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFinalize = async () => {
    if (!courseName.trim()) {
      setSaveStatus({ type: 'error', message: 'Please enter a course name before finalizing.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: '', message: '' });

    try {
      // Prepare articulation data only
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseName,
          articulationData
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveStatus({ type: 'success', message: data.message });
        setCourseName('');
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Error finalizing project:', err);
      setSaveStatus({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderCombinedMatrix = (title, poData, psoData, valueType) => (
    <div className="matrix-container">
      <h2>{title}</h2>
      {valueType === 'mapping' && (
        <p className="matrix-note">Format: hours mapped / total hours. Blank cells indicate no mapping.</p>
      )}
      {valueType === 'strength' && (
        <p className="matrix-note">Percentage = (mapped hours / total hours) × 100. Based on this: ≥70% → Weight 3, ≥50% → Weight 2, &lt;50% → Weight 1.</p>
      )}
      {valueType === 'articulation' && (
        <p className="matrix-note">Weightage: 3 (High, ≥70%), 2 (Medium, ≥50%), 1 (Low, &lt;50%). Blank cells indicate no mapping.</p>
      )}
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
                  if (!cell) return <td key={out.label}></td>;

                  if (valueType === 'mapping') {
                    return <td key={out.label} className="matrix-cell">{cell.numerator}/{cell.denominator}</td>;
                  }
                  if (valueType === 'strength') {
                    return (
                      <td key={out.label} className="matrix-cell">
                        {cell.percentage}%
                      </td>
                    );
                  }
                  if (valueType === 'articulation') {
                    return <td key={out.label} className="matrix-cell">{cell}</td>;
                  }
                  return <td key={out.label} className="matrix-cell">{cell}</td>;
                })}
              </tr>
            ))}
            {valueType === 'articulation' && (
              <tr className="average-row">
                <td><strong>Average</strong></td>
                {allOutcomes.map(out => {
                  const avgData = out.type === 'PO' ? poAverages[out.no] : psoAverages[out.no];
                  const avg = avgData && avgData.count > 0 ? Math.round(avgData.average * 100) / 100 : '';
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
            placeholder="Enter Course Name (e.g., CS101 - IoT)"
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
            {isSaving ? 'Saving...' : 'Finalize & Save Project'}
          </button>
        </div>
        <div className="action-buttons-group">
          <button className="btn btn-secondary" onClick={downloadCSV}>Export Matrices to CSV</button>
          <button className="btn btn-primary" onClick={handlePrint}>Print / Save as PDF Report</button>
        </div>
      </div>

      {saveStatus.message && (
        <div className={`status-banner ${saveStatus.type} no-print`}>
          {saveStatus.message}
        </div>
      )}

      <div className="print-report-header">
        <h1>Course Syllabus and CO-PO-PSO Mapping Report</h1>
      </div>

      <div className="justification-section">
        <h2>Mapping Justification & Methodology</h2>
        <p>This document presents the detailed mapping of Course Outcomes (COs) to Program Outcomes (POs) and Program Specific Outcomes (PSOs) based on an outcome-based education framework.</p>
        
        <h3>1. Fractional Hours & Topic-Level Mapping</h3>
        <p>To ensure high fidelity in mapping, POs are mapped strictly at the <strong>topic level</strong> rather than broadly at the session level. We utilize fractional hours (e.g., 0.5, 1.5) to accurately reflect the genuine duration a specific outcome is exercised during complex, multi-topic sessions. This prevents credit inflation and ensures auditable alignment with NBA guidelines.</p>
        
        <h3>2. Matrix Computation Rules</h3>
        <ul>
          <li><strong>Mapping Matrix:</strong> Represents the ratio of (mapped hours for a PO under a CO) / (total hours for that CO).</li>
          <li><strong>Strength Matrix:</strong> Converts the mapping ratio into a percentage.</li>
          <li><strong>Articulation Matrix:</strong> Distributes weightage based on the strength threshold:
            <ul>
              <li>High (3): ≥ 70% alignment</li>
              <li>Medium (2): 50% - 69% alignment</li>
              <li>Low (1): &lt; 50% alignment</li>
            </ul>
          </li>
          <li><strong>Averages:</strong> The bottom row of the Articulation Matrix computes the average weightage assigned to each PO/PSO across all COs.</li>
        </ul>
      </div>

      <div className="matrices-content">
        {renderCombinedMatrix('CO-PO-PSO Mapping Matrix', coPOMappingMatrix, coPSOMappingMatrix, 'mapping')}
        {renderCombinedMatrix('CO-PO-PSO Strength Matrix', coPOStrengthMatrix, coPSOStrengthMatrix, 'strength')}
        {renderCombinedMatrix('CO-PO-PSO Articulation Matrix', coPOArticulationMatrix, coPSOArticulationMatrix, 'articulation')}
      </div>
    </div>
  );
};

export default MatricesView;
