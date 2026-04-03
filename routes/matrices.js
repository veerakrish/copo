const express = require('express');
const router = express.Router();
const { calculateMatrices } = require('../utils/matrixCalculator');
const FinalizedMatrix = require('../db/models/FinalizedMatrix');

// Get all finalized matrices
router.get('/finalized', async (req, res) => {
  try {
    const matrices = await FinalizedMatrix.find().sort({ createdAt: -1 });
    
    // Mongoose handles the format natively (no need for JSON.parse if it's Mixed)
    // However, if articulationData is stored as a document structure, we just map over it.
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
    const { units, cos, pos, psos } = req.body;
    
    if (!units || !Array.isArray(units)) {
      return res.status(400).json({ error: 'Invalid units data' });
    }

    const matrices = calculateMatrices(units, cos || [], pos || [], psos || []);
    res.json(matrices);
  } catch (error) {
    console.error('Error calculating matrices:', error);
    res.status(500).json({ error: error.message });
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
