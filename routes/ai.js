const express = require('express');
const router = express.Router();
const { runAgenticWorkflow } = require('../utils/mistralAI');

// Store active status connections
const clients = new Map();

// SSE endpoint for status updates
router.get('/status/:clientId', (req, res) => {
  const { clientId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = (status) => {
    res.write(`data: ${JSON.stringify({ status })}\n\n`);
  };

  clients.set(clientId, sendUpdate);
  console.log(`Client ${clientId} connected for status updates`);

  req.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'AI routes are working!', apiKeyConfigured: !!process.env.MISTRALAI_API_KEY });
});

// Generate ILOs for all units using Agentic Workflow
router.post('/generate-ilos', async (req, res) => {
  const { units, pos, psos, clientId } = req.body;
  console.log(`Received request to /api/ai/generate-ilos (Client: ${clientId})`);
  
  try {
    if (!units || !Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ error: 'Units array is required' });
    }

    if (!pos || !Array.isArray(pos)) {
      return res.status(400).json({ error: 'POs array is required' });
    }

    if (!psos || !Array.isArray(psos)) {
      return res.status(400).json({ error: 'PSOs array is required' });
    }

    // Check API key
    if (!process.env.MISTRALAI_API_KEY) {
      return res.status(500).json({ error: 'Mistral AI API key is not configured.' });
    }

    console.log(`Starting Agentic ILO generation for ${units.length} units...`);
    
    const results = await runAgenticWorkflow(units, pos, psos, (status) => {
      console.log(`[AGENTIC STATUS]: ${status}`);
      const sendUpdate = clients.get(clientId);
      if (sendUpdate) {
        sendUpdate(status);
      }
    });

    // Format results to match syllabus structure
    const formattedUnits = results.map((result, index) => {
      const unitNo = result.unitNumber || (index + 1);
      const coForUnit = `CO${unitNo}`;
      return {
        unitNo: unitNo,
        totalClasses: result.totalHours,
        needsReference: result.needsReference || false,
        auditFeedback: result.auditFeedback || '',
        topics: result.topics.map(topic => ({
          topicName: topic.topicName,
          hours: topic.hours,
          cos: topic.cos || [coForUnit],
          pos: topic.pos || '',
          psos: topic.psos || ''
        }))
      };
    });

    const didAnyUnitNeedReference = formattedUnits.some(u => u.needsReference);
    const totalHours = formattedUnits.reduce((sum, unit) => sum + unit.totalClasses, 0);

    res.json({
      success: true,
      units: formattedUnits,
      totalHours,
      didAnyUnitNeedReference,
      message: didAnyUnitNeedReference 
        ? `Generated with warnings: Some units could not achieve Strength 3 mapping after 3 attempts.` 
        : `Successfully generated ILOs with Agentic Workflow`
    });

  } catch (error) {
    console.error('Error generating ILOs:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate ILOs'
    });
  }
});

module.exports = router;
