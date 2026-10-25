const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'data', 'books.json');
const booksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const GITHUB_USER = 'senpaitiktok832-coder';
const REPO = 'altyn-kitep';

const generatedBooks = booksData.map(book => {
  let url = '';
  
  if (book.uploaded) {
    // ЖЕЛЕЗОБЕТОННАЯ ЛОГИКА ТЕГОВ
    let releaseTag = 'v1'; // По умолчанию для 1-5 классов
    
    if (book.grade === 6) releaseTag = 'v2';
    if (book.grade === 7) releaseTag = 'v3';
    if (book.grade === 8) releaseTag = 'v4';
    if (book.grade === 9) releaseTag = 'v5';
    if (book.grade === 10) releaseTag = 'v6';
    if (book.grade === 11) releaseTag = 'v7';

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