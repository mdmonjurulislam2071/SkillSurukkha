async function notify(connection, userId, type, title, message, data = null) {
  const [result] = await connection.query(
    `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );
  const [rows] = await connection.query(`SELECT * FROM notifications WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function notifyRole(connection, role, type, title, message, data = null) {
  const payload = data ? JSON.stringify(data) : null;
  const [result] = await connection.query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     SELECT id, ?, ?, ?, ? FROM users WHERE role = ? AND status = 'active'`,
    [type, title, message, payload, role]
  );
  if (!result.affectedRows) return [];
  const [notifications] = await connection.query(
    `SELECT * FROM notifications WHERE id BETWEEN ? AND ? ORDER BY id DESC`,
    [result.insertId, result.insertId + result.affectedRows - 1]
  );
  return notifications;
}

async function notifyRoles(connection, roles, type, title, message, data = null) {
  const notifications = [];
  for (const role of roles) notifications.push(...await notifyRole(connection, role, type, title, message, data));
  return notifications;
}

notify.role = notifyRole;
notify.roles = notifyRoles;

module.exports = notify;
