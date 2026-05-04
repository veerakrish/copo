import React, { useState } from 'react';
import './App.css';
import SyllabusInput from './components/SyllabusInput';
import SyllabusTable from './components/SyllabusTable';
import MatricesView from './components/MatricesView';
import AISyllabusGenerator from './components/AISyllabusGenerator';
import SavedMatricesView from './components/SavedMatricesView';

// Import the utility directly to avoid unnecessary API calls
import { calculateMatrices } from '../../utils/matrixCalculator';
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
    // Ensure PO/PSO defaults are attached if missing
    const fullData = {
      ...data,
      pos: data.pos || defaultPOs,
      psos: data.psos || defaultPSOs
    };
    setSyllabusData(fullData);
    setActiveTab('table');
  };

  const handleMatricesCalculate = (calculatedMatrices) => {
    setMatrices(calculatedMatrices);
    setActiveTab('matrices');
  };

  const handleAISyllabusGenerated = (data) => {
    console.log("AI Syllabus Received:", data);

    // 1. Prepare data for calculation
    // Ensure we use default POs/PSOs if the AI didn't return them
    const finalData = {
      ...data,
      pos: data.pos && data.pos.length > 0 ? data.pos : defaultPOs,
      psos: data.psos && data.psos.length > 0 ? data.psos : defaultPSOs
    };

    // 2. Local Calculation (Reliable & Fast)
    try {
      const calculated = calculateMatrices(
        finalData.units,
        null, // cos is handled internally by unitNo
        finalData.pos,
        finalData.psos
      );

      console.log("Matrices Calculated Successfully:", calculated);
      
      setSyllabusData(finalData);
      setMatrices(calculated);
      setActiveTab('table'); // Move to table first to let user see data
    } catch (err) {
      console.error("Matrix Calculation Failed:", err);
      setSyllabusData(finalData);
      setActiveTab('table');
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
            pos={defaultPOs}
            psos={defaultPSOs}
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
