const Mentor = require('../models/mentor');

// Create mentor
async function createMentor(mentorData) {
    return await Mentor.create(mentorData);
}

// Get mentor by ID
async function getMentorById(id) {
    return await Mentor.findByPk(id);
}

// Get all mentors
async function getAllMentors() {
    return await Mentor.findAll();
}

// Get mentors by name
async function getMentorByName(name) {
    return await Mentor.findAll({
        where: {
            name
        }
    });
}

// Get mentor by email
async function getMentorByEmail(email) {
    return await Mentor.findOne({
        where: {
            email
        }
    });
}

// Get mentors by status
async function getMentorsByStatus(status) {
    return await Mentor.findAll({
        where: {
            status
        }
    });
}

module.exports = {
    createMentor,
    getMentorById,
    getAllMentors,
    getMentorByName,
    getMentorByEmail,
    getMentorsByStatus
};