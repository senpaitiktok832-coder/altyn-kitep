const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const UPLOAD_DIR = path.join(__dirname, 'books_to_upload');
const JSON_PATH = path.join(__dirname, 'data', 'books.json');

async function parsePDFs() {
  if (!fs.existsSync(UPLOAD_DIR)) return console.log("Папка books_to_upload не найдена!");
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.endsWith('.pdf'));
  
  let existingBooks = [];
  if (fs.existsSync(JSON_PATH)) existingBooks = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const newBooksMap = new Map(existingBooks.map(b => [b.id, b]));

  for (const file of files) {
    const filePath = path.join(UPLOAD_DIR, file);
    
    // Если файл уже назван по шаблону (например, 5-rus-math-2023.pdf), пропускаем
    if (file.match(/^\d+-[a-z]+-[a-z]+(-p\d+)?-\d{4}\.pdf$/)) {
      continue; 
    }

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const text = data.text.substring(0, 3000).toLowerCase(); // Читаем первые 3000 символов

      // 1. Ищем класс
      let grade = 5;
      const gradeMatch = text.match(/(\d+)\s*(класс|классы|кл\.|class)/);
      if (gradeMatch) grade = parseInt(gradeMatch[1]);

      // 2. Ищем язык
      let lang = 'rus';
      if (text.includes('кыргыз') || text.includes('кырг')) lang = 'kyr';

      // 3. Ищем год
      let year = '2023';
      const yearMatch = text.match(/(20[0-2]\d)/);
      if (yearMatch) year = yearMatch[1];

      // 4. Ищем часть (p1, p2)
      let part = '';
      if (text.includes('1-бөлүк') || text.includes('1 часть') || text.includes('часть 1') || text.includes('1-часть')) part = '-p1';
      if (text.includes('2-бөлүк') || text.includes('2 часть') || text.includes('часть 2') || text.includes('2-часть')) part = '-p2';

      // 5. Ищем предмет
      let subject = 'other';
      if (text.includes('математик')) subject = 'math';
      else if (text.includes('русский язык')) subject = 'rus';
      else if (text.includes('кыргыз тили')) subject = 'kyr';
      else if (text.includes('литератур') || text.includes('адабият') || text.includes('чтение')) subject = 'lit';
      else if (text.includes('английск') || text.includes('англис')) subject = 'eng';
      else if (text.includes('биолог')) subject = 'bio';
      else if (text.includes('географ')) subject = 'geo';
      else if (text.includes('истор') || text.includes('тарых')) subject = 'history';
      else if (text.includes('физик')) subject = 'phys';
      else if (text.includes('хими')) subject = 'chem';
      else if (text.includes('информатик')) subject = 'info';
      else if (text.includes('музыка')) subject = 'music';
      else if (text.includes('изо') || text.includes('көркөм')) subject = 'art';
      else if (text.includes('мекен')) subject = 'meken';
      else if (text.includes('алиппе') || text.includes('буквар')) subject = 'alip';

      // Формируем новое имя
      const newId = `${grade}-${lang}-${subject}${part}-${year}`;
      const newFilePath = path.join(UPLOAD_DIR, `${newId}.pdf`);
      
      // Переименовываем
      fs.renameSync(filePath, newFilePath);
      console.log(`✅ [${file}] ➡️ [${newId}.pdf]`);

      newBooksMap.set(newId, {
        id: newId,
        title: `${subject.toUpperCase()} (${year})${part ? ' Ч.' + part.replace('-p','') : ''}`,
        subject: subject,
        grade: grade,
        lang: lang,
        year: year,
        type: 'student',
        uploaded: true
      });

    } catch (e) {
      console.log(`❌ Не удалось прочитать: ${file}. Возможно, это скан без текста.`);
    }
  }

  const finalBooks = Array.from(newBooksMap.values()).sort((a, b) => a.grade - b.grade);
  fs.writeFileSync(JSON_PATH, JSON.stringify(finalBooks, null, 2), 'utf8');
  console.log(`\n🎉 Готово! Обновлен books.json (всего книг: ${finalBooks.length})`);
  
  // Запускаем генерацию books.js
  require('./generate.js');
}

parsePDFs();