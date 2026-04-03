import React, { useState, useEffect } from 'react';
import './SavedMatricesView.css';

const SavedMatricesView = () => {
  const [savedProjects, setSavedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchSavedProjects();
  }, []);

  const fetchSavedProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/matrices/finalized');
      if (!response.ok) throw new Error('Failed to fetch saved projects');
      const data = await response.json();
      setSavedProjects(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderArticulationMatrix = (data) => {
    const { coPOArticulationMatrix, coPSOArticulationMatrix, poAverages, psoAverages, pos, psos, cos } = data;

    const allOutcomes = [
      ...pos.map(p => ({ no: p.poNo, type: 'PO', label: `PO${p.poNo}` })),
      ...psos.map(p => ({ no: p.psoNo, type: 'PSO', label: `PSO${p.psoNo}` }))
    ];

    const getCellData = (coNo, outcome) => {
      if (outcome.type === 'PO') {
        return coPOArticulationMatrix[coNo] && coPOArticulationMatrix[coNo][outcome.no] 
          ? coPOArticulationMatrix[coNo][outcome.no] : null;
      }
      return coPSOArticulationMatrix[coNo] && coPSOArticulationMatrix[coNo][outcome.no] 
        ? coPSOArticulationMatrix[coNo][outcome.no] : null;
    };

    return (
      <div className="saved-matrix-content">
        <div className="matrix-table small">
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
                <tr key={co.no}>
                  <td><strong>{co.label}</strong></td>
                  {allOutcomes.map(out => (
                    <td key={out.label} className="matrix-cell">
                      {getCellData(co.no, out) || '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="average-row">
                <td><strong>Average</strong></td>
                {allOutcomes.map(out => {
                  const avgData = out.type === 'PO' ? poAverages[out.no] : psoAverages[out.no];
                  const avg = avgData && avgData.count > 0 ? Math.round(avgData.average * 100) / 100 : '-';
                  return <td key={out.label} className="matrix-cell">{avg}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-projects">Loading saved projects...</div>;
  if (error) return <div className="error-projects">Error: {error}</div>;

  return (
    <div className="saved-matrices-view">
      <div className="view-header">
        <h2>Finalized Articulation Matrices</h2>
        <button className="btn btn-secondary btn-small" onClick={fetchSavedProjects}>Refresh</button>
      </div>

      {savedProjects.length === 0 ? (
        <div className="no-projects-message">
          <p>No finalized projects found. Go to the Matrices tab to finalize and save a project.</p>
        </div>
      ) : (
        <div className="projects-list">
          {savedProjects.map((project) => (
            <div key={project.id} className={`project-card ${expandedId === project.id ? 'expanded' : ''}`}>
              <div className="project-card-header" onClick={() => toggleExpand(project.id)}>
                <div className="project-info">
                  <h3>{project.course_name}</h3>
                  <span className="project-date">Saved on: {new Date(project.created_at).toLocaleString()}</span>
                </div>
                <div className="project-stats">
                  <span>{project.articulation_data.cos.length} COs</span>
                  <button className="expand-button">{expandedId === project.id ? '▲ Hide Matrix' : '▼ View Matrix'}</button>
                </div>
              </div>
              {expandedId === project.id && (
                <div className="project-card-body">
                  {renderArticulationMatrix(project.articulation_data)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedMatricesView;
