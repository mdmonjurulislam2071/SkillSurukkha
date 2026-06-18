const notify = require("./notifications");
const { syncSubmissionPayments } = require("./escrowReleases");

async function syncOverdueProjects(connection) {
  const [projects] = await connection.query(
    `SELECT p.id, p.client_id, p.title, a.freelancer_id
     FROM projects p
     LEFT JOIN applications a ON a.project_id = p.id AND a.status = 'hired'
     WHERE p.status = 'in_progress' AND p.deadline < CURDATE() AND p.overdue_notified_at IS NULL`
  );
  for (const project of projects) {
    const [result] = await connection.query(
      `UPDATE projects SET status = 'overdue', overdue_notified_at = NOW()
       WHERE id = ? AND status = 'in_progress' AND overdue_notified_at IS NULL`,
      [project.id]
    );
    if (!result.affectedRows) continue;
    const data = { projectId: project.id };
    await notify(connection, project.client_id, "project_overdue", "Project deadline missed", `${project.title} is overdue. Extend the deadline, request an explanation, cancel with refund if eligible, or open a dispute.`, data);
    if (project.freelancer_id) await notify(connection, project.freelancer_id, "project_overdue", "Project deadline missed", `${project.title} is overdue. Contact the client or open a dispute if needed.`, data);
  }
  await syncSubmissionPayments(connection);
}

module.exports = { syncOverdueProjects };
