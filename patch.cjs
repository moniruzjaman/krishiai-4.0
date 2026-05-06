const fs = require('fs');

let code = fs.readFileSync('services/geminiService.ts', 'utf8');

// Replace standard generation but IGNORE the one inside safeGenerateContent
// We can do this by splitting the file and only replacing after safeGenerateContent definition
const splitIdx = code.indexOf('export const analyzeCropImage');
let header = code.substring(0, splitIdx);
let body = code.substring(splitIdx);

// Replace ai.models.generateContent({ model: 'foo', contents: ... })
// with safeGenerateContent(ai, 'foo', { contents: ... })
body = body.replace(/await\s+ai\.models\.generateContent\(\{\s*model:\s*(['"`][^'"`]+['"`]),([\s\S]*?)\}\)/g, 'await safeGenerateContent(ai, $1, {$2})');

fs.writeFileSync('services/geminiService.ts', header + body);
console.log('Patched successfully');
