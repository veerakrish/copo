import React from 'react';
import './SyllabusTable.css';

const SyllabusTable = ({ data }) => {
  const { units } = data;
  
  // Flatten topics with unit info
  const allTopics = [];
  units.forEach(unit => {
    unit.topics.forEach((topic, index) => {
      allTopics.push({
        sno: allTopics.length + 1,
        unitNo: unit.unitNo,
        topicName: topic.topicName,
        hours: topic.hours,
        pos: topic.pos,
        psos: topic.psos || '',
        });
    });
  });

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "S.No,Unit No,Topic Name,Hours,POs,PSOs\n";
    
    allTopics.forEach(topic => {
      // Escape commas in topicName by wrapping in quotes
      const safeTopicName = `"${topic.topicName.replace(/"/g, '""')}"`;
      const row = `${topic.sno},${topic.unitNo},${safeTopicName},${topic.hours},"${topic.pos}","${topic.psos || ''}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "syllabus_table.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-container">
      <div className="table-header-container">
        <h2>Syllabus Table</h2>
        <button className="btn btn-secondary btn-small" onClick={downloadCSV}>
          Export to CSV
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Unit No</th>
            <th>Topic Name</th>
            <th>Hours</th>
            <th>POs</th>
            <th>PSOs</th>
          </tr>
        </thead>
        <tbody>
          {allTopics.map((topic, index) => (
            <tr key={index}>
              <td>{topic.sno}</td>
              <td>{topic.unitNo}</td>
              <td>{topic.topicName}</td>
              <td>{topic.hours}</td>
              <td>{topic.pos}</td>
              <td>{topic.psos || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h3>Summary</h3>
        <p><strong>Total Units:</strong> {units.length}</p>
        <p><strong>Total Topics:</strong> {allTopics.length}</p>
        <p><strong>Total Classes:</strong> {units.reduce((sum, u) => sum + u.totalClasses, 0)}</p>
        <p><strong>Total Hours:</strong> {allTopics.reduce((sum, t) => sum + t.hours, 0)}</p>
      </div>
    </div>
  );
};

export default SyllabusTable;
