const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:cict26@192.168.0.169:5432/suvadi' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sv_songs'")
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(console.error);
