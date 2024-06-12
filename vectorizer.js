const natural = require('natural');

async function vectorizeDocument(text) {
    console.log("Vectorizing document...");

    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const vector = tokens.map(token => token.length); // Példa vektorizálás, a valós alkalmazáshoz finomhangolás szükséges
    
    console.log("Document vectorized successfully:", vector);
    return vector;
}

function formatText(text) {
    // 1. Sortörések cseréje szóközökre
    let formattedText = text.replace(/\n/g, ' ');

    // 2. Felesleges szóközök eltávolítása
    formattedText = formattedText.replace(/\s+/g, ' ').trim();

    // 3. Mondatok elkülönítése új sorokkal
    formattedText = formattedText.replace(/([.!?])\s*(?=[A-Z])/g, "$1\n");

    // 4. Szóközök hozzáadása az írásjelek után
    formattedText = formattedText.replace(/([,.!?])(\S)/g, '$1 $2');

    return formattedText;
}

async function saveToDatabase(pdfTexts, pdfVectors) {
    console.log("Saving PDF vectors to database...");
    // Mock adatbázis művelet
    console.log("PDF vectors saved:", pdfVectors);
}

module.exports = { vectorizeDocument, saveToDatabase, formatText };
