const { initRetrieval, handleChatQuery } = require('./retrieval');

async function test() {
  await initRetrieval();
  const queries = [
    "when was தொல்காப்பியம் published?",
    "who wrote தொல்காப்பியம்?",
    "which printing press printed தொல்காப்பியம்?",
    "tell me about நச்சினார்க்கினியர் உரைப் பதிப்பு"
  ];
  for (const q of queries) {
    const res = await handleChatQuery(q);
    console.log(`\nQ: ${q}`);
    console.log(`A: ${res.text}`);
  }
}
test();
