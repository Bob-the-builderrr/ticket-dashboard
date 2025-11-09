// backend/test-no-migrations.js
const { createClient } = require('@libsql/client');

console.log('🔍 Testing Turso without migrations...');

// Try with a different configuration
const db = createClient({
  url: "libsql://dashboard-test-bob-the-builderrr.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODQzMzEsImlkIjoiZDg2MTA4ZDAtY2FkZS00YmVjLTkxYWYtZWI0NTE1ZTllODUzIiwicmlkIjoiYmVlMzhhZjctOTc5NC00OTIyLWFhZjctOWRlM2YwMDZmMDdlIn0.zFIbIyRixgglhu02Cfm_JqnDqZbLxr6Ua-eF4aiU6w9fKnPmE6KalTWAB5aCLN3bTMPN2DmL7dhR9Sf-a4KoDg"
});

async function test() {
  try {
    // Skip table creation and try a simple query first
    console.log('1. Testing simple query...');
    const result = await db.execute('SELECT 1 as test_value');
    console.log('✅ Simple query successful!');
    console.log('Result:', result.rows);
    
    // Now try table operations
    console.log('2. Creating table...');
    await db.execute('CREATE TABLE IF NOT EXISTS quick_test (id INTEGER, name TEXT)');
    console.log('✅ Table created!');
    
    console.log('3. Inserting data...');
    await db.execute('INSERT INTO quick_test (id, name) VALUES (1, "test")');
    console.log('✅ Data inserted!');
    
    console.log('4. Reading data...');
    const data = await db.execute('SELECT * FROM quick_test');
    console.log('✅ Data read:', data.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();