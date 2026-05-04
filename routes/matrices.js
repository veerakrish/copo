import React, { useState } from 'react';
import './App.css';
import SyllabusInput from './components/SyllabusInput';
import SyllabusTable from './components/SyllabusTable';
import MatricesView from './components/MatricesView';
import AISyllabusGenerator from './components/AISyllabusGenerator';
import SavedMatricesView from './components/SavedMatricesView';

// Import the utility logic
import { calculateMatrices } from './utils/matrixCalculator';

// Default POs and PSOs for fallback and initial state
const defaultPOs = [
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
];

const defaultPSOs = [
  { psoNo: 1, description: 'Ability to apply in depth problem solving and programming skills' },
  { psoNo: 2, description: 'Ability to do collaborative development of software solutions' },
  { psoNo: 3, description: 'Ability to design and integrate hardware and software components' }
];

function App() {
  const [syllabusData, setSyllabusData] = useState(null);
  const [matrices, setMatrices] = useState(null);
  const [activeTab, setActiveTab] = useState('ai-generator');

  /**
   * Helper to clean data and calculate matrices locally
   */
  const performCalculation = (data) => {
    try {
      // Data Sanitization: Ensure numbers are numbers and arrays exist
      const sanitizedUnits = (data.units || []).map(unit => ({
        ...unit,
        // Ensure we have a valid denominator for the mapping formula
        totalClasses: parseFloat(unit.totalClasses || unit.totalHours || 10),
        topics: (unit.topics || []).map(topic => ({
          ...topic,
          hours: parseFloat(topic.hours || 0),
          pos: String(topic.pos || ""),
          psos: String(topic.psos || "")
        }))
      }));

      const finalData = {
        ...data,
        units: sanitizedUnits,
        pos: data.pos?.length > 0 ? data.pos : defaultPOs,
        psos: data.psos?.length > 0 ? data.psos : defaultPSOs
      };

      const result = calculateMatrices(
        finalData.units,
        null, // CO list is inferred from unit numbers
        finalData.pos,
        finalData.psos
      );

      console.log("Calculation Success:", result);
      setMatrices(result);
      setSyllabusData(finalData);
    } catch (err) {
      console.error("Matrix Calculation Logic Error:", err);
    }
  };

  /**
   * Handle Manual Input Submission
   */
  const handleSyllabusSubmit = (data) => {
    performCalculation(data);
    setActiveTab('table');
  };

  /**
   * Handle AI Generation Completion
   */
  const handleAISyllabusGenerated = (data) => {
    console.log("AI Data Received:", data);
    performCalculation(data);
    setActiveTab('table'); // Switch to table view so user can verify AI output
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>CO-PO Mapping System</h1>
        <nav className="nav-tabs">
          <button 
            className={activeTab === 'ai-generator' ? 'active' : ''} 
            onClick={() => setActiveTab('ai-generator')}
          >
            AI Generator
          </button>
          <button 
            className={activeTab === 'input' ? 'active' : ''} 
            onClick={() => setActiveTab('input')}
          >
            Manual Input
          </button>
          {syllabusData && (
            <button 
              className={activeTab === 'table' ? 'active' : ''} 
              onClick={() => setActiveTab('table')}
            >
              Syllabus Table
            </button>
          )}
          {matrices && (
            <button 
              className={activeTab === 'matrices' ? 'active' : ''} 
              onClick={() => setActiveTab('matrices')}
            >
              Mapping Matrices
            </button>
          )}
          <button 
            className={activeTab === 'saved' ? 'active' : ''} 
            onClick={() => setActiveTab('saved')}
          >
            Saved History
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'ai-generator' && (
          <AISyllabusGenerator 
            onSyllabusGenerated={handleAISyllabusGenerated}
            pos={defaultPOs}
            psos={defaultPSOs}
          />
        )}

        {activeTab === 'input' && (
          <SyllabusInput 
            onSubmit={handleSyllabusSubmit}
            pos={defaultPOs}
            psos={defaultPSOs}
          />
        )}

        {activeTab === 'table' && syllabusData && (
          <SyllabusTable data={syllabusData} />
        )}

        {activeTab === 'matrices' && matrices && (
          <MatricesView 
            matrices={matrices} 
            syllabusData={syllabusData} 
          />
        )}

        {activeTab === 'saved' && (
          <SavedMatricesView />
        )}
      </main>
      
      {/* Visual Feedback for empty states */}
      {!syllabusData && activeTab === 'table' && (
        <div className="empty-state">Please generate or input a syllabus first.</div>
      )}
    </div>
  );
}

export default App;
