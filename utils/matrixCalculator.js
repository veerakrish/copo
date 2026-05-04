/**
 * Utility functions for calculating CO-PO and CO-PSO mapping matrices
 */

/**
 * Parse PO/PSO range notation (e.g., "PO1-PO4" or "PSO1,PSO2")
 */
function parsePORange(poString) {
  const pos = [];
  if (!poString || typeof poString !== 'string') return pos;
  
  const parts = poString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const match = trimmed.match(/(PO|PSO)\s*(\d+)\s*-\s*(PO|PSO)\s*(\d+)/i);
      if (match) {
        const start = parseInt(match[2]);
        const end = parseInt(match[4]);
        if (start && end) {
          for (let i = start; i <= end; i++) {
            pos.push(i);
          }
        }
      }
    } else {
      const match = trimmed.match(/(PO|PSO)\s*(\d+)/i);
      if (match) {
        pos.push(parseInt(match[2]));
      }
    }
  }
  
  return pos;
}

/**
 * Parse CO from topic mapping (e.g., "CO1" -> 1)
 */
function parseCO(coString) {
  if (typeof coString === 'number') return coString;
  if (!coString) return null;
  const match = coString.match(/CO(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Calculate Mapping Matrix for POs or PSOs
 */
function calculateMappingMatrix(units = [], type, outcomes = []) {
  const matrix = {};
  
  // Ensure units is an array
  const safeUnits = Array.isArray(units) ? units : [];
  const coList = safeUnits.map((_, index) => index + 1);

  coList.forEach(co => {
    matrix[co] = {};
    const unit = safeUnits[co - 1];
    if (!unit) return;

    // AI FIX: AI uses 'totalHours', manual uses 'totalClasses'. Handle both.
    const denominator = unit.totalClasses || unit.totalHours || 1; 
    
    // SAFE TOPICS: Handle case where AI might fail to generate topics array
    const topics = Array.isArray(unit.topics) ? unit.topics : [];

    outcomes.forEach(outcome => {
      const outNo = outcome.poNo || outcome.psoNo;
      let numerator = 0;
      
      topics.forEach(topic => {
        const poValue = type === 'PO' ? topic.pos : topic.psos;
        const topicOutcomes = parsePORange(poValue);
        
        if (topicOutcomes.includes(outNo)) {
          // Use 0 if hours is missing
          numerator += parseFloat(topic.hours) || 0; 
        }
      });

      if (numerator > 0) {
        matrix[co][outNo] = {
          numerator: Math.round(numerator * 100) / 100,
          denominator: denominator,
          value: numerator / denominator
        };
      }
    });
  });
  return matrix;
}

/**
 * Calculate Strength Matrix
 */
function calculateStrengthMatrix(mappingMatrix = {}) {
  const strengthMatrix = {};
  
  Object.keys(mappingMatrix).forEach(co => {
    strengthMatrix[co] = {};
    Object.keys(mappingMatrix[co]).forEach(outNo => {
      const cell = mappingMatrix[co][outNo];
      
      // Prevent division by zero or undefined
      const denom = cell.denominator || 1;
      const percentage = (cell.numerator / denom) * 100;
      
      let weight = 1;
      if (percentage >= 70) weight = 3;
      else if (percentage >= 50) weight = 2;

      strengthMatrix[co][outNo] = {
        percentage: Math.round(percentage * 100) / 100,
        weight: weight
      };
    });
  });
  return strengthMatrix;
}

/**
 * Calculate Articulation Matrix
 */
function calculateArticulationMatrix(mappingMatrix = {}, strengthMatrix = {}) {
  const articulationMatrix = {};
  
  Object.keys(mappingMatrix).forEach(co => {
    articulationMatrix[co] = {};
    Object.keys(mappingMatrix[co]).forEach(outNo => {
      const strengthWeight = (strengthMatrix[co] && strengthMatrix[co][outNo]) 
        ? strengthMatrix[co][outNo].weight 
        : 1;
      articulationMatrix[co][outNo] = strengthWeight;
    });
  });
  return articulationMatrix;
}

/**
 * Calculate PO/PSO Averages
 */
function calculateAverages(articulationMatrix = {}, outcomes = [], type) {
  const averages = {};
  
  outcomes.forEach(out => {
    const outNo = type === 'PO' ? out.poNo : out.psoNo;
    const values = [];
    
    Object.keys(articulationMatrix).forEach(co => {
      if (articulationMatrix[co] && articulationMatrix[co][outNo] !== undefined) {
        values.push(articulationMatrix[co][outNo]);
      }
    });

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      averages[outNo] = { 
        sum, 
        count: values.length, 
        average: Math.round((sum / values.length) * 100) / 100 
      };
    } else {
      averages[outNo] = { sum: 0, count: 0, average: 0 };
    }
  });
  return averages;
}

/**
 * Main function to calculate all matrices
 */
function calculateMatrices(units, cos, pos, psos) {
  // Defensive fallbacks for parameters
  const safeUnits = Array.isArray(units) ? units : [];
  const safePos = Array.isArray(pos) ? pos : [];
  const safePsos = Array.isArray(psos) ? psos : [];

  // Mapping Matrices
  const coPOMappingMatrix = calculateMappingMatrix(safeUnits, 'PO', safePos);
  const coPSOMappingMatrix = calculateMappingMatrix(safeUnits, 'PSO', safePsos);

  // Strength Matrices
  const coPOStrengthMatrix = calculateStrengthMatrix(coPOMappingMatrix);
  const coPSOStrengthMatrix = calculateStrengthMatrix(coPSOMappingMatrix);

  // Articulation Matrices
  const coPOArticulationMatrix = calculateArticulationMatrix(coPOMappingMatrix, coPOStrengthMatrix);
  const coPSOArticulationMatrix = calculateArticulationMatrix(coPSOMappingMatrix, coPSOStrengthMatrix);

  // Averages
  const poAverages = calculateAverages(coPOArticulationMatrix, safePos, 'PO');
  const psoAverages = calculateAverages(coPSOArticulationMatrix, safePsos, 'PSO');

  return {
    coPOMappingMatrix,
    coPSOMappingMatrix,
    coPOStrengthMatrix,
    coPSOStrengthMatrix,
    coPOArticulationMatrix,
    coPSOArticulationMatrix,
    poAverages,
    psoAverages
  };
}

module.exports = {
  calculateMatrices,
  parsePORange,
  parseCO
};
