require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'naveen0902',
    database: process.env.MYSQL_DATABASE || 'retailhub'
  });

  const [rows] = await conn.query('SELECT order_id, status, payment_status, created_at FROM orders');
  console.log('Total orders in DB:', rows.length);
  console.log('Sample orders:', rows.slice(0, 10));

  const counts = {};
  for (const r of rows) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }
  console.log('Status counts breakdown:', counts);

  const [historyRows] = await conn.query('SELECT order_id, status FROM tracking_events');
  console.log('Tracking events count:', historyRows.length);
  const historyCounts = {};
  for (const r of historyRows) {
    historyCounts[r.status] = (historyCounts[r.status] || 0) + 1;
  }
  console.log('Tracking history status counts:', historyCounts);

  await conn.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
