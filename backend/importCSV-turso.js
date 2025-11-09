// backend/importCSV-turso.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { db, createTables } = require('./database-turso');

const INPUT = process.argv[2] || path.resolve(__dirname, '../data/october_data.csv');

function toISO(d) {
  if (!d) return null;
  const s = String(d).trim().replace(/^\uFEFF/, '');
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return s.slice(0,10);
}
function pick(row, ...keys){ for (const k of keys) if (row[k]) return row[k]; return null; }

(async function run() {
  if (!fs.existsSync(INPUT)) { console.error('CSV not found:', INPUT); process.exit(1); }
  await createTables();

  const rows = [];
  fs.createReadStream(INPUT)
    .pipe(csv())
    .on('data', (r) => {
      const date = toISO(pick(r,'date','Date','﻿Date'));
      const ticket_id = pick(r,'ticket_id','Ticket ID','TicketID','Ticket_Id');
      if (!ticket_id) return;

      const plan_type = pick(r,'plan_type','Plan Type','Plan');
      const agent_name = pick(r,'agent_name','Agent Name');
      const gleap_url = pick(r,'gleap_url','Gleap URL');
      const complaint = pick(r,'complaint','Complaint');
      const cats = (pick(r,'category','Category') || 'Uncategorized')
        .split(',').map(s => s.trim()).filter(Boolean);

      for (const category of cats) {
        rows.push({ ticket_id, date, plan_type, agent_name, gleap_url, category, complaint });
      }
    })
    .on('end', async () => {
      if (!rows.length) { console.log('No rows to import'); process.exit(0); }
      const BATCH = 100;
      for (let i=0;i<rows.length;i+=BATCH){
        const batch = rows.slice(i,i+BATCH);
        const placeholders = batch.map(()=>'(?, ?, ?, ?, ?, ?, ?)').join(',');
        const values = batch.flatMap(r=>[
          r.ticket_id, r.date, r.plan_type, r.agent_name, r.gleap_url, r.category, r.complaint
        ]);
        await db.execute(`
          INSERT INTO tickets (ticket_id,date,plan_type,agent_name,gleap_url,category,complaint)
          VALUES ${placeholders}
        `, values);
        console.log(`Imported ${Math.min(i+BATCH, rows.length)}/${rows.length}`);
      }
      console.log('Done.');
      process.exit(0);
    })
    .on('error', (e)=>{ console.error(e); process.exit(1); });
})();
