const express = require('express');
const router = express.Router(); // Create a router

// Define a POST route
router.post('/', (req, res) => {
    res.send('Hello there, server responded');
});

module.exports = router; // Export the router
