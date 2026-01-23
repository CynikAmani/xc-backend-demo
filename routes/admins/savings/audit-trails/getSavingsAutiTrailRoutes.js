const express = require("express");
const router = express.Router();
const db = require("../../../../config/db");
const checkAdmin = require("../../../../auth/checkAdmin");
const moment = require("moment");

// GET paginated audit trails
router.get("/", checkAdmin, (req, res) => {
  // Pagination parameters with defaults
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20)); // Cap at 50 per page
  const offset = (page - 1) * limit;

  // First, count total records
  const countQuery = "SELECT COUNT(*) as total FROM savings_audits";

  db.query(countQuery, (countErr, countResult) => {
    if (countErr) {
      console.error("Error counting audits:", countErr);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch audit trails",
      });
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated audit data
    const dataQuery = `
            SELECT 
                sa.audit_id,
                sa.handler_id,
                sa.savings_id,
                sa.action,
                sa.description,
                sa.created_at,
                u.fullname as handler_name
            FROM savings_audits sa
            JOIN users u ON sa.handler_id = u.user_id
            ORDER BY sa.created_at DESC
            LIMIT ? OFFSET ?
        `;

    db.query(dataQuery, [limit, offset], (dataErr, dataResult) => {
      if (dataErr) {
        console.error("Error fetching paginated audits:", dataErr);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch audit trails",
        });
      }

      // Format and structure the audit data
      const audits = dataResult.map((audit) => {
        const createdAt = moment(audit.created_at);

        // Determine action display and color
        let actionDisplay, actionColor, actionIcon;

        switch (audit.action) {
          case "approve_application":
            actionDisplay = "Approved Application";
            actionColor = "green";
            actionIcon = "check-circle";
            break;
          case "decline_application":
            actionDisplay = "Declined Application";
            actionColor = "red";
            actionIcon = "x-circle";
            break;
          case "process_withdrawal":
            actionDisplay = "Processed Withdrawal";
            actionColor = "blue";
            actionIcon = "dollar-sign";
            break;
          default:
            actionDisplay = audit.action
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            actionColor = "gray";
            actionIcon = "file-text";
        }

        return {
          audit_id: audit.audit_id,
          savings_id: audit.savings_id,
          action: {
            type: audit.action,
            display: actionDisplay,
            color: actionColor,
            icon: actionIcon,
          },
          description: audit.description,
          handler: {
            id: audit.handler_id,
            name: audit.handler_name,
          },
          timestamp: {
            raw: audit.created_at,
            formatted: createdAt.format("D MMM, YYYY HH:mm"),
            time_ago: createdAt.fromNow(),
            iso: createdAt.toISOString(),
          },
        };
      });

      res.status(200).json({
        success: true,
        data: {
          pagination: {
            current_page: page,
            limit: limit,
            total_records: total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_previous: page > 1,
            next_page: page < totalPages ? page + 1 : null,
            previous_page: page > 1 ? page - 1 : null,
          },
          audits: audits,
        },
      });
    });
  });
});

module.exports = router;
