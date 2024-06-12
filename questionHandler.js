const natural = require('natural');

// Vektorizáló függvény a felhasználói kérdéshez
async function vectorizeQuestion(question) {
    console.log("Vectorizing question...");

    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(question);
    const vector = tokens.map(token => token.length); // Példa vektorizálás, a valós alkalmazáshoz finomhangolás szükséges

    console.log("Question vectorized successfully:", vector);
    return vector;
}

// Koszinusz hasonlóság számítása
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
}

// Legjobb válasz megtalálása a dokumentumok alapján
async function findBestMatch(userVector, pdfVectors) {
    console.log('Finding best match for user question...');

    let bestMatchIndex = -1;
    let bestMatchScore = -1;

    for (let i = 0; i < pdfVectors.length; i++) {
        const score = cosineSimilarity(userVector, pdfVectors[i]);
        console.log(`Cosine similarity for document ${i}:`, score);

        if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatchIndex = i;
        }
    }

    if (bestMatchIndex === -1) {
        console.log("No match found.");
        return null;
    }

    console.log(`Best match found: Document ${bestMatchIndex} with score ${bestMatchScore}`);
    return bestMatchIndex;
}

module.exports = { vectorizeQuestion, findBestMatch };
