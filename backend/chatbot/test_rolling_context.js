const { initRetrieval, handleChatQuery } = require('./retrieval');

async function test() {
  await initRetrieval();
  const sessionId = "test-session-123";

  const queries = [
    "what about காப்பியங்கள்?",
    "tell me about them"
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
