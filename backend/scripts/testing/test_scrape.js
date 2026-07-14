const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testSearch() {
  try {
    const form = new FormData();
    form.append('do', 'search');
    form.append('sfind', '1');
    form.append('book_id', '10');
    form.append('category_id', '16');
    form.append('sub_category_id', '17');
    form.append('iSearch', 'தேடுக');

    const res = await axios.post('https://suvadi.cict.in/suvadi/search.php', form, {
      headers: form.getHeaders()
    });
    fs.writeFileSync('test_output.html', res.data);
    console.log('Saved to test_output.html');
  } catch (e) {
    console.log(e.message);
  }
}
testSearch();
