const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

router.post('/', checkAdmin, (req, res) => {
    const { savingsRecord } = req.body;
    const handlerId = req.session.userId;

    if (!savingsRecord || !savingsRecord.savings_id) {
        return res.status(400).json({ 
            message: 'Savings record data is required' 
        });
    }

    if (!handlerId) {
        return res.status(401).json({ 
            message: 'Admin authentication required' 
        });
    }

    const { 
        savings_id, 
        amount_saved, 
        return_amount, 
        applicant 
    } = savingsRecord;

    const customerId = applicant.username;
    const withdrawalDate = moment().format('YYYY-MM-DD HH:mm:ss');

    // 1. Update savings record as withdrawn
    const updateQuery = `
        UPDATE savings 
        SET is_withdrawn = TRUE, date_withdrawn = ?
        WHERE savings_id = ? AND customer_id = ? AND is_withdrawn = FALSE
    `;

    db.query(updateQuery, [withdrawalDate, savings_id, customerId], (updateErr, updateResult) => {
        if (updateErr) {
            console.error('Error updating savings record:', updateErr);
            return res.status(500).json({ 
                message: 'Failed to update savings record' 
            });
        }

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ 
                message: 'Savings record not found or already withdrawn' 
            });
        }

        // 2. Create audit log
        const auditQuery = `
            INSERT INTO savings_audits 
            (handler_id, savings_id, action, description) 
            VALUES (?, ?, ?, ?)
        `;
        
        const auditDescription = `Processed withdrawal for savings #${savings_id}. Customer: ${customerId}, Initial: MWK ${amount_saved}, Return: MWK ${return_amount}`;
        
        db.query(auditQuery, [
            handlerId,
            savings_id,
            'process_withdrawal',
            auditDescription
        ], (auditErr) => {
            if (auditErr) {
                console.error('Error creating audit log:', auditErr);
            }

            // 3. Create notification for the user
            const notificationContent = `
                Your savings withdrawal has been processed successfully!
                
                Details:
                • Initial Amount: MWK ${amount_saved.toLocaleString()}
                • Return Amount: MWK ${return_amount.toLocaleString()}
                • Withdrawal Date: ${moment(withdrawalDate).format('D MMM, YYYY HH:mm')}
                
                Payment has been processed to your account.
                Thank you for saving with us! Xander Creditors Team.
            `;
            
            const notificationQuery = `
                INSERT INTO notifications 
                (notification_type, target_user, content, date) 
                VALUES (?, ?, ?, ?)
            `;
            
            db.query(notificationQuery, ['info', customerId, notificationContent, withdrawalDate], (notifyErr) => {
                if (notifyErr) {
                    console.error('Error creating notification:', notifyErr);
                    return res.status(500).json({ 
                        message: 'Withdrawal processed but failed to create notification' 
                    });
                }

                res.status(200).json({ 
                    success: true,
                    message: 'Withdrawal processed successfully',
                    savingsId: savings_id,
                    withdrawalDate: withdrawalDate
                });
            });
        });
    });
});

module.exports = router;