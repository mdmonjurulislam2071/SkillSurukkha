async function notify(connection, userId, type, title, message, data = null) {
  await connection.query(
    `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );
}

module.exports = notify;
