const express = require('express');
const router = express.Router();

// In-memory storage (can be replaced with database)
let syllabusData = {
  units: [],
  cos: [],
  pos: [],
  psos: []
};

// Get all syllabus data
router.get('/', (req, res) => {
  res.json(syllabusData);
});

// Save syllabus data
router.post('/', (req, res) => {
  const { units, cos, pos, psos } = req.body;
  
  // Validate units
  const totalClasses = units.reduce((sum, unit) => sum + unit.totalClasses, 0);
  if (totalClasses > 50) {
    return res.status(400).json({ 
      error: `Total classes (${totalClasses}) exceeds maximum of 50 classes` 
    });
  }

  for (const unit of units) {
    if (unit.totalClasses <= 10 ) {
      return res.status(400).json({ 
        error: `Unit ${unit.unitNo} has ${unit.totalClasses} classes. Each unit must have 10-15 classes.` 
      });
    }
  }

  syllabusData = { units, cos, pos, psos };
  res.json({ message: 'Syllabus data saved successfully', data: syllabusData });
});

// Get specific unit
router.get('/units/:unitNo', (req, res) => {
  const unit = syllabusData.units.find(u => u.unitNo === parseInt(req.params.unitNo));
  if (!unit) {
    return res.status(404).json({ error: 'Unit not found' });
  }
  res.json(unit);
});

module.exports = router;
