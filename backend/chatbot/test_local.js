const { initRetrieval, handleChatQuery } = require('./retrieval');

async function runTests() {
  await initRetrieval();

  const conversation1 = [
    "how many தொல்காப்பியம்",
    "categories of it?",
    "what are the categories under எழுத்ததிகாரம்?",
    "what about சொல்லதிகாரம்?",
    "what are they?"
  ];

  console.log("--- CONVERSATION 1 ---");
  for (let i = 0; i < conversation1.length; i++) {
    const q = conversation1[i];
    console.log(`\nUser: "${q}"`);
    const res = await handleChatQuery(q, i === 0 ? [] : [{text: q}]); 
    console.log(`Bot:\n${res.text}\n`);
  }
}

runTests();
