require("dotenv").config();
const pool = require("../config/db");

async function cleanupTestData() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM verification_codes WHERE payload LIKE '%Integration%'`);
    const [result] = await connection.query(`DELETE FROM users WHERE name LIKE 'Integration %'`);
    await connection.commit();
    console.log(`Removed ${result.affectedRows} disposable integration users.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

cleanupTestData()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
    return pool.end();
  });
