
const express = require('express');
const router = express.Router();

const internController = require('../controller/internController');

// Create a new intern
router.post('/', internController.createIntern);

// Get all interns
router.get('/', internController.getAllInterns);

// Get an intern by ID
router.get('/id/:id', internController.getInternById);

// Get interns by name
router.get('/name/:name', internController.getInternByName);

// Get an intern by email
router.get('/email/:email', internController.getInternByEmail);

// Get interns by status (active or inactive)
router.get('/status/:status', internController.getAllInterByStatus);

module.exports = router;
