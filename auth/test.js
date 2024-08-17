const express = require('express');
const app = express(); // Initialize the Express app

// Define a POST route
app.post('/', (req, res) => {
    res.send('Hello there, server responded');
});

// Start the server and listen on a port
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
