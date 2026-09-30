const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { expandQuery, getTokens, scoreMatch, ALIASES } = require('./nlp');

let hierarchyData = null;
let flatHierarchy = []; 
let docxParagraphs = [];
let firstEditionRecords = [];

async function buildKnowledgeBase() {
  const hierarchyPath = path.join(__dirname, 'hierarchy.json');
  if (fs.existsSync(hierarchyPath)) {
    hierarchyData = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
    flatHierarchy.length = 0;
    flattenHierarchy(hierarchyData, null);
  }

  const docPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'first-edition.docx');
  if (fs.existsSync(docPath)) {
    const result = await mammoth.extractRawText({ path: docPath });
    docxParagraphs = result.value.split('\n').map(p => p.trim()).filter(p => p.length > 5);

    firstEditionRecords.length = 0;
    const items = flatHierarchy.filter(x => x.type === 'item');
    docxParagraphs.forEach(text => {
      if (text.length > 50) {
        let bestItem = null;
        let maxScore = 0;
        items.forEach(item => {
          const itemTokens = getTokens(expandQuery(item.name));
          const score = scoreMatch(itemTokens, text);
          if (score > maxScore) {
            maxScore = score;
            bestItem = item;
          }
        });
        if (bestItem && maxScore >= 4) {
          const yearMatch = text.match(/(?:^|[^\d])(18\d{2}|19\d{2}|20\d{2})(?:[^\d]|$)/);
          firstEditionRecords.push({
            title: bestItem.name,
            year: yearMatch ? parseInt(yearMatch[1], 10) : null,
            description: text,
            node: null,
            type: bestItem.type
          });
        }
      }
    });
  }
}

function getHierarchyPath(itemName) {
  const path = [itemName];
  let current = flatHierarchy.find(i => i.name === itemName);
  while(current && current.parent) {
    path.push(current.parent);
    current = flatHierarchy.find(i => i.name === current.parent);
  }
  return path;
}

function isDescendant(childName, ancestorName) {
  const path = getHierarchyPath(childName);
  return path.includes(ancestorName);
}

function flattenHierarchy(node, parent) {
  if (Array.isArray(node)) {
    node.forEach(title => {
      flatHierarchy.push({ name: title, parent, type: 'item' });
    });
  } else if (typeof node === 'object' && node !== null) {
    Object.keys(node).forEach(key => {
      // If parent is null, it's a MAIN CATEGORY. Otherwise SUB-CATEGORY.
      flatHierarchy.push({ name: key, parent, type: parent === null ? 'main_category' : 'sub_category' });
      flattenHierarchy(node[key], key);
    });
  }
}

function getHierarchy() {
  return hierarchyData;
}

function getNodeData(categoryName) {
  // Returns { node, type } where type is 'main_category', 'sub_category', or 'item'
  let result = null;
  
  function searchNode(node, name) {
    if (typeof node === 'object' && !Array.isArray(node)) {
      if (node[name]) return { node: node[name], type: Array.isArray(node[name]) ? 'sub_category' : 'main_category' };
      for (const key of Object.keys(node)) {
        const res = searchNode(node[key], name);
        if (res) return res;
      }
    }
    return null;
  }
  
  // Root level check
  if (hierarchyData[categoryName]) {
    return { node: hierarchyData[categoryName], type: 'main_category' };
  }
  
  const found = searchNode(hierarchyData, categoryName);
  return found;
}

function getImmediateChildren(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  if (typeof node === 'object' && node !== null) {
    return Object.keys(node);
  }
  return [];
}

function searchHierarchy(queryTokens) {
  let bestMatch = null;
  let maxScore = 0;

  flatHierarchy.forEach(item => {
    const score = scoreMatch(queryTokens, item.name);
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  });

  return { bestMatch, score: maxScore };
}

function searchDocx(queryTokens) {
  const scoredParagraphs = docxParagraphs.map(p => {
    let score = scoreMatch(queryTokens, p);
    // Boost longer paragraphs to prefer actual details over short headers
    if (score > 0 && p.length > 50) score += 20;
    return {
      text: p,
      score: score
    };
  });
  
  scoredParagraphs.sort((a, b) => b.score - a.score);
  // Remove duplicates by text to avoid returning the same header 3 times
  const unique = [];
  const seen = new Set();
  for (const p of scoredParagraphs) {
    if (p.score > 0 && !seen.has(p.text)) {
      seen.add(p.text);
      unique.push(p);
      if (unique.length === 3) break;
    }
  }
  return unique;
}

module.exports = { 
  buildKnowledgeBase, 
  getHierarchy, 
  getNodeData, 
  getImmediateChildren, 
  searchHierarchy, 
  searchDocx,
  flatHierarchy,
  firstEditionRecords,
  isDescendant
};
