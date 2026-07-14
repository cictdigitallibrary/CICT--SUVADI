const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'backend', '.env');
let envStr = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

envStr = envStr.replace(/STORAGE_PATH=.*/g, 'STORAGE_PATH=\\\\\\192.168.0.169\\suvadi\\storage');
envStr = envStr.replace(/SONGS_PATH=.*/g, 'SONGS_PATH=\\\\\\192.168.0.169\\suvadi\\songs');

fs.writeFileSync(envPath, envStr);
console.log('✅ Updated backend/.env to use UNC paths');

// Read index.js
const indexPath = path.join(__dirname, 'backend', 'index.js');
let indexStr = fs.readFileSync(indexPath, 'utf8');

// 1. Fix admin dashboard missing check
const oldCheck = `const ROOT = path.join(__dirname, '..');
    rows.rows.forEach(r => {
      r.is_missing = r.local_pdf_url ? !fs.existsSync(path.join(ROOT, r.local_pdf_url)) : true;
    });`;

const newCheck = `rows.rows.forEach(r => {
      r.is_missing = r.local_pdf_url 
        ? !fs.existsSync(require('path').join(STORAGE_PATH, 'pdfs', require('path').basename(r.local_pdf_url)))
        : true;
    });`;

if (indexStr.includes(oldCheck)) {
    indexStr = indexStr.replace(oldCheck, newCheck);
    console.log('✅ Replaced __dirname with STORAGE_PATH in admin missing check');
} else if (indexStr.includes("r.is_missing = r.local_pdf_url ? !fs.existsSync(path.join(ROOT, r.local_pdf_url)) : true;")) {
    indexStr = indexStr.replace(
        "const ROOT = path.join(__dirname, '..');",
        ""
    );
    indexStr = indexStr.replace(
        "r.is_missing = r.local_pdf_url ? !fs.existsSync(path.join(ROOT, r.local_pdf_url)) : true;",
        "r.is_missing = r.local_pdf_url ? !fs.existsSync(require('path').join(STORAGE_PATH, 'pdfs', require('path').basename(r.local_pdf_url))) : true;"
    );
    console.log('✅ Replaced __dirname with STORAGE_PATH in admin missing check (fallback)');
} else {
    console.log('⚠️ Could not find admin missing check code');
}

// 2. Fix error logging in PDF endpoint
const oldCatchNew = `    } catch (_) {
      return res.status(404).json({ error: 'PDF not available locally.' });
    }`;

const newCatchNew = `    } catch (err) {
      console.error(\`[PDF PROXY] Network Share / Filesystem error: \${err.message} | Path: \${localPath}\`);
      return res.status(404).json({ error: 'PDF not accessible on the network share', details: err.message, path: localPath });
    }`;

if (indexStr.includes(oldCatchNew)) {
    indexStr = indexStr.replace(oldCatchNew, newCatchNew);
    console.log('✅ Enhanced error logging for new PDF proxy endpoint');
} else {
    console.log('⚠️ Could not find catch block for new PDF endpoint');
}

const oldCatchOld = `    } catch (_) {
      console.error(\`[PDF] Local file not found or invalid: \${localPath}\`);
      return res.status(404).json({
        error: 'PDF not available locally. Run: node backend/download_missing_pdfs.js',
      });
    }`;

const newCatchOld = `    } catch (err) {
      console.error(\`[PDF] Network Share / Filesystem error: \${err.message} | Path: \${localPath}\`);
      return res.status(404).json({
        error: 'PDF not accessible on the network share', details: err.message, path: localPath
      });
    }`;

if (indexStr.includes(oldCatchOld)) {
    indexStr = indexStr.replace(oldCatchOld, newCatchOld);
    console.log('✅ Enhanced error logging for old PDF proxy endpoint');
} else {
    console.log('⚠️ Could not find catch block for old PDF endpoint');
}

fs.writeFileSync(indexPath, indexStr);
console.log('✅ index.js updated');
