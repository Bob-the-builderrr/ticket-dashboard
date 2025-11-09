// backend/simple-test.js
const { createClient } = require('@libsql/client');

console.log('🔍 Testing NEW Turso connection...');

// Use the NEW credentials
const db = createClient({
  url: "libsql://dashboard-test-bob-the-builderrr.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODQzMzEsImlkIjoiZDg2MTA4ZDAtY2FkZS00YmVjLTkxYWYtZWI0NTE1ZTllODUzIiwicmlkIjoiYmVlMzhhZjctOTc5NC00OTIyLWFhZjctOWRlM2YwMDZmMDdlIn0.zFIbIyRixgglhu02Cfm_JqnDqZbLxr6Ua-eF4aiU6w9fKnPmE6KalTWAB5aCLN3bTMPN2DmL7dhR9Sf-a4KoDg"
});

async function test() {
  try {
    console.log('1. Creating test table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      )
    `);
    
    console.log('2. Inserting test data...');
    await db.execute('INSERT INTO test_table (name) VALUES (?)', ['test_value']);
    
    console.log('3. Reading test data...');
    const result = await db.execute('SELECT * FROM test_table');
    
    console.log('✅ SUCCESS! Turso connection works!');
    console.log('Test data:', result.rows);
    
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.log('Error details:', error);
  }
}

test();