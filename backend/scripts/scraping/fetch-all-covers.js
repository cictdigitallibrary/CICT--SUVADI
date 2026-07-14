const fs = require('fs');
const path = require('path');
const https = require('https');

const FOLDER_MAP = [
  { pdf_hint: 'thol/1.1847',   folder: 'thol_1847'         },
  { pdf_hint: 'thol/2.1868',   folder: 'thol_1868_ezhuthu_ilam' },
  { pdf_hint: 'thol/3.1868',   folder: 'thol_1868_sol_sena' },
  { pdf_hint: 'thol/5.1927',   folder: 'thol_1927'         },
  { pdf_hint: 'thol/6.1982',   folder: 'thol_1892'         },
  { pdf_hint: 'thol/7.1929',   folder: 'thol_1929'         },
  { pdf_hint: 'thol/9.1920',   folder: 'thol_1920'         },
  { pdf_hint: 'thol/10.1933',  folder: 'thol_1933'         },
  { pdf_hint: 'thol/11.1935',  folder: 'thol_1935_a'       },
  { pdf_hint: 'thol/12.1985',  folder: 'thol_1885'         },
  { pdf_hint: 'thol/14.1917',  folder: 'thol_1917'         },
  { pdf_hint: 'thol/15.1858',  folder: 'thol_1858'         },
  { pdf_hint: 'thol_1935.pdf', folder: 'thol_1935'         },
  { pdf_hint: 'thol_porul_1917', folder: 'thol_porul_1917' },
  { pdf_hint: 'thol_sol_kal',  folder: 'thol_sol_kal'      },
  { pdf_hint: 'ettothokai/1.1915', folder: 'natrinai_1915' },
  { pdf_hint: 'ettothokai/2.1915', folder: 'kurunthokai_1915' },
  { pdf_hint: 'ettothokai/3.1903', folder: 'ainkurunuru_1903' },
  { pdf_hint: 'ettothokai/4.1904', folder: 'pathirrupathu_1904' },
  { pdf_hint: 'ettothokai/5.1918', folder: 'paripadal_1918' },
  { pdf_hint: 'ettothokai/6.1887', folder: 'kalithokai_1887' },
  { pdf_hint: 'ettothokai/7.1918', folder: 'agananuru_1918' },
  { pdf_hint: 'ettothokai/8.1894', folder: 'purananuru_1894' },
  { pdf_hint: 'ettothokai/10-1889', folder: 'pathupatu_1889' },
  { pdf_hint: 'kilkanakku/1.thirukkural', folder: 'thirukkural_1812' },
  { pdf_hint: 'kilkanakku/2.naladiyar',   folder: 'naladiyar_1812'   },
  { pdf_hint: 'kilkanakku/iniyavai40',    folder: 'iniyavai40'       },
  { pdf_hint: 'kilkanakku/04.aasarakovai', folder: 'asarakovai_1857' },
  { pdf_hint: 'kilkanakku/thirukadugam',  folder: 'thirikadugam_1868'},
  { pdf_hint: 'kilkanakku/naamanikadigai', folder: 'nanmanikadigai_1872' },
  { pdf_hint: 'kilkanakku/7.palamoli400', folder: 'palamoli_1874'    },
  { pdf_hint: 'kilkanakku/sirupanjamoolam', folder: 'sirupanjamoolam_1875' },
  { pdf_hint: 'kilkanakku/9.kalavizhi40', folder: 'kalavali40_1875'  },
  { pdf_hint: 'kilkanakku/10.kaar40',     folder: 'kaar40_1875'      },
  { pdf_hint: 'kilkanakku/inna40',        folder: 'inna40_1881'      },
  { pdf_hint: 'kilkanakku/muthumozhikanchi', folder: 'mutumozhikanchi_1895' },
  { pdf_hint: 'kilkanakku/13.elathi',     folder: 'elathi_1887'      },
  { pdf_hint: 'kilkanakku/Aindhinai50',   folder: 'ainthinal50_1903' },
  { pdf_hint: 'kilkanakku/15.thinaimalai150', folder: 'thinaimalai150_1904' },
  { pdf_hint: 'kilkanakku/16.ainthenai70', folder: 'ainthinai70_1906' },
  { pdf_hint: 'kilkanakku/17.thinaimoli50', folder: 'thinaemoli50_1918' },
  { pdf_hint: 'kilkanakku/18.kainilai_1931', folder: 'kainilai_1931' },
  { pdf_hint: 'Silappathikaram/1.1872', folder: 'silampathikaram_1872' },
  { pdf_hint: 'Silappathikaram/2.1876', folder: 'silampathikaram_1876' },
  { pdf_hint: 'Silappathikaram/3.1880', folder: 'silampathikaram_1880' },
  { pdf_hint: 'Silappathikaram/silambu_1892', folder: 'silampathikaram_1892' },
  { pdf_hint: 'Mutholayiram/mutholayiram_1905', folder: 'mutholayiram_1905' },
  { pdf_hint: 'irayanar/irayanar', folder: 'irayanar_1883' }
];

const editions = [
  { book_id: 9, title: 'தொல்காப்பியம் - எழுத்து – நச்சர். – மழைவை மகாலிங்கையர் (1847)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/1.1847.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - எழுத்து – இளம். – சுப்பராய செட்டியார் (1868)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/2.1868.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல். சேனா. – கோமளபுரம் இராசகோபால பிள்ளை ( 1868)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/3.1868.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – இளம் – கா. நமச்சிவாய முதலியார் (1927)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/5.1927.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – நச்சர். – சி.வை. தாமோதரம் பிள்ளை (1892)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/6.1982.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் – தெய்வ. - அரங்க வேங்கடாசலம் (1929)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/7.1929.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் – அகம், புறம் – கா. நமச்சிவாய முதலியார் (1920)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/9.1920.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - களவு, கற்பு, பொருளியல் – வ.உ. சிதம்பரம் பிள்ளை (1933)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/10.1933.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - மெய், உவ, செய், மரபு - வ.உ. சிதம்பரம் பிள்ளை (1935)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/11.1935.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – நச்சர். - சி.வை. தாமோதரம் பிள்ளை (1885)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/12.1985.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – பின்னான்கு இயல், பேரா. சி.வை. தாமோதரம் பிள்ளை (1885)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/12.1985.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – செய்யு. நச்சர். ரா. இராகவையங்கார் (1917)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/14.1917.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - நன்னூல் மூலம் – எஸ். சாமுவேல் பிள்ளை - (1858)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/15.1858.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் – இளம் - மெய், உவ, செய், மரபு - வ.உ.சிதம்பரம் பிள்ளை(1935)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_1935.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - பொருள் - பேராசிரியர் உரை, ச. பவானந்தம் பிள்ளை (1917)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_porul_1917.pdf' },
  { book_id: 9, title: 'தொல்காப்பியம் - சொல் - கல்லாடனார் உரை (1964)', pdf: 'https://suvadi.cict.in/asp/pdf/thol/thol_sol_kal.pdf' },
  { book_id: 10, title: 'நற்றிணை மூலமும் உரையும் – பின்னத்தூர் நாராயணசாமி ஐயங்கார் (1915)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/1.1915.pdf' },
  { book_id: 10, title: 'குறுந்தொகை மூலமும் உரையும் – திருக்கண்ணபுரத்து சௌரிப்பெருமாளரங்கனார் (1915)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/2.1915.pdf' },
  { book_id: 10, title: 'ஐங்குறுநூறு மூலமும் பழைய உரையும் – உ.வே. சாமிநாதையர் (1903)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/3.1903.pdf' },
  { book_id: 10, title: 'பதிற்றுப்பத்து மூலமும் பழைய உரையும் - உ.வே. சாமிநாதையர் (1904)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/4.1904.pdf' },
  { book_id: 10, title: 'பரிபாடல் மூலமும் பரிமேலழகர் உரையும் - உ.வே. சாமிநாதையர் ( 1918)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/5.1918.pdf' },
  { book_id: 10, title: 'கலித்தொகை மூலமும் நச்சினார்க்கினியர் உரையும் – சி.வை.தாமோதரம் பிள்ளை (1887)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/6.1887.pdf' },
  { book_id: 10, title: 'அகநானூறு மூலமும் உரையும் – கம்பர் விலாசம் வே. இராஜகோபாலையங்கார் (1918)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/7.1918.pdf' },
  { book_id: 10, title: 'புறநானூறு மூலமும் பழைய உரையும் - உ.வே. சாமிநாதையர் (1894)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/8.1894.pdf' },
  { book_id: 11, title: 'பத்துப்பாட்டு மூலமும் நச்சினார்க்கினியர் உரையும் - உ.வே. சாமிநாதையர் - (1889)', pdf: 'https://suvadi.cict.in/asp/pdf/ettothokai/10-1889.pdf' },
  { book_id: 13, title: 'திருக்குறள் – தஞ்சை ஞானப்பிறகாசன்(1812)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/1.thirukkural.pdf' },
  { book_id: 13, title: 'நாலடியார் – தஞ்சை ஞானப்பிறகாசன் (1812)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/2.naladiyar.pdf' },
  { book_id: 13, title: 'இனியவை நாற்பது – முகவை இராமாநுச கவிராயர் (1844)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/iniyavai40.pdf' },
  { book_id: 13, title: 'ஆசாரக்கோவை – தில்லையம்பூர் சந்திசேகர கவிராஜ பண்டிதர் (1857)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/04.aasarakovai.pdf' },
  { book_id: 13, title: 'திரிகடுகம் – நல்லூர் சதாசிவப்பிள்ளை (1868)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/thirukadugam.pdf' },
  { book_id: 13, title: 'நான்மணிக்கடிகை – தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1872)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/naamanikadigai.pdf' },
  { book_id: 13, title: 'பழமொழி – சோடசாவதானம் சுப்பராயசெட்டியார் (1874)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/7.palamoli400.pdf' },
  { book_id: 13, title: 'சிறுபஞ்சமூலம் – சண்முகசுந்தரமுதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/sirupanjamoolam.pdf' },
  { book_id: 13, title: 'களவழி நாற்பது – சண்முகசுந்தர முதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/9.kalavizhi40.pdf' },
  { book_id: 13, title: 'கார்நாற்பது – சண்முகசுந்தர முதலியார் (1875)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/10.kaar40.pdf' },
  { book_id: 13, title: 'இன்னா நாற்பது – சண்முகசுந்தர முதலியார் (1881)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/inna40.pdf' },
  { book_id: 13, title: 'முதுமொழிக் காஞ்சி – உரையூர் மதுரைநாயக முதலியார் (1895)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/muthumozhikanchi.pdf' },
  { book_id: 13, title: 'ஏலாதி – ஊ. புஷ்பரத செட்டியார் (1887)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/13.elathi.pdf' },
  { book_id: 13, title: 'ஐந்திணையைம்பது – ரா. இராகவையங்கார் (1903)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/Aindhinai50.pdf' },
  { book_id: 13, title: 'திணைமாலை நூற்றைம்பது - ரா. இராகவையங்கார் (1904)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/15.thinaimalai150.pdf' },
  { book_id: 13, title: 'ஐந்திணையெழுபது - மு. இராகவையங்கார் (1906)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/16.ainthenai70.pdf' },
  { book_id: 13, title: 'திணைமொழியைம்பது – ஸ்ரீ சோமசுந்தர தேசிகர் (1918)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/17.thinaimoli50.pdf' },
  { book_id: 13, title: 'கைந்நிலை – இ.வை. அனந்தராமையர் (1931)', pdf: 'https://suvadi.cict.in/asp/pdf/kilkanakku/18.kainilai_1931.pdf' },
  { book_id: 12, title: 'சிலப்பதிகாரம் – வேனிற்காதை வரை – மூலம் மட்டும் - தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1872)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/1.1872.pdf' },
  { book_id: 12, title: 'சிலப்பதிகாரம் – புகார் காண்டம் – மூலம் மட்டும் - தி.ஈ. ஸ்ரீநிவாசராகவாசாரியார் (1876)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/2.1876.pdf' },
  { book_id: 12, title: 'சிலப்பதிகாரம் – புகார் காண்டம் – மூலமும் அடியார்க்கு நல்லார் உரையும், தி. க. சுப்பராய செட்டியார்(1880)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/3.1880.pdf' },
  { book_id: 12, title: 'சிலப்பதிகார மூலமும் அடியார்க்கு நல்லார் உரையும் – உ.வே.சா. – (1892)', pdf: 'https://suvadi.cict.in/asp/pdf/Silappathikaram/silambu_1892.pdf' },
  { book_id: 16, title: 'முத்தொள்ளாயிரம் - ரா. இராகவையங்கார் (1905)', pdf: 'https://suvadi.cict.in/asp/pdf/Mutholayiram/mutholayiram_1905.pdf' },
  { book_id: 15, title: 'இறையனாரகப்பொருள் மூலமும் உரையும் – சி.வை. தாமோதரம் பிள்ளை (1883)', pdf: 'https://suvadi.cict.in/asp/pdf/irayanar/irayanar.pdf' }
];

const OUTPUT_DIR = path.join(__dirname, '../frontend/public/images/cover/editions');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) return resolve();
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const finalMap = {};

  for (const edition of editions) {
    const mapping = FOLDER_MAP.find(m => edition.pdf.includes(m.pdf_hint));
    if (mapping) {
      const imgUrl = `https://suvadi.cict.in/asp/ebooks/${mapping.folder}/files/mobile/1.jpg`;
      const uniqueFilename = `${mapping.folder}_1.jpg`;
      const localPath = `/images/cover/editions/${uniqueFilename}`;
      
      try {
        await downloadImage(imgUrl, path.join(OUTPUT_DIR, uniqueFilename));
        finalMap[edition.title.replace(/\s+/g, ' ').trim()] = localPath;
        console.log(`✅ Downloaded cover for: ${edition.title}`);
      } catch (err) {
        console.log(`❌ Failed cover for: ${edition.title} (${imgUrl})`);
      }
    }
  }

  fs.writeFileSync('map_all.json', JSON.stringify(finalMap, null, 2));
  console.log('Map written to map_all.json');
}

main().catch(console.error);
