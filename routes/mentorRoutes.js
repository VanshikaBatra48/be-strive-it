const express = require('express');
const router = express.Router();

const {
    createMentor,
    getMentorById,
    getAllMentors,
    getMentorByName,
    getMentorByEmail,
    getMentorsByStatus
} = require('../controller/mentorController');

// Create mentor
router.post('/createMentor', createMentor);

// Get all mentors
router.get('/getAllMentors', getAllMentors);

// Get mentor by ID
router.get('/getMentorById/:id', getMentorById);

// Get mentors by name
router.get('/getMentorByName/:name', getMentorByName);

// Get mentor by email
router.get('/getMentorByEmail/:email', getMentorByEmail);

// Get mentors by status
router.get('/getMentorsByStatus/:status', getMentorsByStatus);

module.exports = router;