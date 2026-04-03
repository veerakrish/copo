import React, { useState } from 'react';
import './App.css';
import SyllabusInput from './components/SyllabusInput';
import SyllabusTable from './components/SyllabusTable';
import MatricesView from './components/MatricesView';
import AISyllabusGenerator from './components/AISyllabusGenerator';
import SavedMatricesView from './components/SavedMatricesView';

// Default POs and PSOs
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

  const handleSyllabusSubmit = (data) => {
    setSyllabusData(data);
    setActiveTab('table');
  };

  const handleMatricesCalculate = (calculatedMatrices) => {
    setMatrices(calculatedMatrices);
    setActiveTab('matrices');
  };

  const handleAISyllabusGenerated = async (data) => {
    setSyllabusData(data);
    setActiveTab('table');
    
    // Automatically calculate matrices
    try {
      const response = await fetch('/api/matrices/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const calculatedMatrices = await response.json();
        setMatrices(calculatedMatrices);
      }
    } catch (err) {
      console.error('Error calculating matrices:', err);
    }
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
              Matrices
            </button>
          )}
          <button 
            className={activeTab === 'saved' ? 'active' : ''} 
            onClick={() => setActiveTab('saved')}
          >
            Saved Matrices
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
            onCalculateMatrices={handleMatricesCalculate}
          />
        )}
        {activeTab === 'table' && syllabusData && (
          <SyllabusTable data={syllabusData} />
        )}
        {activeTab === 'matrices' && matrices && (
          <MatricesView matrices={matrices} syllabusData={syllabusData} />
        )}
        {activeTab === 'saved' && (
          <SavedMatricesView />
        )}
      </main>
    </div>
  );
}

export default App;
