const { buildKnowledgeBase, getNodeData, getImmediateChildren, searchHierarchy, searchDocx, firstEditionRecords, isDescendant } = require('./knowledgeBase');
const { expandQuery, getTokens, scoreMatch, hasContextPronoun, FILLER_WORDS, detectIntent, detectAllIntents, detectLanguage } = require('./nlp');

// ── Session store: keyed by sessionId ─────────────────────────────────────────
const sessions = {};

async function initRetrieval() {
  await buildKnowledgeBase();
  console.log("[Chatbot] Deterministic Retrieval initialized.");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build structured child objects from a parent node.
 * Returns [{ name, type, node }] — keeps node reference for further traversal.
 */
function buildChildObjects(parentNode, childNames) {
  if (!childNames || childNames.length === 0) return [];
  return childNames.map(name => {
    const data = getNodeData(name);
    return data
      ? { name, type: data.type, node: data.node }
      : { name, type: 'item', node: null };
  });
}

/**
 * Initialise a clean session object.
 *
 * The session carries a full conversational state so that every turn
 * can be resolved relative to everything established so far.
 */
function makeSession() {
  return {
    activeEntity:      null,  // { name, type, node } – current topic
    entityType:        null,  // 'main_category' | 'sub_category' | 'item'
    parentEntity:      null,  // entity that produced the current result set
    hierarchyPath:     [],    // breadcrumb from root to activeEntity
    lastList:          [],    // string[] – child names of last result
    lastResultItems:   [],    // { name, type, node }[] – structured result set
    lastResultType:    null,  // 'count' | 'list' | 'detail' | 'item'
    lastResultCount:   0,
    lastResultEntity:  null,  // entity whose children formed the last result set
    lastIntent:        null,  // 'count' | 'list' | 'detail'
    previousQuery:     null,  // raw text of the previous user query
    previousIntent:    null,  // intent resolved on the previous turn
    previousResponse:  null,  // response text returned on the previous turn
    relevantChildren:  [],    // alias for lastResultItems
    history:           [],    // { role, text, resultType, resultEntity, resultCount }
    currentYearFilter: null   // integer year filter (e.g. 2012)
  };
}

/**
 * Return the human-readable label for a category type.
 */
function childLabel(type) {
  return type === 'main_category' ? 'sub-categories' : 'items';
}

/**
 * Return only the meaningful (non-filler) tokens from a token list.
 */
function meaningfulTokens(tokens) {
  return tokens.filter(t => t.length > 2 && !FILLER_WORDS.includes(t));
}

// Score thresholds for entity resolution
const SCORE_THRESHOLD_NO_CONTEXT   = 5;   // min score to claim new entity when no session
const SCORE_THRESHOLD_WITH_CONTEXT = 10;  // min score to override an existing session topic

/**
 * Determine whether a new entity reference is unambiguous enough that we
 * should switch the conversation context to it.
 *
 * An entity is "unambiguous new" when:
 *  - There is a bestMatch with a score above the relevant threshold.
 *  - The user is NOT using a pronoun/context reference word.
 *  - The matched entity is NOT the current active entity (not a repeat).
 *  - The matched entity is NOT in the previous result set (not an item drill-down).
 *
 * The threshold is higher (10) when a session is already active, so that
 * partial-token matches do NOT hijack the conversation away from the
 * established topic.
 */
function isUnambiguousNewEntity(bestMatch, score, session, hasContextPronounRef) {
  if (!bestMatch) return false;
  if (hasContextPronounRef) return false;  // pronoun/intent ref → stay in context

  // Repeating the current entity is not "new"
  if (session.activeEntity && bestMatch.name === session.activeEntity.name) return false;

  // Matched an item in the previous result set → item-detail, not topic change
  if (session.lastResultItems.some(item => item.name === bestMatch.name)) return false;

  // Use a stricter threshold when a session topic is already established
  const threshold = session.activeEntity
    ? SCORE_THRESHOLD_WITH_CONTEXT
    : SCORE_THRESHOLD_NO_CONTEXT;

  return score > threshold;
}

/**
 * Determine whether the current query is a follow-up that should be resolved
 * against the existing conversational context.
 *
 * This is the generalised heuristic that replaces expanding fixed pronoun lists.
 * A query is context-dependent when ALL of:
 *   1. There is an active entity in the session.
 *   2. The query does NOT unambiguously name a new entity.
 *   3. At least one of:
 *      a. Query contains an explicit pronoun/context reference word.
 *      b. Query expresses count or list intent (apply it to the established topic).
 *      c. Query is short (<=3 meaningful tokens) with a low match score.
 *      d. All meaningful tokens are covered by the active entity name or
 *         previous result set items — nothing truly new is introduced.
 *      e. Query has zero meaningful tokens (pure intent/filler words only).
 */
function isContextDependentQuery(tokens, bestMatch, score, session, hasContextPronounRef) {
  if (!session.activeEntity) return false;  // nothing to follow up on

  // If the match is unambiguously new, it is NOT a follow-up
  if (isUnambiguousNewEntity(bestMatch, score, session, hasContextPronounRef)) return false;

  const mTokens = meaningfulTokens(tokens);

  // (a) Explicit pronoun / context reference
  if (hasContextPronounRef) return true;

  // (b) Intent detected with an established active entity
  const intent = detectIntent(tokens);
  if (intent && session.activeEntity) return true;

  // (c) Short query with no strong entity match
  if (mTokens.length <= 3 && score <= SCORE_THRESHOLD_WITH_CONTEXT) return true;

  // (d) All meaningful tokens already covered by the current context
  const activeTokens    = getTokens(expandQuery(session.activeEntity.name));
  const resultSetNames  = session.lastResultItems.map(i => i.name).join(' ');
  const resultTokens    = getTokens(expandQuery(resultSetNames));
  const contextTokenSet = new Set([...activeTokens, ...resultTokens]);
  const allInContext     = mTokens.length > 0 && mTokens.every(t => contextTokenSet.has(t));
  if (allInContext) return true;

  // (e) No meaningful tokens
  if (mTokens.length === 0) return true;

  return false;
}

/**
 * Reconstruct the session state by replaying the conversation history
 * that the frontend sends with every request.
 *
 * When the backend in-memory session is lost (restart, redeploy, etc.) the
 * frontend still carries the full chat history. We replay each user/model
 * turn pair to restore: activeEntity, lastResultItems, lastList, etc.
 *
 * This makes the chatbot survive backend restarts without losing context.
 */
function reconstructSessionFromHistory(session, history) {
  if (!history || history.length < 2) return;

  // History is ordered oldest-first: [user, model, user, model, ...]
  // We process each user→model pair to update session state.
  for (let i = 0; i < history.length - 1; i++) {
    const turn = history[i];
    if (turn.role !== 'user' || turn.source !== 'user') continue;

    const userText   = turn.text || '';
    const modelTurn  = history[i + 1];
    if (!modelTurn || (modelTurn.role !== 'model' && modelTurn.source !== 'LLM')) continue;
    const modelText  = modelTurn.text || '';

    const tokens     = getTokens(expandQuery(userText));
    const { bestMatch, score } = searchHierarchy(tokens);

    if (bestMatch && score > 5) {
      const nodeData = getNodeData(bestMatch.name);
      session.activeEntity = {
        name: bestMatch.name,
        type: nodeData ? nodeData.type : bestMatch.type,
        node: nodeData ? nodeData.node : null
      };
      session.previousQuery = userText;
    }

    // Detect result type from the model response text
    const listMatch = modelText.match(/(\d+)\s+(?:items|sub-categories|நூல்)/i);
    if (listMatch) {
      // Response mentions a count — rebuild the child list
      const count = parseInt(listMatch[1], 10);
      if (session.activeEntity) {
        const children  = getImmediateChildren(session.activeEntity.node) || [];
        const childObjs = buildChildObjects(session.activeEntity.node, children);
        session.lastResultItems  = childObjs;
        session.lastList         = children;
        session.lastResultCount  = count;
        session.lastResultType   = 'count';
        session.lastResultEntity = { ...session.activeEntity };
        session.lastIntent       = 'count';
      }
    }

    // If the model listed numbered items, rebuild lastList from its text
    const numberedItems = [...modelText.matchAll(/^\d+\.\s+(.+)$/mg)].map(m => m[1].trim());
    if (numberedItems.length > 0 && session.activeEntity) {
      const childObjs = buildChildObjects(
        session.activeEntity.node,
        numberedItems
      );
      session.lastResultItems  = childObjs.length > 0 ? childObjs : numberedItems.map(n => ({ name: n, type: 'item', node: null }));
      session.lastList         = numberedItems;
      session.lastResultCount  = numberedItems.length;
      session.lastResultType   = 'list';
      session.lastResultEntity = session.activeEntity ? { ...session.activeEntity } : null;
      session.lastIntent       = 'list';
    }
  }

  if (session.activeEntity) {
    console.log(`[Chatbot] Session reconstructed from history → activeEntity: ${session.activeEntity.name}, lastList: [${session.lastList.join(', ')}]`);
  }
}

// ── Main query handler ────────────────────────────────────────────────────────

async function handleChatQuery(rawQuery, history = [], sessionId = 'default') {
  try {
    const isNewSession = !sessions[sessionId];
    if (isNewSession) {
      sessions[sessionId] = makeSession();
    }
    const session = sessions[sessionId];

    // ── If session is brand-new AND history is available, rebuild context ─────
    // This handles backend restarts, redeploys, or any case where the in-memory
    // session was lost but the frontend still has the conversation history.
    if (isNewSession && history && history.length >= 2) {
      reconstructSessionFromHistory(session, history);
    }

    // ── DEBUG: log session state BEFORE this turn ─────────────────────────────
    console.log(`\n[DEBUG] ════════════════════════════════`);
    console.log(`[QUERY]`);
    console.log(`Original: ${rawQuery}`);
    
    // Record user turn
    session.history.push({ role: 'user', text: rawQuery });

    const expandedQuery = expandQuery(rawQuery);
    const tokens        = getTokens(expandedQuery);

    console.log(`[NORMALIZED]`);
    console.log(`${tokens.join(' ')}`);
    console.log(`[LANGUAGE]`);
    console.log(`${detectLanguage(tokens)}`);
    console.log(`[CONTEXT]`);
    console.log(`Active entity: ${session.activeEntity ? session.activeEntity.name : 'null'}`);
    console.log(`Previous result count: ${session.lastResultCount}`);
    console.log(`Previous intent: ${session.lastIntent}`);

    // ── Intent detection ───────────────────────────────────────────────────────
    let intents = detectAllIntents(tokens);
    if (intents.length === 0) intents = detectAllIntents(rawQuery.split(' '));
    const isCount = intents.includes('count');
    const isDetail = intents.includes('detail');
    const isList = intents.includes('list') && !isDetail;
    const intent = intents[0] || null; // for fallback/logging
    const hasContextPronounRef = hasContextPronoun(rawQuery);

    // ── Hierarchy entity match ─────────────────────────────────────────────────
    let { bestMatch, score } = searchHierarchy(tokens);

    console.log(`[ENTITY]`);
    console.log(bestMatch ? bestMatch.name : 'none');
    console.log(`[INTENT]`);
    console.log(intent || 'unknown');

    // ── Is the matched entity a member of the previous result set? ────────────
    // If so, this is a detail drill-down for that item — not a topic change.
    const matchedInLastResult = bestMatch
      && score > 5
      && session.lastResultItems.some(item => item.name === bestMatch.name);

    // ── RESOLUTION: determine conversation mode ───────────────────────────────
    //
    // Priority (strict order):
    //   1. matchedInLastResult       → 'result_item' (drill down into listed item)
    //   2. isUnambiguousNewEntity    → 'new'          (clear topic change)
    //   3. isContextDependentQuery   → 'context'      (follow-up on current topic)
    //   4. low-score entity match    → 'new'          (best we can do without context)
    //   5. nothing                   → 'fallback'

    let resolvedMode = 'fallback';

    if (matchedInLastResult) {
      // 1: Detail request about an item from the previous list
      resolvedMode = 'result_item';
      const nodeData = getNodeData(bestMatch.name);
      session.activeEntity = {
        name: bestMatch.name,
        type: nodeData ? nodeData.type : bestMatch.type,
        node: nodeData ? nodeData.node : null
      };
      console.log(`[DEBUG] RESOLUTION → result_item: ${bestMatch.name}`);

    } else if (isUnambiguousNewEntity(bestMatch, score, session, hasContextPronounRef)) {
      // 2: Unambiguous new entity — update context and clear old result set
      resolvedMode = 'new';
      const nodeData = getNodeData(bestMatch.name);
      session.activeEntity = {
        name: bestMatch.name,
        type: nodeData ? nodeData.type : bestMatch.type,
        node: nodeData ? nodeData.node : null
      };
      // Switching topic — clear stale result state
      session.lastResultItems  = [];
      session.lastList         = [];
      session.lastResultType   = null;
      session.lastResultCount  = 0;
      session.lastResultEntity = null;
      console.log(`[DEBUG] RESOLUTION → new entity: ${bestMatch.name} (score ${score})`);

    } else if (isContextDependentQuery(tokens, bestMatch, score, session, hasContextPronounRef)) {
      // 3: Follow-up — resolve against existing conversation context
      resolvedMode = 'context';
      bestMatch = session.activeEntity;
      score     = 100;
      console.log(`[DEBUG] RESOLUTION → context follow-up → ${bestMatch.name}`);

    } else if (bestMatch && score > SCORE_THRESHOLD_NO_CONTEXT) {
      // 4: Has some match but no established context — treat as new entity
      resolvedMode = 'new';
      const nodeData = getNodeData(bestMatch.name);
      session.activeEntity = {
        name: bestMatch.name,
        type: nodeData ? nodeData.type : bestMatch.type,
        node: nodeData ? nodeData.node : null
      };
      session.lastResultItems  = [];
      session.lastList         = [];
      session.lastResultType   = null;
      session.lastResultCount  = 0;
      session.lastResultEntity = null;
      console.log(`[DEBUG] RESOLUTION → new entity (no prior context): ${bestMatch.name} (score ${score})`);

    } else {
      resolvedMode = 'fallback';
    }

    console.log(`[RESOLUTION]`);
    console.log(`${resolvedMode}`);
    console.log(`[DEBUG] AFTER RESOLUTION → activeEntity: ${session.activeEntity ? session.activeEntity.name : 'null'}`);

    // ── Year Extraction & Update ───────────────────────────────────────────────
    const yearMatch = rawQuery.match(/(?:^|[^\d])(18\d{2}|19\d{2}|20\d{2})(?:[^\d]|$)/);
    if (yearMatch) {
      session.currentYearFilter = parseInt(yearMatch[1], 10);
    } else if (resolvedMode === 'new' || (!hasContextPronounRef && resolvedMode === 'fallback' && !isCount && !isList && !isDetail)) {
      session.currentYearFilter = null;
    }

    // ── RESPONSE GENERATION ────────────────────────────────────────────────────
    let responseText = '';
    let handledByYear = false;

    if (session.currentYearFilter && (resolvedMode === 'new' || resolvedMode === 'context' || resolvedMode === 'fallback')) {
      const yearStr = session.currentYearFilter.toString();
      console.log(`\n[YearQuery]\nDetected year: ${yearStr}\n`);
      console.log(`[YearSearch]\nSearching first_edition descriptions for year: ${yearStr}`);
      console.log(`Documents searched: ${firstEditionRecords.length}`);

      const yearRegex = new RegExp(`(?:^|[^\\d])${yearStr}(?:[^\\d]|$)`);
      let matchedRecords = firstEditionRecords.filter(r => yearRegex.test(r.description));
      
      console.log(`Matches found: ${matchedRecords.length}\n`);

      let filterEntity = (bestMatch && score > 5) ? bestMatch : session.activeEntity;
      
      if (filterEntity) {
        const contextualMatches = matchedRecords.filter(r => isDescendant(r.title, filterEntity.name));
        
        // Only apply contextual filter if it yields results, OR if explicitly requested via pronoun or new entity
        if (contextualMatches.length > 0 || hasContextPronounRef || resolvedMode === 'context' || (bestMatch && score > 5)) {
          matchedRecords = contextualMatches;
          
          if (filterEntity !== session.activeEntity) {
            const nodeData = getNodeData(filterEntity.name);
            session.activeEntity = {
              name: filterEntity.name,
              type: nodeData ? nodeData.type : filterEntity.type,
              node: nodeData ? nodeData.node : null
            };
          }
        } else {
          console.log(`[YearSearch] Contextual search under ${filterEntity.name} yielded 0 results. Falling back to global search.`);
        }
      }

      // Rank matches: prefer publication statements
      matchedRecords.sort((a, b) => {
          const pubWords = /பதிப்பு|பதிப்பிக்க|வெளியிட/g;
          const aMatch = (a.description.match(pubWords) || []).length;
          const bMatch = (b.description.match(pubWords) || []).length;
          return bMatch - aMatch;
      });

      matchedRecords.forEach(r => {
        console.log(`[YearMatch]\nBook: ${r.title}\nYear: ${yearStr}\nEvidence: ${r.description}\n`);
      });

      console.log(`[YearResult]\nReturning ${matchedRecords.length} matching books\n`);

      if (matchedRecords.length === 0) {
        responseText = `No first-edition records matching the year ${session.currentYearFilter} were found in the SUVADI knowledge base.`;
        session.lastResultItems = [];
        session.lastList = [];
        session.lastResultType = null;
        session.lastResultCount = 0;
        session.lastIntent = null;
      } else {
        if (isCount) {
          responseText = `There are ${matchedRecords.length} books associated with first-edition year ${session.currentYearFilter}.`;
          session.lastIntent = 'count';
          session.lastResultType = 'count';
        } else {
          responseText = `### Books published in ${session.currentYearFilter}:\n\n`;
          matchedRecords.forEach((r, i) => {
            responseText += `**${i + 1}. ${r.title}**\n\n> ${r.description.replace(/\n/g, '\n> ')}\n\n---\n\n`;
          });
          session.lastIntent = 'list';
          session.lastResultType = 'list';
        }
        session.lastResultItems = matchedRecords.map(r => ({ name: r.title, type: r.type, node: r.node, description: r.description }));
        session.lastList = matchedRecords.map(r => r.title);
        session.lastResultCount = matchedRecords.length;
      }
      handledByYear = true;
    }

    if (!handledByYear) {
      if (resolvedMode === 'result_item') {
      // ── Detail about a specific item from the previous list ─────────────────
      const active = session.activeEntity;
      const itemTokens  = getTokens(expandQuery(active.name));
      const docxMatches = searchDocx(itemTokens);

      if (docxMatches.length > 0) {
        responseText = `### ${active.name}\n\n`;
        docxMatches.forEach(m => {
          responseText += `${m.text.replace(/\\n/g, '\n\n')}\n\n`;
        });
        // Narrow result set to this focused item so subsequent follow-ups stay on it
        session.lastList         = [active.name];
        session.lastResultItems  = [{ name: active.name, type: active.type, node: active.node }];
        session.lastResultType   = 'item';
        session.lastResultCount  = 1;
        session.lastResultEntity = { ...active };
      } else if (active.node) {
        // It's a sub-category — list its children
        const children = getImmediateChildren(active.node);
        if (children.length > 0) {
          const label = childLabel(active.type);
          const childObjs = buildChildObjects(active.node, children);
          session.lastList         = children;
          session.lastResultItems  = childObjs;
          session.lastResultType   = 'list';
          session.lastResultCount  = children.length;
          session.lastResultEntity = { ...active };
          session.lastIntent       = 'list';

          responseText = `Category: ${active.name} — ${children.length} ${label}:\n`;
          children.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
        } else {
          responseText = `### ${active.name}\n\nThis is a leaf item with no further sub-divisions in the knowledge base.`;
        }
      } else {
        responseText = `### ${active.name}\n\nI couldn't find detailed document information for this item right now.`;
      }
      session.lastIntent = 'detail';

    } else if (resolvedMode === 'new' || resolvedMode === 'context') {
      const active  = session.activeEntity;
      const isItem  = active.type === 'item';
      const label   = childLabel(active.type);

      console.log(`[DEBUG] Active: ${active.name} | type: ${active.type} | isCount: ${isCount} | isList: ${isList} | isDetail: ${isDetail} | mode: ${resolvedMode}`);

      // ── COUNT intent ─────────────────────────────────────────────────────────
      if (isCount) {
        const wantsDrillDown = resolvedMode === 'context' && session.lastResultItems.length > 0 && hasContextPronounRef && session.lastResultType === 'list' && tokens.some(t => ['under', 'in', 'of', 'கீழ்', 'உள்ள'].includes(t));

        if (wantsDrillDown) {
          let totalCount = 0;
          let responseLines = [];
          for (const item of session.lastResultItems) {
            if (item.node) {
              const children = getImmediateChildren(item.node);
              if (children.length > 0) {
                totalCount += children.length;
                responseLines.push(`- **${item.name}**: ${children.length}`);
              }
            }
          }
          if (responseLines.length > 0) {
            responseText = `Total count across these items: ${totalCount}\n\n` + responseLines.join('\n');
            session.lastResultType = 'count';
            session.lastResultCount = totalCount;
            session.lastIntent = 'count';
          } else {
            responseText = `I couldn't find any further items to count under these.`;
          }
        } else if (resolvedMode === 'context' && session.lastResultCount > 0) {
          responseText = `Category: ${active.name}\nTotal items: ${session.lastResultCount}`;
          session.lastIntent = 'count';
        } else if (!isItem) {
          const children  = getImmediateChildren(active.node);
          const childObjs = buildChildObjects(active.node, children);

          session.lastList         = children;
          session.lastResultItems  = childObjs;
          session.lastResultType   = 'count';
          session.lastResultCount  = children.length;
          session.lastResultEntity = { ...active };
          session.lastIntent       = 'count';

          responseText = `Category: ${active.name}\n${label.charAt(0).toUpperCase() + label.slice(1)}: ${children.length}`;
        } else {
          session.lastResultType  = 'item';
          session.lastResultCount = 1;
          session.lastIntent      = 'count';
          responseText = `Category: ${active.name}\n\nThis is a single item.`;
        }

      // ── LIST intent ──────────────────────────────────────────────────────────
      } else if (isList && !isItem) {
        const wantsDrillDown = resolvedMode === 'context' && session.lastResultItems.length > 0 && hasContextPronounRef && (session.lastResultType === 'list' || tokens.some(t => ['under', 'in', 'of', 'கீழ்', 'உள்ள'].includes(t)));

        if (wantsDrillDown) {
          let allChildren = [];
          let allChildObjs = [];
          let responseLines = [];

          for (const item of session.lastResultItems) {
            if (item.node) {
              const children = getImmediateChildren(item.node);
              const childObjs = buildChildObjects(item.node, children);
              if (children.length > 0) {
                const itemLabel = childLabel(item.type);
                responseLines.push(`**${item.name}** (${children.length} ${itemLabel}):`);
                children.forEach((c, i) => { responseLines.push(`${i + 1}. ${c}`); });
                responseLines.push('');
                allChildren.push(...children);
                allChildObjs.push(...childObjs);
              }
            }
          }

          if (responseLines.length > 0) {
            responseText = `Here are the details for these items:\n\n` + responseLines.join('\n');
            session.lastList = allChildren;
            session.lastResultItems = allChildObjs;
            session.lastResultType = 'list';
            session.lastResultCount = allChildren.length;
            session.lastIntent = 'list';
          } else {
            responseText = `I couldn't find any further sub-categories for these items.`;
          }
        } else if (resolvedMode === 'context' && session.lastResultType === 'list' && session.lastList.length > 0) {
          responseText = `Category: ${active.name} — ${session.lastResultCount} items:\n`;
          session.lastList.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
          session.lastIntent = 'list';
        } else {
          const children  = getImmediateChildren(active.node);
          const childObjs = buildChildObjects(active.node, children);

          session.lastList         = children;
          session.lastResultItems  = childObjs;
          session.lastResultType   = 'list';
          session.lastResultCount  = children.length;
          session.lastResultEntity = { ...active };
          session.lastIntent       = 'list';

          if (children.length > 0) {
            responseText = `Category: ${active.name} — ${children.length} ${label}:\n`;
            children.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
          } else {
            responseText = `Category: ${active.name} has no ${label} in the knowledge base.`;
          }
        }

      // ── DETAIL / DEFAULT intent ───────────────────────────────────────────────
      } else {
        const hasSpecificQ = tokens.some(
          t => !getTokens(expandQuery(active.name)).includes(t) && !hasContextPronoun(t) && !FILLER_WORDS.includes(t)
        );

        let targetItems = [];
        
        if (resolvedMode === 'context' && session.lastResultItems.length > 0 && !isItem) {
          targetItems = session.lastResultItems;
        } else if (!isItem && isDetail) {
          // Getting children of category to show their details
          const children = getImmediateChildren(active.node);
          targetItems = buildChildObjects(active.node, children);
          
          session.lastList = children;
          session.lastResultItems = targetItems;
          session.lastResultType = 'list';
          session.lastResultCount = children.length;
          session.lastResultEntity = { ...active };
        } else {
          targetItems = [active];
        }

        responseText = '';
        let foundAny = false;
        
        if (targetItems.length > 0 && (!isItem && isDetail || resolvedMode === 'context')) {
           responseText = `### Details for items under ${session.lastResultEntity ? session.lastResultEntity.name : active.name}:\n\n`;
           for (const item of targetItems) {
             const itemToks = getTokens(expandQuery(item.name));
             const docxMatches = searchDocx(itemToks);
             if (docxMatches.length > 0) {
               foundAny = true;
               responseText += `**${item.name}**\n`;
               docxMatches.forEach(m => {
                 responseText += `${m.text.replace(/\\n/g, '\n\n')}\n\n`;
               });
               responseText += `---\n\n`;
             } else {
               responseText += `**${item.name}**\nDescription is not available for ${item.name} in the SUVADI knowledge base.\n\n---\n\n`;
             }
           }
           if (!foundAny && targetItems.length === 1 && !isItem) {
               // Fallback if no specific children found
               responseText = ''; 
           }
           if (responseText) session.lastIntent = 'detail';
        }

        // Standard fallback docx search if not resolved by children mapping
        if (!responseText) {
          const searchTokens   = tokens.length > 0 && !hasContextPronoun(rawQuery)
                                 ? tokens
                                 : getTokens(expandQuery(active.name));
          const entityTokens   = getTokens(expandQuery(active.name));
          const combinedTokens = Array.from(new Set([...searchTokens, ...entityTokens]));

          const docxMatches = searchDocx(combinedTokens);

          if (docxMatches.length > 0 && (hasSpecificQ || isItem)) {
            responseText = `### ${active.name}\n\n`;
            docxMatches.forEach(m => {
              responseText += `${m.text.replace(/\\n/g, '\n\n')}\n\n`;
            });
            session.lastIntent = 'detail';
          } else if (!isItem) {
            const children  = getImmediateChildren(active.node);
            const childObjs = buildChildObjects(active.node, children);

            session.lastList         = children;
            session.lastResultItems  = childObjs;
            session.lastResultType   = 'list';
            session.lastResultCount  = children.length;
            session.lastResultEntity = { ...active };
            session.lastIntent       = 'list';

            if (children.length > 0) {
              responseText = `Category: ${active.name} — ${children.length} ${label}:\n`;
              children.forEach((c, i) => { responseText += `${i + 1}. ${c}\n`; });
            } else {
              responseText = `Category: ${active.name}\n${label.charAt(0).toUpperCase() + label.slice(1)}: 0`;
            }
          } else {
            responseText = `### ${active.name}\n\nTitle identified in the hierarchy, but I couldn't extract more details from the document right now.`;
            session.lastIntent = 'detail';
          }
        }
      }
    }
    } // Close if (!handledByYear)

    // ── FALLBACK: document search when no entity context at all ───────────────
    if (!responseText && resolvedMode === 'fallback') {
      const docxMatches = searchDocx(tokens);
      if (docxMatches.length > 0 && docxMatches[0].score > 10) {
        responseText = `### Document Results\n\n`;
        docxMatches.forEach(m => {
          responseText += `${m.text.replace(/\\n/g, '\n\n')}\n\n`;
        });
      }
    }

    // ── AMBIGUOUS: ask for clarification ─────────────────────────────────────
    if (!responseText) {
      if (session.activeEntity && resolvedMode === 'context') {
        responseText = `Could you clarify what information you need regarding "${session.activeEntity.name}"?`;
      } else {
        responseText = 'The requested information is not available in the current SUVADI knowledge base.';
      }
    }

    // ── DEBUG: log saved state ────────────────────────────────────────────────
    console.log(`[RETRIEVAL]`);
    console.log(`Source: ${handledByYear ? 'Year Search' : (resolvedMode === 'fallback' ? 'Document Search' : 'Metadata/Document Search')}`);
    console.log(`[RESULT]`);
    console.log(`Returned response of length ${responseText.length}`);
    console.log(`[DEBUG] ════════════════════════════════\n`);

    // ── Persist conversational state for subsequent turns ─────────────────────
    session.previousQuery    = rawQuery;
    session.previousIntent   = session.lastIntent;
    session.previousResponse = responseText.trim();
    session.relevantChildren = session.lastResultItems;

    // ── Append to session history with metadata ───────────────────────────────
    session.history.push({
      role:          'model',
      text:          responseText.trim(),
      resultType:    session.lastResultType,
      resultEntity:  session.lastResultEntity ? session.lastResultEntity.name : null,
      resultCount:   session.lastResultCount
    });

    return { text: responseText.trim(), source: 'System' };

  } catch (err) {
    console.error('[Chatbot] Deterministic Engine Error:', err);
    return {
      text:   'An error occurred while analyzing your query.',
      source: 'System'
    };
  }
}

module.exports = { initRetrieval, handleChatQuery };
