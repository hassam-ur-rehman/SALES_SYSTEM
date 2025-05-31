// dbms project 2.0/config/db.js

const mysql = require('mysql2/promise');
require('dotenv').config(); // Load .env variables

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log(`Successfully connected to the '${process.env.DB_NAME}' database!`);
    connection.release();
  })
  .catch(err => {
    console.error(`Error connecting to the '${process.env.DB_NAME}' database:`);
    console.error(`  DB_HOST: ${process.env.DB_HOST}`);
    console.error(`  DB_USER: ${process.env.DB_USER}`);
    console.error(`  DB_NAME: ${process.env.DB_NAME}`);
    console.error('  Make sure your MySQL server is running and the database exists.');
    console.error('  Check your .env file for correct credentials.');
    console.error(`  Error Code: ${err.code}, Message: ${err.message}`);
  });

module.exports = pool;