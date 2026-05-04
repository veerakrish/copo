import React from 'react';
import './SyllabusTable.css';

const SyllabusTable = ({ data }) => {
  // Defensive check for data and units
  const units = data?.units || [];
  
  // Flatten topics with unit info - with added safety guards
  const allTopics = [];
  units.forEach(unit => {
    // Ensure topics is an array before iterating
    const safeTopics = Array.isArray(unit.topics) ? unit.topics : [];
    
    safeTopics.forEach((topic) => {
      allTopics.push({
        sno: allTopics.length + 1,
        unitNo: unit.unitNo,
        topicName: topic.topicName || 'Unnamed Topic',
        hours: topic.hours || 0,
        pos: topic.pos || '-',
        psos: topic.psos || '-',
      });
    });
  });

  const downloadCSV = () => {
    if (allTopics.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No,Unit No,Topic Name,Hours,POs,PSOs\n";
    
    allTopics.forEach(topic => {
      // Escape commas and quotes in topicName
      const safeTopicName = `"${String(topic.topicName).replace(/"/g, '""')}"`;
      const row = `${topic.sno},${topic.unitNo},${safeTopicName},${topic.hours},"${topic.pos}","${topic.psos}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `syllabus_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if any unit needs attention based on Auditor Agent feedback
  const flaggedUnits = units.filter(u => u.needsReference);

  return (
    <div className="table-container">
      <div className="table-header-container">
        <header>
          <h2>Detailed Syllabus & Mapping</h2>
          {flaggedUnits.length > 0 && (
            <span className="warning-pill">⚠️ Review Required</span>
          )}
        </header>
        <button 
          className="btn btn-secondary btn-small" 
          onClick={downloadCSV}
          disabled={allTopics.length === 0}
        >
          Export CSV
        </button>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Unit</th>
              <th>Topic Name</th>
              <th>Hours</th>
              <th>POs Mapping</th>
              <th>PSOs Mapping</th>
            </tr>
          </thead>
          <tbody>
            {allTopics.length > 0 ? (
              allTopics.map((topic, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td>{topic.sno}</td>
                  <td className="center">U-{topic.unitNo}</td>
                  <td>{topic.topicName}</td>
                  <td className="center">{topic.hours}</td>
                  <td className="mapping-cell">{topic.pos}</td>
                  <td className="mapping-cell">{topic.psos}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-data">No syllabus data available. Try generating again.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="summary-dashboard">
        <div className="summary-card">
          <h3>Syllabus Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <label>Units</label>
              <span>{units.length}</span>
            </div>
            <div className="stat-item">
              <label>Topics</label>
              <span>{allTopics.length}</span>
            </div>
            <div className="stat-item">
              <label>Planned Hours</label>
              <span>{units.reduce((sum, u) => sum + (parseFloat(u.totalClasses) || 0), 0)}</span>
            </div>
            <div className="stat-item">
              <label>Actual Total</label>
              <span>{allTopics.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0)}</span>
            </div>
          </div>
        </div>

        {flaggedUnits.length > 0 && (
          <div className="summary-card auditor-feedback">
            <h3>🛡️ Auditor Agent Remarks</h3>
            <ul>
              {flaggedUnits.map((u, i) => (
                <li key={i}>
                  <strong>Unit {u.unitNo}:</strong> {u.auditFeedback || "Alignment strength is below threshold. Consider adding more detail."}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyllabusTable;
