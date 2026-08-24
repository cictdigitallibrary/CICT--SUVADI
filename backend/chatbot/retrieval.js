const { buildKnowledgeBase, getNodeData, getImmediateChildren, searchHierarchy, searchDocx } = require('./knowledgeBase');
const { expandQuery, getTokens, scoreMatch, hasContextPronoun, FILLER_WORDS } = require('./nlp');

// Manage multiple contexts keyed by sessionId
const sessions = {};

async function initRetrieval() {
  await buildKnowledgeBase();
  console.log("[Chatbot] Deterministic Retrieval initialized.");
}

function getHierarchyPath(nodeName) {
  // Utility to trace back the path if possible
  const data = getNodeData(nodeName);
  return data ? { name: nodeName, type: data.type, node: data.node } : null;
}

async function handleChatQuery(rawQuery, history = [], sessionId = 'default') {
  try {
    if (!sessions[sessionId]) {
      sessions[sessionId] = { 
        activeEntity: null,     // { name, type, node }
        lastList: [],           // array of items returned
        history: [] 
      };
    }
    const session = sessions[sessionId];
    session.history.push({ role: 'user', text: rawQuery });

    const expandedQuery = expandQuery(rawQuery);
    const tokens = getTokens(expandedQuery);
    
    // Check intents
    const isCountIntent = tokens.includes("எண்ணிக்கை") || tokens.includes("how") || tokens.includes("many") || tokens.includes("count") || tokens.includes("எத்தனை");
    const isListIntent = tokens.includes("பட்டியல்") || tokens.includes("list") || tokens.includes("யாவை") || tokens.includes("names") || tokens.includes("show") || tokens.includes("categories") || (tokens.includes("what") && tokens.includes("are"));
    
    // Attempt to identify explicitly mentioned entity in hierarchy
    let { bestMatch, score } = searchHierarchy(tokens);
    const usesPronoun = hasContextPronoun(rawQuery) || isListIntent || isCountIntent;
    
    // 1. DYNAMIC FOLLOW-UP RESOLUTION
    if (bestMatch && score > 5) {
      // User explicitly changed topic or mentioned a known entity. Update active context.
      const nodeData = getNodeData(bestMatch.name);
      session.activeEntity = { name: bestMatch.name, type: nodeData ? nodeData.type : bestMatch.type, node: nodeData ? nodeData.node : null };
      console.log(`[DEBUG] New Entity match: ${bestMatch.name} (score ${score})`);
    } else if (usesPronoun && session.activeEntity) {
      // User is referring to the active context implicitly via pronoun/intent
      bestMatch = session.activeEntity;
      score = 100; 
      console.log(`[DEBUG] Uses pronoun, resolved to activeEntity: ${bestMatch.name}`);
    } else {
      console.log(`[DEBUG] No entity match and no pronoun resolution.`);
    }
    
    let responseText = "";

    // 2. KNOWLEDGE RETRIEVAL & RESPONSE GENERATION
    if (bestMatch && session.activeEntity) {
      const active = session.activeEntity;
      const isItem = active.type === 'item';
      const label = active.type === 'main_category' ? 'sub-categories' : 'items';
      
      console.log(`[DEBUG] Handling Active Entity: ${active.name} | isItem: ${isItem} | isCountIntent: ${isCountIntent} | isListIntent: ${isListIntent}`);
      
      if (isCountIntent) {
        if (!isItem) {
          const children = getImmediateChildren(active.node);
          responseText = `Category: ${active.name}\n${label.charAt(0).toUpperCase() + label.slice(1)}: ${children.length}`;
        } else {
          responseText = `Category: ${active.name}\n\nThis is a single item.`;
        }
      } 
      else if (isListIntent && !isItem) {
        const children = getImmediateChildren(active.node);
        session.lastList = children; // Store retrieved list in context
        if (children.length > 0) {
           responseText = `Category: ${active.name} — ${children.length} ${label}:\n`;
           children.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
        }
      }
      else {
        // Detail Query / Default Info
        const searchTokens = tokens.length > 0 && !hasContextPronoun(rawQuery) ? tokens : getTokens(expandQuery(active.name));
        const entityTokens = getTokens(expandQuery(active.name));
        const combinedTokens = Array.from(new Set([...searchTokens, ...entityTokens]));
        
        const hasSpecificQuestion = tokens.some(t => !entityTokens.includes(t) && !hasContextPronoun(t) && !FILLER_WORDS.includes(t));
        
        // If the user uses a pronoun to ask for details AND we have a lastList populated, they likely want details for those items
        if (usesPronoun && session.lastList && session.lastList.length > 0 && !isCountIntent && !isListIntent) {
           responseText = `### Details for ${active.name} items:\n\n`;
           session.lastList.forEach(itemName => {
              const itemTokens = getTokens(expandQuery(itemName));
              const itemDocxMatches = searchDocx(itemTokens);
              if (itemDocxMatches.length > 0) {
                 responseText += `**${itemName}**\n`;
                 itemDocxMatches.forEach(match => {
                   responseText += `${match.text.replace(/\\n/g, '\n\n')}\n\n`;
                 });
                 responseText += `---\n\n`;
              }
           });
           
           if (responseText === `### Details for ${active.name} items:\n\n`) {
             responseText = `I couldn't find specific document details for the items under ${active.name}.`;
           }
        }
        else {
          const docxMatches = searchDocx(combinedTokens);
          
          if (docxMatches.length > 0 && (hasSpecificQuestion || isItem)) {
            responseText = `### ${active.name}\n\n`;
            docxMatches.forEach(match => {
              responseText += `${match.text.replace(/\\n/g, '\n\n')}\n\n`;
            });
          } else if (!isItem) {
            const children = getImmediateChildren(active.node);
            session.lastList = children; // Store in context
            if (children.length > 0) {
              responseText = `Category: ${active.name} — ${children.length} ${label}:\n`;
              children.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
            } else {
              responseText = `Category: ${active.name}\n${label.charAt(0).toUpperCase() + label.slice(1)}: 0`;
            }
          } else {
             responseText = `### ${active.name}\n\nTitle identified in the hierarchy, but I couldn't extract more details from the document right now.`;
          }
        }
      }
    }
    
    // 3. FALLBACK TO DOCUMENT SEARCH IF NO ENTITY CONTEXT IS MATCHED
    if (!responseText) {
      const docxMatches = searchDocx(tokens);
      if (docxMatches.length > 0 && docxMatches[0].score > 10) {
        // We matched raw docx text, but don't reset the entity context. 
        // Just return the document results.
        responseText = `### Document Results\n\n`;
        docxMatches.forEach(match => {
          responseText += `${match.text.replace(/\\n/g, '\n\n')}\n\n`;
        });
      }
    }
    
    // 4. AMBIGUOUS QUERY HANDLING
    if (!responseText) {
      if (session.activeEntity && usesPronoun) {
         responseText = `Could you clarify what information you need regarding "${session.activeEntity.name}"?`;
      } else {
         responseText = "The requested information is not available in the current SUVADI knowledge base.";
      }
    }

    // Append response to history
    session.history.push({ role: 'model', text: responseText.trim() });
    return { text: responseText.trim(), source: 'System' };

  } catch (err) {
    console.error("[Chatbot] Deterministic Engine Error:", err);
    return {
      text: "An error occurred while analyzing your query.",
      source: "System"
    };
  }
}

module.exports = { initRetrieval, handleChatQuery };
