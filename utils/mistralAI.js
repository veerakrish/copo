const axios = require('axios');

// Get API key and remove quotes if present (handles .env files with quoted values)
let MISTRAL_API_KEY = process.env.MISTRALAI_API_KEY || '';
if (MISTRAL_API_KEY.startsWith('"') && MISTRAL_API_KEY.endsWith('"')) {
  MISTRAL_API_KEY = MISTRAL_API_KEY.slice(1, -1);
}
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

if (!MISTRAL_API_KEY) {
  console.warn('Warning: MISTRALAI_API_KEY is not set in environment variables');
}

/**
 * Generic helper to call Mistral AI
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
          temperature: 0.2, // Low temperature for high consistency in JSON
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 180000 // 180 seconds to allow complete Mistral LLM planning/auditing
        }
      );

      const content = response.data.choices[0].message.content.trim();
      return JSON.parse(content);
    } catch (error) {
      attempt++;
      console.error(`Mistral AI Call Error (Attempt ${attempt}/${retries}):`, error.response?.data || error.message);
      if (attempt >= retries) {
        throw new Error(`Mistral AI error: ${error.message}`);
      }
      // Exponential backoff logic
      const delayMs = attempt * 2000; // 2s, 4s...
      console.log(`Waiting ${delayMs}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Stage 1: The Planner (The "Budget" Agent)
 */
async function getBudgetPlan(units) {
  const unitsSummary = units.map((u, i) => `Unit ${i + 1}: ${u.text.substring(0, 100)}...`).join('\n');
  const prompt = `Role: Academic Project Manager.
Task: You are given 5 units of a syllabus. Your job is to allocate instructional hours for each unit.
Constraints:
1. Total hours for all units must be exactly 50 hours.
2. Individual units can take more or fewer hours (typically between 6 and 14 hours) based on complexity.
3. Ensure the allocation logically follows the syllabus density.

Syllabus Summary:
${unitsSummary}

Output: A JSON object mapping unit numbers to their allowed hour capacity.
Example: {"1": 12, "2": 8, "3": 10, "4": 10, "5": 10}`;

  return await callMistral(prompt);
}

/**
 * Stage 2: The Executor (The "Mapping" Agent)
 */
async function generateUnitData(unit, unitNo, budget, pos, psos, coStatement) {
  const poList = pos.map(p => `PO${p.poNo}: ${p.description}`).join('\n');
  const psoList = psos.map(p => `PSO${p.psoNo}: ${p.description}`).join('\n');

  const prompt = `Role: Expert Curriculum Designer.
Task: Generate simple, crisp Intended Learning Outcomes (ILOs) for Unit ${unitNo}.

Course Outcome for this Unit:
${coStatement}

Syllabus Content:
${unit.text}

Budget: ${budget} hours

Available POs:
${poList}

Available PSOs:
${psoList}

CRITICAL RULES FOR ILO GENERATION:
1. Each ILO MUST clearly state the specific topic(s) to be covered in that session (e.g., "Kirchhoff's voltage and current laws", "TCP/IP protocol stack").
2. ILOs must be SHORT, SIMPLE, and CRISP — a single clear sentence per topic.
3. ILOs must directly reflect the Course Outcome (CO${unitNo}) statement given above.
4. Each ILO must meaningfully connect to the POs it is mapped to. Only map POs that are genuinely relevant to the topic.
5. Use action verbs from Bloom's Taxonomy (Understand, Analyze, Design, Evaluate, Apply, Create) but keep the statement focused on WHAT topic is covered.
6. FRACTIONAL HOURS: Topics can have fractional hours (0.5, 1.0, 1.5, or 2.0). A 2-hour session may contain multiple topics with different hour allocations. For example, a session could have: Topic A (1.0 hr) + Topic B (0.5 hr) + Topic C (0.5 hr) = 2.0 hrs. This ensures each PO only gets credit for the hours its topic genuinely occupies, making the mapping accurate and auditable.
7. The total hours across all topics MUST equal exactly ${budget} hours.
8. Map only POs that are genuinely relevant to each specific topic. Different topics in the same session can (and should) map to different POs.
9. Map at least 2-3 relevant POs per topic.

GOOD ILO examples (simple, topic-focused, with fractional hours):
- "Understand the architecture and working of 8051 microcontroller" — 1.0 hr (PO1, PO2)
- "Apply addressing modes in assembly programming" — 1.0 hr (PO1, PO3, PO5)
- "Analyze network topologies and their applications in LAN design" — 1.5 hr (PO1, PO3, PO5)
- "Simulate network configurations using Packet Tracer" — 0.5 hr (PO2, PO5)

BAD ILO examples (vague, generic — DO NOT do this):
- "Analyze data using modern tools" (too vague, no specific topic)
- "Design and evaluate engineering solutions" (too generic)

Output JSON format:
{
  "unitNumber": ${unitNo},
  "totalHours": ${budget},
  "topics": [
    {
      "topicName": "Simple, crisp statement with specific topic covered",
      "hours": 1.0,
      "cos": ["CO${unitNo}"],
      "pos": "PO1,PO2",
      "psos": "PSO1"
    },
    {
      "topicName": "Another topic with its own specific PO mapping",
      "hours": 0.5,
      "cos": ["CO${unitNo}"],
      "pos": "PO3,PO5",
      "psos": "PSO2"
    }
  ]
}`;

  return await callMistral(prompt);
}

/**
 * Stage 3: The Auditor (The "Compliance" Agent)
 */
async function auditUnitData(unitData, budget) {
  const prompt = `Role: NBA Accreditation Auditor.
Input: ${JSON.stringify(unitData)}
Target Budget: ${budget} hours

Audit Rules:
1. Does the total hours of all topics equal exactly the budget? (Current total: ${unitData.topics.reduce((s, t) => s + t.hours, 0)}). 
2. STRICT STRENGTH 3 CHECK: At least one PO or PSO must achieve Strength 3.  
   Calculation: (Sum of hours for all topics mapped to PO_X / Unit Budget) * 100.  
   If the result is >= 70% for at least one PO/PSO, it passes Strength 3.
3. Are the ILOs simple, crisp, and topic-specific?
4. Does each topic map only genuinely relevant POs (mapping exactly 3-4 POs per topic is preferred)?

Output: If passed, return {"status": "APPROVED"}. If failed, return {"status": "REJECT", "feedback": "Detailed reason why Strength 3 was not achieved or other quality issues"}.`;

  return await callMistral(prompt);
}

/**
 * Main Agentic Workflow
 */
async function runAgenticWorkflow(units, pos, psos, onStatusUpdate) {
  if (onStatusUpdate) onStatusUpdate('Planning Hours (Planner Agent)...');
  const budgetPlan = await getBudgetPlan(units);
  console.log('Budget Plan:', budgetPlan);

  let finalizedUnits = [];
  for (let i = 0; i < units.length; i++) {
    const unitNo = i + 1;
    const unit = units[i];
    const budget = budgetPlan[unitNo] || budgetPlan[String(unitNo)] || 10;

    let attempts = 0;
    let approved = false;
    let unitData;

    while (!approved && attempts < 3) {
      if (onStatusUpdate) onStatusUpdate(`Mapping Unit ${unitNo} (Executor Agent) - Attempt ${attempts + 1}...`);
      unitData = await generateUnitData(unit, unitNo, budget, pos, psos, unit.co || `CO${unitNo}`);
      
      if (onStatusUpdate) onStatusUpdate(`Auditing Unit ${unitNo} (Auditor Agent)...`);
      const audit = await auditUnitData(unitData, budget);
      
      if (audit.status === "APPROVED") {
        console.log(`Unit ${unitNo} APPROVED`);
        approved = true;
      } else {
        const feedbackStr = typeof audit.feedback === 'string' ? audit.feedback : JSON.stringify(audit.feedback);
        console.warn(`Unit ${unitNo} REJECTED: ${feedbackStr}`);
        attempts++;
        if (attempts === 3) {
          console.warn(`Unit ${unitNo} failed 3 attempts. Marking for reference request.`);
          unitData.needsReference = true;
          unitData.auditFeedback = feedbackStr;
        }
      }
    }
    finalizedUnits.push(unitData);
  }

  return finalizedUnits;
}

module.exports = {
  runAgenticWorkflow
};
