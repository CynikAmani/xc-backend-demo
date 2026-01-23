const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

router.post('/', checkAdmin, (req, res) => {
    const { applicationId, customerId } = req.body;
    const handlerId = req.session.userId;

    if (!applicationId || !customerId) {
        return res.status(400).json({ 
            message: 'Application ID and customer ID are required' 
        });
    }

    if (!handlerId) {
        return res.status(401).json({ 
            message: 'Admin authentication required' 
        });
    }

    // 1. Delete from savings_applications
    const deleteQuery = 'DELETE FROM savings_applications WHERE application_id = ? AND customer_id = ?';
    
    db.query(deleteQuery, [applicationId, customerId], (deleteErr, deleteResult) => {
        if (deleteErr) {
            console.error('Error deleting application:', deleteErr);
            return res.status(500).json({ 
                message: 'Error deleting application' 
            });
        }

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Application not found or already deleted' 
            });
        }

        // 2. Create audit log
        const auditQuery = `
            INSERT INTO savings_audits 
            (handler_id, savings_id, action, description) 
            VALUES (?, ?, ?, ?)
        `;
        
        const auditDescription = `Declined savings application for customer with ID: ${customerId}`;
        
        db.query(auditQuery, [
            handlerId,
            applicationId, // Using application_id as savings_id reference for audit
            'decline_application',
            auditDescription
        ], (auditErr, auditResult) => {
            if (auditErr) {
                console.error('Error creating audit log:', auditErr);
                // Continue with notification even if audit fails
            }

            // 3. Create notification for the user
            const notificationContent = 'Your savings application has been declined. Contact management for details.';
            const notificationQuery = `
                INSERT INTO notifications 
                (notification_type, target_user, content, date) 
                VALUES (?, ?, ?, ?)
            `;
            
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            
            db.query(notificationQuery, ['alert', customerId, notificationContent, now], (notifyErr, notifyResult) => {
                if (notifyErr) {
                    console.error('Error creating notification:', notifyErr);
                    return res.status(500).json({ 
                        message: 'Application deleted but failed to create notification' 
                    });
                }

                res.status(200).json({ 
                    success: true,
                    message: 'Application declined successfully',
                    applicationId: applicationId
                });
            });
        });
    });
});

module.exports = router;