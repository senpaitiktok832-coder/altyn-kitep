const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'data', 'books.json');
const booksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const GITHUB_USER = 'senpaitiktok832-coder';
const REPO = 'altyn-kitep';

const generatedBooks = booksData.map(book => {
  let url = '';
  
  if (book.uploaded) {
    const releaseTag = `v${book.grade - 4}`; 
    url = `https://github.com/${GITHUB_USER}/${REPO}/releases/download/${releaseTag}/${book.id}.pdf`;
  }

  return {
    id: book.id,
    title: book.title,
    subject: book.subject,
    grade: book.grade,
    lang: book.lang,
    year: book.year,
    type: book.type,
    url: url
  };
});

const outputCode = `export const books = ${JSON.stringify(generatedBooks, null, 2)};\n`;

const outputPath = path.join(__dirname, 'data', 'books.js');
fs.writeFileSync(outputPath, outputCode, 'utf8');

console.log("Success! Total books: " + generatedBooks.length);
console.log("File updated: data/books.js");