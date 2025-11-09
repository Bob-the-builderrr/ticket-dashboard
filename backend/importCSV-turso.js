// backend/importCSV-turso.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { db, createTables } = require('./database-turso');

function forceToISO(dateString) {
  if (!dateString) return null;
  const s = String(dateString).trim().replace(/^\uFEFF/, '');
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  return s.slice(0, 10);
}

function pick(row, ...keys) {
  for (const k of keys) if (k in row && row[k] !== '') return row[k];
  return null;
}

const argPath = process.argv[2] || '../data/october_data.csv';
const inputPath = path.resolve(__dirname, argPath);

if (!fs.existsSync(inputPath)) {
  console.error('Input CSV not found:', inputPath);
  process.exit(1);
}

async function importData() {
  console.log('🔄 Creating tables in Turso...');
  const ok = await createTables();
  if (!ok) {
    throw new Error('Cannot import - table creation failed'); // <-- throw so main .catch runs
  }

  let readCount = 0, writeCount = 0;
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(csv())
      .on('data', (row) => {
        readCount++;

        const date = forceToISO(pick(row, 'date','Date','﻿Date'));
        const ticket_id = pick(row, 'ticket_id','Ticket ID','Ticket_Id','TicketID');
        const plan_type = pick(row, 'plan_type','Plan Type','Plan');
        const agent_name = pick(row, 'agent_name','Agent Name');
        const gleap_url = pick(row, 'gleap_url','Gleap URL');
        const categoriesRaw = pick(row, 'category','Category');
        const complaint = pick(row, 'complaint','Complaint');

        if (!ticket_id || ticket_id === '') {
          if (readCount % 1000 === 0) {
            console.log(`Skipped ${readCount} rows due to missing ticket_id`);
          }
          return;
        }

        const cats = (categoriesRaw || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        if (cats.length === 0) cats.push('Uncategorized');

        for (const category of cats) {
          rows.push({
            ticket_id: String(ticket_id).trim(),
            date: date ? String(date).trim() : null,
            plan_type: plan_type ? String(plan_type).trim() : null,
            agent_name: agent_name ? String(agent_name).trim() : null,
            gleap_url: gleap_url ? String(gleap_url).trim() : null,
            category: String(category).trim(),
            complaint: complaint ? String(complaint).trim() : null,
          });
        }
      })
      .on('end', async () => {
        if (rows.length === 0) {
          console.log('No valid rows found in CSV.');
          resolve();
          return;
        }

        try {
          console.log(`Starting batch import of ${rows.length} rows...`);
          console.log('Sample rows:');
          for (let i = 0; i < Math.min(3, rows.length); i++) {
            console.log(`  Row ${i}: date="${rows[i].date}", ticket_id="${rows[i].ticket_id}"`);
          }

          const BATCH_SIZE = 100;

          for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
            const values = batch.flatMap(r => [
              r.ticket_id, r.date, r.plan_type, r.agent_name,
              r.gleap_url, r.category, r.complaint
            ]);

            const sql = `
              INSERT INTO tickets
              (ticket_id, date, plan_type, agent_name, gleap_url, category, complaint)
              VALUES ${placeholders}
            `;

            await db.execute(sql, values);
            writeCount += batch.length;
            console.log(`✅ Batch imported: ${writeCount}/${rows.length} records...`);
          }

          console.log(`🎉 SUCCESS! Imported ${writeCount} total records.`);
          resolve();
        } catch (error) {
          console.error('❌ Import failed:', error);
          reject(error);
        }
      })
      .on('error', (err) => {
        console.error('CSV read error:', err.message);
        reject(err);
      });
  });
}

// Run import
importData()
  .then(() => {
    console.log('Import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error.message || error);
    process.exit(1);
  });
