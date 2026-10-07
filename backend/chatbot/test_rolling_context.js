/**
 * test_rolling_context.js
 *
 * Comprehensive multi-turn chatbot test covering:
 *   - count → follow-up (the primary reported bug)
 *   - list  → follow-up
 *   - multiple consecutive follow-ups
 *   - specific item focus from result set
 *   - entity switch
 *   - Tamil / English / mixed queries
 *   - implicit follow-ups (no pronoun, no explicit entity)
 */

const { initRetrieval, handleChatQuery } = require('./retrieval');

// ── Utilities ─────────────────────────────────────────────────────────────────

function sep(title) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

async function runFlow(flowName, turns, sessionId) {
  sep(flowName);
  let fakeHistory = [];
  for (const q of turns) {
    console.log(`\n  👤 USER : ${q}`);
    const res = await handleChatQuery(q, fakeHistory, sessionId);
    console.log(`  🤖 BOT  : ${res.text.slice(0, 300)}${res.text.length > 300 ? '…' : ''}`);
    fakeHistory.push({ role: 'user',  text: q });
    fakeHistory.push({ role: 'model', text: res.text });
  }
}

// ── Test Flows ────────────────────────────────────────────────────────────────

async function test() {
  await initRetrieval();
  console.log('\n✅ Knowledge base initialised.\n');

  // ── Flow 1: Count → follow-up (primary reported bug) ──────────────────────
  await runFlow(
    'Flow 1 — Count then ask for names (primary bug)',
    [
      'எட்டுத்தொகை என்னென்ன நூல்கள் உள்ளன? எத்தனை?',  // count
      'அவற்றின் பெயர்கள் என்ன?',                          // follow-up: names
      'முதல் நூலைப் பற்றி சொல்லுங்கள்'                   // follow-up: details of first item
    ],
    'flow1'
  );

  // ── Flow 2: English count → follow-up ─────────────────────────────────────
  await runFlow(
    'Flow 2 — English count then follow-up',
    [
      'how many books are in ettuthogai?',   // count
      'list them',                            // follow-up: names
      'tell me about them'                    // follow-up: details
    ],
    'flow2'
  );

  // ── Flow 3: List → consecutive follow-ups ─────────────────────────────────
  await runFlow(
    'Flow 3 — List then multiple follow-ups',
    [
      'காப்பியங்கள் பட்டியல் கொடு',   // list
      'tell me about them',             // follow-up: details
      'what are their details?',        // second follow-up
      'more information please'         // third follow-up (implicit)
    ],
    'flow3'
  );

  // ── Flow 4: Tamil pronoun chain ───────────────────────────────────────────
  await runFlow(
    'Flow 4 — Tamil pronoun chain',
    [
      'தொல்காப்பியம் என்ன?',   // topic set
      'எத்தனை பிரிவுகள்?',     // count
      'அவை யாவை?',              // list
      'விவரங்கள் சொல்'          // details
    ],
    'flow4'
  );

  // ── Flow 5: Entity switch ─────────────────────────────────────────────────
  await runFlow(
    'Flow 5 — Switch entity mid-conversation',
    [
      'பத்துப்பாட்டு என்னென்ன நூல்கள்?',  // entity 1
      'tell me about them',                  // follow-up on entity 1
      'now tell me about ettuthogai',        // switch to entity 2
      'how many?',                           // count on entity 2
      'list them'                            // list entity 2
    ],
    'flow5'
  );

  // ── Flow 6: Implicit follow-up (no pronoun, no entity keyword) ────────────
  await runFlow(
    'Flow 6 — Implicit follow-ups (no pronoun)',
    [
      'சங்க இலக்கியம்',    // topic
      'எத்தனை?',           // count
      'names',              // implicit list (no pronoun, no entity)
      'details'             // implicit detail (no pronoun, no entity)
    ],
    'flow6'
  );

  // ── Flow 7: Mixed Tamil-English ───────────────────────────────────────────
  await runFlow(
    'Flow 7 — Mixed Tamil-English queries',
    [
      'what is ettuthogai?',             // English entity
      'எத்தனை நூல்கள் உள்ளன?',          // Tamil count follow-up
      'list all of them in Tamil names', // mixed list follow-up
      'give details about the first one' // detail follow-up
    ],
    'flow7'
  );

  // ── Flow 8: Specific item from result set ─────────────────────────────────
  await runFlow(
    'Flow 8 — Ask about a specific item from result list',
    [
      'எட்டுத்தொகை நூல்கள் யாவை?',     // list → result set populated
      'அகநானூறு பற்றி சொல்லுங்கள்',    // pick one item from the list
      'tell me more about it'            // follow-up on that item
    ],
    'flow8'
  );

  sep('All flows complete');
}

test().catch(console.error);
