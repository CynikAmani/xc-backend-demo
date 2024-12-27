const express = require('express');  
const db = require('../../../../config/db');  
const checkAdmin = require('../../../../auth/checkAdmin');  
const router = express.Router();  

// Route to update normal rates to match standard rates  
router.post('/', checkAdmin, (req, res) => {  
    const sql = `  
        UPDATE interest_rates  
        SET normal_rate = standard_rate;  
    `; 

    db.query(sql, (error, results) => {  
        if (error) {  
            console.error('Error updating normal rates:', error);  
            return res.status(500).json({ message: 'Error updating rates' });  
        }  
        res.status(200).json({ message: 'Normal rates updated successfully', affectedRows: results.affectedRows });  
    });  

});  

module.exports = router;