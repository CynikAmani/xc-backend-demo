const express = require('express');

app.post('/', (req, res) => {
    const { message } = req.body;

    res.send(`You sent: ${message}`);
});