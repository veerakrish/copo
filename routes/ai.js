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
    // Check if the connection is still open before writing
    if (res.writableEnded) return;
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
  res.json({ 
    message: 'AI routes are working!', 
    apiKeyConfigured: !!process.env.MISTRALAI_API_KEY 
  });
});

// Generate ILOs for all units using Agentic Workflow
router.post('/generate-ilos', async (req, res) => {
  const { units, pos, psos, clientId } = req.body;
  console.log(`Received request to /api/ai/generate-ilos (Client: ${clientId})`);
  
  try {
    // 1. INPUT VALIDATION
    if (!units || !Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ error: 'Units array is required' });
    }

    if (!process.env.MISTRALAI_API_KEY) {
      return res.status(500).json({ error: 'Mistral AI API key is not configured on server.' });
    }

    // 2. WORKFLOW EXECUTION
    const results = await runAgenticWorkflow(units, pos || [], psos || [], (status) => {
      const sendUpdate = clients.get(clientId);
      if (sendUpdate) {
        sendUpdate(status);
      }
    });

    // 3. SCHEMA NORMALIZATION (The Fix)
    // We force the AI output into a rigid structure that the Calculator Utility expects
    const formattedUnits = results.map((result, index) => {
      const unitNo = result.unitNumber || (index + 1);
      const coForUnit = `CO${unitNo}`;
      
      // Safety check: Ensure topics exists and is an array
      const rawTopics = Array.isArray(result.topics) ? result.topics : [];

      return {
        unitNo: unitNo,
        // Fallback to 10 if totalHours is missing to avoid division by zero
        totalClasses: parseFloat(result.totalHours) || 10, 
        needsReference: !!result.needsReference,
        auditFeedback: result.auditFeedback || '',
        topics: rawTopics.map(topic => ({
          topicName: topic.topicName || 'Untitled Topic',
          hours: parseFloat(topic.hours) || 0,
          cos: Array.isArray(topic.cos) ? topic.cos : [coForUnit],
          pos: topic.pos || '',
          psos: topic.psos || ''
        }))
      };
    });

    // 4. SUMMARY CALCULATIONS
    const didAnyUnitNeedReference = formattedUnits.some(u => u.needsReference);
    const totalHours = formattedUnits.reduce((sum, unit) => sum + (unit.totalClasses || 0), 0);

    // 5. SUCCESS RESPONSE
    res.json({
      success: true,
      units: formattedUnits,
      totalHours,
      didAnyUnitNeedReference,
      message: didAnyUnitNeedReference 
        ? `Note: Some units require additional detail for Strength 3 mapping.` 
        : `Successfully generated NBA-compliant ILOs.`
    });

  } catch (error) {
    console.error('CRITICAL ERROR in /generate-ilos:', error);
    res.status(500).json({ 
      error: error.message || 'The AI Agent system encountered a processing error.'
    });
  }
});

module.exports = router;
