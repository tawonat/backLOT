'use strict';

const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:     Number(   process.env.DB_PORT)    || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'restaurant_db',
      waitForConnections: true,
      connectionLimit:    Number(process.env.DB_POOL_MAX) || 10,
      queueLimit:         0,
      timezone:           '+00:00',
      decimalNumbers:     true,
    });
  }
  return pool;
}

/**
 * Execute a query and return rows + fields.
 * @param {string} sql
 * @param {any[]}  [params]
 */
async function query(sql, params = []) {
  const [rows, fields] = await getPool().execute(sql, params);
  return { rows, fields };
}

/**
 * Run multiple queries inside a single transaction.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} callback
 */
async function transaction(callback) {
  const conn = await getPool().getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, query, transaction };
