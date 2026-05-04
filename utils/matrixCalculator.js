/**
 * Utility functions for calculating CO-PO and CO-PSO mapping matrices
 */

/**
 * Parse PO/PSO range notation (e.g., "PO1-PO4" or "PSO1,PSO2")
 */
function parsePORange(poString) {
  const outcomes = [];
  if (!poString || typeof poString !== 'string') return outcomes;
  
  const parts = poString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    // Match range like PO1-PO4
    if (trimmed.includes('-')) {
      const match = trimmed.match(/(PO|PSO)\s*(\d+)\s*-\s*(PO|PSO)\s*(\d+)/i);
      if (match) {
        const start = parseInt(match[2]);
        const end = parseInt(match[4]);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            outcomes.push(i);
          }
        }
      }
    } else {
      // Match single like PO1
      const match = trimmed.match(/(PO|PSO)\s*(\d+)/i);
      if (match) {
        outcomes.push(parseInt(match[2]));
      }
    }
  }
  
  return [...new Set(outcomes)]; // Return unique outcome numbers
}

/**
 * Calculate Mapping Matrix
 * Formula: (Sum of hours of topics mapped to PO) / (Total Classes in Unit)
 */
function calculateMappingMatrix(units = [], type, outcomes = []) {
  const matrix = {};
  
  const safeUnits = Array.isArray(units) ? units : [];

  safeUnits.forEach((unit, index) => {
    // Use actual unitNo if available, otherwise fallback to index + 1
    const coNo = unit.unitNo || (index + 1);
    matrix[coNo] = {};

    // Denominator safety: Use totalClasses or totalHours
    const denominator = parseFloat(unit.totalClasses) || parseFloat(unit.totalHours) || 1;
    const topics = Array.isArray(unit.topics) ? unit.topics : [];

    outcomes.forEach(outcome => {
      const outNo = outcome.poNo || outcome.psoNo;
      let mappedHours = 0;
      
      topics.forEach(topic => {
        const poValue = type === 'PO' ? topic.pos : topic.psos;
        const topicOutcomes = parsePORange(poValue);
        
        if (topicOutcomes.includes(outNo)) {
          mappedHours += parseFloat(topic.hours) || 0;
        }
      });

      if (mappedHours > 0) {
        matrix[coNo][outNo] = {
          numerator: Math.round(mappedHours * 100) / 100,
          denominator: denominator,
          value: mappedHours / denominator
        };
      }
    });
  });
  return matrix;
}

/**
 * Calculate Strength Matrix
 * Displays the percentage of mapping
 */
function calculateStrengthMatrix(mappingMatrix = {}) {
  const strengthMatrix = {};
  
  Object.keys(mappingMatrix).forEach(co => {
    strengthMatrix[co] = {};
    Object.keys(mappingMatrix[co]).forEach(outNo => {
      const cell = mappingMatrix[co][outNo];
      const percentage = (cell.numerator / cell.denominator) * 100;
      
      strengthMatrix[co][outNo] = {
        percentage: Math.round(percentage * 100) / 100,
        // Helper values for the frontend
        numerator: cell.numerator,
        denominator: cell.denominator
      };
    });
  });
  return strengthMatrix;
}

/**
 * Calculate Articulation Matrix
 * Rules:
 * >= 70% -> 3
 * >= 50% -> 2
 * < 50%  -> 1 (If mapping exists)
 */
function calculateArticulationMatrix(strengthMatrix = {}) {
  const articulationMatrix = {};
  
  Object.keys(strengthMatrix).forEach(co => {
    articulationMatrix[co] = {};
    Object.keys(strengthMatrix[co]).forEach(outNo => {
      const percentage = strengthMatrix[co][outNo].percentage;
      
      let weight = 0;
      if (percentage >= 70) weight = 3;
      else if (percentage >= 50) weight = 2;
      else if (percentage > 0) weight = 1;

      if (weight > 0) {
        articulationMatrix[co][outNo] = weight;
      }
    });
  });
  return articulationMatrix;
}

/**
 * Calculate PO/PSO Averages
 * Only considers cells that have values
 */
function calculateAverages(articulationMatrix = {}, outcomes = [], type) {
  const averages = {};
  
  outcomes.forEach(out => {
    const outNo = type === 'PO' ? out.poNo : out.psoNo;
    const weights = [];
    
    Object.keys(articulationMatrix).forEach(co => {
      if (articulationMatrix[co] && articulationMatrix[co][outNo] !== undefined) {
        weights.push(articulationMatrix[co][outNo]);
      }
    });

    if (weights.length > 0) {
      const sum = weights.reduce((a, b) => a + b, 0);
      averages[outNo] = { 
        sum, 
        count: weights.length, 
        average: Math.round((sum / weights.length) * 100) / 100 
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
  const safeUnits = Array.isArray(units) ? units : [];
  const safePos = Array.isArray(pos) ? pos : [];
  const safePsos = Array.isArray(psos) ? psos : [];

  // 1. Compute Mapping Matrix (Fractional Hours)
  const coPOMappingMatrix = calculateMappingMatrix(safeUnits, 'PO', safePos);
  const coPSOMappingMatrix = calculateMappingMatrix(safeUnits, 'PSO', safePsos);

  // 2. Compute Strength Matrix (Percentages)
  const coPOStrengthMatrix = calculateStrengthMatrix(coPOMappingMatrix);
  const coPSOStrengthMatrix = calculateStrengthMatrix(coPSOMappingMatrix);

  // 3. Compute Articulation Matrix (Weights 1, 2, 3)
  const coPOArticulationMatrix = calculateArticulationMatrix(coPOStrengthMatrix);
  const coPSOArticulationMatrix = calculateArticulationMatrix(coPSOStrengthMatrix);

  // 4. Compute Column-wise Averages
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
  parsePORange
};
