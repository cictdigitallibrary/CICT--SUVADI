const { Pool } = require('pg');
const fs = require('fs');
const https = require('https');
const path = require('path');

const pool = new Pool({ connectionString: 'postgresql://postgres:cict26@192.168.0.169:5432/suvadi' });

const editionsToImport = [
  {
    book_id: 17,
    title_tamil: 'மணிமேகலை மூலம் – திருமயிலை சண்முகம் பிள்ளை (1894)',
    pdf_url: 'https://suvadi.cict.in/asp/pdf/manimekalai/1.1894.pdf',
    cover_url: 'https://suvadi.cict.in/asp/images/manimekalai/small cover page/1894.jpg',
  },
  {
    book_id: 17,
    title_tamil: 'மணிமேகலை மூலமும் அரும்பதவுரையும் – உ.வே. சாமிநாதையர் (1898)',
    pdf_url: 'https://suvadi.cict.in/asp/pdf/manimekalai/2.1898.pdf',
    cover_url: 'https://suvadi.cict.in/asp/images/manimekalai/small cover page/1894.jpg', // They used the same image
  },
  {
    book_id: 15,
    title_tamil: 'இறையனாரகப்பொருள் மூலமும் உரையும் – சி.வை. தாமோதரம் பிள்ளை (1883)',
    pdf_url: 'https://suvadi.cict.in/asp/pdf/irayanar/irayanar.pdf',
    cover_url: 'https://suvadi.cict.in/asp/images/irayanar/book cover.jpg',
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) return resolve();
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  try {
    // 1. Insert Manimekalai into sv_book if not exists
    const bCheck = await pool.query('SELECT book_id FROM sv_book WHERE book_id = 17');
    if (bCheck.rows.length === 0) {
      await pool.query('INSERT INTO sv_book (book_id, name, status) VALUES ($1, $2, $3)', [17, 'மணிமேகலை', 2]);
    } else {
      await pool.query('UPDATE sv_book SET status = 2 WHERE book_id = 17');
    }

    // Ensure Irayanar has status = 0 (or 2)
    await pool.query('UPDATE sv_book SET status = 0 WHERE book_id = 15');

    const coverMap = {};

    // 2. Insert editions and download files
    for (const ed of editionsToImport) {
      // Check if already exists
      let res = await pool.query('SELECT id FROM sv_ebook_editions WHERE pdf_url = $1', [ed.pdf_url]);
      let id;
      if (res.rows.length === 0) {
        res = await pool.query(
          'INSERT INTO sv_ebook_editions (book_id, title_tamil, pdf_url, status) VALUES ($1, $2, $3, 1) RETURNING id',
          [ed.book_id, ed.title_tamil, ed.pdf_url]
        );
        id = res.rows[0].id;
      } else {
        id = res.rows[0].id;
        await pool.query('UPDATE sv_ebook_editions SET status = 1 WHERE id = $1', [id]);
      }

      console.log(`Edition ID ${id} for ${ed.title_tamil}`);

      const pdfDest = path.join(__dirname, 'storage', 'pdfs', `edition_${id}.pdf`);
      const coverDest = path.join(__dirname, '..', 'frontend', 'public', 'images', 'cover', 'editions', `edition_${id}.jpg`);

      console.log(`Downloading PDF to ${pdfDest}`);
      await downloadFile(ed.pdf_url, pdfDest);
      await pool.query('UPDATE sv_ebook_editions SET local_pdf_url = $1 WHERE id = $2', [`storage/pdfs/edition_${id}.pdf`, id]);

      console.log(`Downloading Cover to ${coverDest}`);
      await downloadFile(ed.cover_url, coverDest);
      coverMap[id] = `/images/cover/editions/edition_${id}.jpg`;
    }

    fs.writeFileSync('new_covers.json', JSON.stringify(coverMap, null, 2));
    console.log('Done!');
  } finally {
    pool.end();
  }
}

run().catch(console.error);
