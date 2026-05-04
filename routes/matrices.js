const express = require('express');
const router = express.Router();
const { calculateMatrices } = require('../utils/matrixCalculator');
const FinalizedMatrix = require('../db/models/FinalizedMatrix');

// Get all finalized matrices
router.get('/finalized', async (req, res) => {
  try {
    const matrices = await FinalizedMatrix.find().sort({ createdAt: -1 });
    const result = matrices.map(doc => ({
      id: doc._id,
      course_name: doc.courseName,
      articulation_data: doc.articulationData,
      created_at: doc.createdAt
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching finalized matrices:', error.message);
    res.status(500).json({ error: 'Database error fetching finalized matrices' });
  }
});

// Calculate all matrices
router.post('/calculate', (req, res) => {
  try {
    // 1. Destructure data from the body
    let { units, cos, pos, psos } = req.body;
    
    if (!units || !Array.isArray(units)) {
      return res.status(400).json({ error: 'Invalid units data' });
    }

    /**
     * 2. DATA NORMALIZATION (The Fix)
     * The AI uses 'totalHours', but the calculator uses 'totalClasses'.
     * We ensure every unit has a valid 'totalClasses' denominator.
     */
    const normalizedUnits = units.map(unit => ({
      ...unit,
      // Use totalClasses if it exists, otherwise fall back to totalHours, otherwise 10
      totalClasses: unit.totalClasses || unit.totalHours || 10,
      // Ensure topics is an array so .forEach() doesn't crash
      topics: unit.topics || [] 
    }));

    // 3. Run the calculation with the cleaned data
    const matrices = calculateMatrices(normalizedUnits, cos || [], pos || [], psos || []);
    
    // 4. Return the successful calculation
    res.json(matrices);

  } catch (error) {
    // This catch block was catching the 'undefined' error and returning 500
    console.error('Matrix Calculation Logic Error:', error);
    res.status(500).json({ 
      error: "Internal Calculation Error", 
      message: error.message 
    });
  }
});

// Finalize and save to database
router.post('/finalize', async (req, res) => {
  const { courseName, articulationData } = req.body;

  if (!courseName || !articulationData) {
    return res.status(400).json({ error: 'Course name and articulation data are required' });
  }

  try {
    const newMatrix = await FinalizedMatrix.create({
      courseName,
      articulationData
    });

    res.json({ 
      success: true, 
      id: newMatrix._id,
      message: `Project "${courseName}" finalized and saved successfully.`
    });
  } catch (error) {
    console.error('Error saving finalized matrix:', error.message);
    res.status(500).json({ error: 'Database error saving finalized matrix' });
  }
});

module.exports = router;
