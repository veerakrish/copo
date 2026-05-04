const axios = require('axios');

// Get API key and remove quotes if present
let MISTRAL_API_KEY = process.env.MISTRALAI_API_KEY || '';
if (MISTRAL_API_KEY.startsWith('"') && MISTRAL_API_KEY.endsWith('"')) {
  MISTRAL_API_KEY = MISTRAL_API_KEY.slice(1, -1);
}
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic helper to call Mistral AI with advanced error handling for Rate Limits (429)
 */
async function callMistral(prompt, model = 'mistral-large-latest', retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await axios.post(
        MISTRAL_API_URL,
        {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // Lowered for even stricter JSON adherence
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 
        }
      );

      const content = response.data.choices[0].message.content.trim();
      return JSON.parse(content);
    } catch (error) {
      attempt++;
      const statusCode = error.response?.status;
      const errorData = error.response?.data || error.message;

      console.error(`Mistral AI Call Error (Attempt ${attempt}/${retries}): Status ${statusCode}`, errorData);

      if (attempt >= retries) {
        throw new Error(`Mistral AI error after ${retries} attempts: ${JSON.stringify(errorData)}`);
      }

      // HANDLE 429 RATE LIMIT: Use a much longer backoff
      if (statusCode === 429) {
        const waitTime = attempt * 15000; // 15s, 30s... (Trial tiers need more time)
        console.warn(`[RATE LIMIT] Waiting ${waitTime}ms before retrying...`);
        await delay(waitTime);
      } else {
        // Standard error backoff
        const delayMs = attempt * 3000; 
        await delay(delayMs);
      }
    }
  }
}

/**
 * Stage 1: The Planner (The "Budget" Agent)
 */
async function getBudgetPlan(units) {
  const unitsSummary = units.map((u, i) => `Unit ${i + 1}: ${u.text.substring(0, 100)}...`).join('\n');
  const prompt = `Role: Academic Project Manager.
Task: Allocate exactly 50 instructional hours across 5 syllabus units.
Syllabus Summary:
${unitsSummary}
Output: A JSON object. Example: {"1": 10, "2": 12, "3": 8, "4": 10, "5": 10}`;

  return await callMistral(prompt);
}

/**
 * Stage 2: The Executor (The "Mapping" Agent)
 */
async function generateUnitData(unit, unitNo, budget, pos, psos, coStatement) {
  const poList = pos.map(p => `PO${p.poNo}: ${p.description}`).join('\n');
  const psoList = psos.map(p => `PSO${p.psoNo}: ${p.description}`).join('\n');

  const prompt = `Role: Expert Curriculum Designer.
Generate Intended Learning Outcomes (ILOs) for Unit ${unitNo}.
Course Outcome: ${coStatement}
Syllabus Content: ${unit.text}
Target Budget: ${budget} hours
POs: ${poList}
PSOs: ${psoList}

Rules:
1. Total hours MUST be exactly ${budget}.
2. Use fractional hours (0.5, 1.0, 1.5) to ensure specific topic mapping.
3. Map at least 3 relevant POs per topic to ensure high alignment strength.

Output JSON:
{
  "unitNumber": ${unitNo},
  "totalHours": ${budget},
  "topics": [
    { "topicName": "Statement", "hours": 1.0, "cos": ["CO${unitNo}"], "pos": "PO1,PO2,PO3", "psos": "PSO1" }
  ]
}`;
  return await callMistral(prompt);
}

/**
 * Stage 3: The Auditor (The "Compliance" Agent)
 */
async function auditUnitData(unitData, budget) {
  const currentTotal = unitData.topics.reduce((s, t) => s + t.hours, 0);
  const prompt = `Role: NBA Accreditation Auditor.
Input: ${JSON.stringify(unitData)}
Budget: ${budget} hours. Current Total: ${currentTotal}

Audit:
1. Hours Check: Total must be exactly ${budget}.
2. Strength Check: At least one PO must cover >= 70% of unit hours.
If passes all, status is APPROVED. If not, REJECT with feedback.

Output JSON: {"status": "APPROVED"} or {"status": "REJECT", "feedback": "reason"}`;

  return await callMistral(prompt);
}

/**
 * Main Agentic Workflow
 */
async function runAgenticWorkflow(units, pos, psos, onStatusUpdate) {
  if (onStatusUpdate) onStatusUpdate('Planning Hours (Planner Agent)...');
  const budgetPlan = await getBudgetPlan(units);

  let finalizedUnits = [];
  for (let i = 0; i < units.length; i++) {
    const unitNo = i + 1;
    const unit = units[i];
    const budget = budgetPlan[unitNo] || budgetPlan[String(unitNo)] || 10;

    let attempts = 0;
    let approved = false;
    let unitData;

    while (!approved && attempts < 3) {
      if (onStatusUpdate) onStatusUpdate(`Unit ${unitNo}: Generating ILOs (Attempt ${attempts + 1})...`);
      unitData = await generateUnitData(unit, unitNo, budget, pos, psos, unit.co || `CO${unitNo}`);
      
      if (onStatusUpdate) onStatusUpdate(`Unit ${unitNo}: Auditing Alignment...`);
      const audit = await auditUnitData(unitData, budget);
      
      if (audit.status === "APPROVED") {
        approved = true;
      } else {
        attempts++;
        if (attempts === 3) {
          unitData.needsReference = true;
          unitData.auditFeedback = audit.feedback;
        }
      }
    }
    finalizedUnits.push(unitData);

    // CRITICAL: Cool-down after each unit to prevent 429 Rate Limits
    if (i < units.length - 1) {
      if (onStatusUpdate) onStatusUpdate(`Cooling down API (10s) to avoid Rate Limits...`);
      await delay(10000); 
    }
  }

  return finalizedUnits;
}

module.exports = { runAgenticWorkflow };
