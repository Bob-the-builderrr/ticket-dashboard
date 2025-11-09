// backend/check-rows.js
const db = require('./database-turso');

async function checkRows() {
  try {
    // Wait a bit for database to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await db.execute('SELECT COUNT(*) as total FROM tickets');
    console.log(`✅ Total rows in database: ${result.rows[0].total}`);
    
    // Check distinct dates
    const dates = await db.execute('SELECT COUNT(DISTINCT date) as distinct_dates FROM tickets');
    console.log(`📅 Distinct dates: ${dates.rows[0].distinct_dates}`);
    
    // Check categories
    const categories = await db.execute('SELECT COUNT(DISTINCT category) as distinct_categories FROM tickets');
    console.log(`🏷️ Distinct categories: ${categories.rows[0].distinct_categories}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkRows();