// backend/test-connection.js
const { createClient } = require('@libsql/client');

console.log('Testing Turso connection...');

// ✅ Directly inject your credentials
const db = createClient({
  url: "https://test-new-bob-the-builderrr.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjI2ODY2MjAsImlkIjoiZWQ5ZmRjZmUtN2E4NC00Y2U5LWFjMGMtMTZmYWM5ZTI5YTg2IiwicmlkIjoiYzI0ODlmZDAtOWU5MC00NDU0LTkwNzEtNDMyZDdmNjdjYTI4In0.TAOjUaN3nZz40zdhMkXTUNgSL2syOMoXuc7wj3AgyiTvVYL2J8Et-9XieFFg3M8g-POwhls9pmbNyOd0z_lqBQ"
});

async function test() {
  try {
    // Just test a simple query
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Turso connection successful!');
    console.log('Test result:', result.rows);
  } catch (error) {
    console.error('❌ Turso connection failed:');
    console.error('Error message:', error.message);
    console.error('Please check:');
    console.error('1. Database URL is correct');
    console.error('2. Auth token is correct'); 
    console.error('3. Database exists in Turso dashboard');
  }
}

test();