/**
 * Utility functions for calculating CO-PO and CO-PSO mapping matrices
 */

/**
 * Parse PO/PSO range notation (e.g., "PO1-PO4" or "PSO1,PSO2")
 * Supports case-insensitivity (e.g., "po1", "Po2") and optional spaces (e.g., "PO 1")
 */
function parsePORange(poString) {
  const pos = [];
  if (!poString) return pos;
  
  const parts = poString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const match = trimmed.match(/(PO|PSO)\s*(\d+)\s*-\s*(PO|PSO)\s*(\d+)/i);
      if (match) {
        const type = match[1].toUpperCase(); // PO or PSO
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
  const match = coString.match(/CO(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Calculate Mapping Matrix for POs or PSOs
 */
function calculateMappingMatrix(units, type, outcomes) {
  const matrix = {};
  const coList = units.map((_, index) => index + 1);

  coList.forEach(co => {
    matrix[co] = {};
    const unit = units[co - 1];
    if (!unit) return;

    outcomes.forEach(outcome => {
      const outNo = outcome.poNo || outcome.psoNo;
      let numerator = 0;
      
      unit.topics.forEach(topic => {
        const topicOutcomes = parsePORange(type === 'PO' ? topic.pos : topic.psos);
        if (topicOutcomes.includes(outNo)) {
          numerator += topic.hours;
        }
      });

      if (numerator > 0) {
        matrix[co][outNo] = {
          numerator,
          denominator: unit.totalClasses,
          value: numerator / unit.totalClasses
        };
      }
    });
  });
  return matrix;
}

/**
 * Calculate Strength Matrix
 */
function calculateStrengthMatrix(mappingMatrix) {
  const strengthMatrix = {};
  
  Object.keys(mappingMatrix).forEach(co => {
    strengthMatrix[co] = {};
    Object.keys(mappingMatrix[co]).forEach(outNo => {
      const cell = mappingMatrix[co][outNo];
      const percentage = (cell.numerator / cell.denominator) * 100;
      
      let weight = 1;
      if (percentage >= 70) weight = 3;
      else if (percentage >= 50) weight = 2;

      strengthMatrix[co][outNo] = {
        percentage: Math.round(percentage * 100) / 100,
        weight
      };
    });
  });
  return strengthMatrix;
}

/**
 * Calculate Articulation Matrix
 */
function calculateArticulationMatrix(mappingMatrix, strengthMatrix) {
  const articulationMatrix = {};
  
  Object.keys(mappingMatrix).forEach(co => {
    articulationMatrix[co] = {};
    Object.keys(mappingMatrix[co]).forEach(outNo => {
      const strengthWeight = strengthMatrix[co] && strengthMatrix[co][outNo] ? strengthMatrix[co][outNo].weight : 1;
      articulationMatrix[co][outNo] = strengthWeight;
    });
  });
  return articulationMatrix;
}

/**
 * Calculate PO/PSO Averages
 */
function calculateAverages(articulationMatrix, outcomes, type) {
  const averages = {};
  outcomes.forEach(out => {
    const outNo = type === 'PO' ? out.poNo : out.psoNo;
    const values = [];
    Object.keys(articulationMatrix).forEach(co => {
      if (articulationMatrix[co][outNo] !== undefined) {
        values.push(articulationMatrix[co][outNo]);
      }
    });

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      averages[outNo] = { sum, count: values.length, average: sum / values.length };
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
  // Mapping Matrices
  const coPOMappingMatrix = calculateMappingMatrix(units, 'PO', pos);
  const coPSOMappingMatrix = calculateMappingMatrix(units, 'PSO', psos);

  // Strength Matrices
  const coPOStrengthMatrix = calculateStrengthMatrix(coPOMappingMatrix);
  const coPSOStrengthMatrix = calculateStrengthMatrix(coPSOMappingMatrix);

  // Articulation Matrices
  const coPOArticulationMatrix = calculateArticulationMatrix(coPOMappingMatrix, coPOStrengthMatrix);
  const coPSOArticulationMatrix = calculateArticulationMatrix(coPSOMappingMatrix, coPSOStrengthMatrix);

  // Averages
  const poAverages = calculateAverages(coPOArticulationMatrix, pos, 'PO');
  const psoAverages = calculateAverages(coPSOArticulationMatrix, psos, 'PSO');

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
