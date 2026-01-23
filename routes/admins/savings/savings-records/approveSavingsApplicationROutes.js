const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

router.post('/', checkAdmin, (req, res) => {
    const { application_id, amount, applicant, savings_attributes } = req.body;
    const customerId = applicant.username;
    const interestRate = savings_attributes.interest_rate;

    if (!application_id || !customerId || !amount || !interestRate) {
        return res.status(400).json({ 
            message: 'Missing required fields' 
        });
    }

    // Calculate return amount
    const returnAmount = amount + (amount * interestRate / 100);
    
    // Calculate return date (3 months from now)
    const startDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const returnDate = moment().add(3, 'months').format('YYYY-MM-DD HH:mm:ss');

    // 1. Insert into savings table
    const savingsQuery = `
        INSERT INTO savings 
        (customer_id, amount_saved, interest_rate, return_amount, start_date, return_date) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(savingsQuery, [ customerId, amount, interestRate, returnAmount, startDate, returnDate], (savingsErr, savingsResult) => {
        if (savingsErr) {
            console.error('Error creating savings record:', savingsErr);
            return res.status(500).json({ 
                message: 'Failed to create savings record' 
            });
        }

        // Get the admin ID from session
        const handlerId = req.session.userId;
        const savingsId = savingsResult.insertId;

        // 2. Create audit log
        const auditQuery = `
            INSERT INTO savings_audits 
            (handler_id, savings_id, action, description) 
            VALUES (?, ?, ?, ?)
        `;
        
        const auditDescription = `Approved savings application for customer with ID: ${customerId}. amount: MWK ${amount}, interest rate: ${interestRate}%, return amount: MWK ${returnAmount}`;
        
        db.query(auditQuery, [
            handlerId,
            savingsId,
            'approve_application',
            auditDescription
        ], (auditErr) => {
            if (auditErr) {
                console.error('Error creating audit log:', auditErr);
            }

            // 3. Delete from savings_applications table
            const deleteQuery = 'DELETE FROM savings_applications WHERE application_id = ?';
            
            db.query(deleteQuery, [application_id], (deleteErr, deleteResult) => {
                if (deleteErr) {
                    console.error('Error deleting application:', deleteErr);
                    return res.status(500).json({ 
                        message: 'Savings created but failed to delete application' 
                    });
                }

                // 4. Update application_activity table
                const activityQuery = `
                    INSERT INTO application_activity 
                    (customer_id, last_approved_application_date, num_applications) 
                    VALUES (?, ?, 1)
                    ON DUPLICATE KEY UPDATE 
                        last_approved_application_date = VALUES(last_approved_application_date)
                `;
                
                db.query(activityQuery, [customerId, startDate], (activityErr) => {
                    if (activityErr) {
                        console.error('Error updating application activity:', activityErr);
                        // Continue anyway - don't fail the whole request for this
                    }

                    // 5. Create notification for the user
                    const notificationContent = `
                      ✅ Your savings application has been APPROVED!
                      
                      💵 Amount: MWK ${amount.toLocaleString()}
                      📈 Interest Rate: ${interestRate}%
                      💰 Expected Return: MWK ${returnAmount.toLocaleString()}
                      📅 Maturity Date: ${moment(returnDate).format('D MMM, YYYY')}
                      ⏳ Investment Period: 3 months.
                      
                      Your funds will mature on ${moment(returnDate).format('dddd, D MMMM YYYY')} and will be available for withdrawal then.
                      
                      Thank you for choosing to save with us!
                     `;
                    
                    const notificationQuery = `
                        INSERT INTO notifications 
                        (notification_type, target_user, content, date) 
                        VALUES (?, ?, ?, ?)
                    `;
                    
                    db.query(notificationQuery, ['info', customerId, notificationContent, startDate], (notifyErr, notifyResult) => {
                        if (notifyErr) {
                            console.error('Error creating notification:', notifyErr);
                            return res.status(500).json({ 
                                message: 'Savings created and application deleted, but failed to create notification' 
                            });
                        }

                        res.status(200).json({ 
                            success: true,
                            message: 'Application approved successfully',
                            savingsId: savingsResult.insertId,
                            applicationId: application_id,
                            returnDate: returnDate,
                            returnAmount: returnAmount
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;