const { initRetrieval, handleChatQuery } = require('./retrieval');

async function test() {
  await initRetrieval();
  const sessionId = "test-session-123";

  const queries = [
    "I want to know about தொல்காப்பியம்",
    "how many under it?",
    "what are they?",
    "tell me about நச்சினார்க்கினியர் உரைப் பதிப்பு",
    "when was it published?",
    "which press printed it?",
    "what about எட்டுத்தொகை?",
    "how many in that category?",
    "list them",
    "who wrote the previous item?",
    "what about its sub categories?"
  ];

  let fakeHistory = [];
  for (const q of queries) {
    console.log(`\nUser: ${q}`);
    const res = await handleChatQuery(q, fakeHistory, sessionId);
    console.log(`Bot: ${res.text}`);
    fakeHistory.push({ role: 'user', text: q });
    fakeHistory.push({ role: 'model', text: res.text });
  }
}

test();
