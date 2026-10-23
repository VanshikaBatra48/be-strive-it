const mentorService = require('../service/mentorService');

// Create mentor
async function createMentor(req, res, next) {
    try {
        const { name, email, joinedOn, status } = req.body;

        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        const mentorData = {
            name,
            email,
            role: 'mentor',
            joinedOn,
            status
        };

        const mentor = await mentorService.createMentor(mentorData);

        return res.status(201).json({
            success: true,
            message: 'Mentor created successfully',
            data: mentor
        });
    } catch (error) {
        next(error);
    }
}

// Get mentor by ID
async function getMentorById(req, res, next) {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || Number(id) < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mentor ID'
            });
        }

        const mentor = await mentorService.getMentorById(Number(id));

        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: `Mentor with ID ${id} not found`
            });
        }

        return res.status(200).json({
            success: true,
            data: mentor
        });
    } catch (error) {
        next(error);
    }
}

// Get all mentors
async function getAllMentors(req, res, next) {
    try {
        const mentors = await mentorService.getAllMentors();

        return res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
}

// Get mentors by name
async function getMentorByName(req, res, next) {
    try {
        const { name } = req.params;

        const mentors = await mentorService.getMentorByName(name);

        if (mentors.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No mentors found with name ${name}`
            });
        }

        return res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
}

// Get mentor by email
async function getMentorByEmail(req, res, next) {
    try {
        const { email } = req.params;

        const mentor = await mentorService.getMentorByEmail(email);

        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: `No mentor found with email ${email}`
            });
        }

        return res.status(200).json({
            success: true,
            data: mentor
        });
    } catch (error) {
        next(error);
    }
}

// Get mentors by status
async function getMentorsByStatus(req, res, next) {
    try {
        const { status } = req.params;

        const mentors = await mentorService.getMentorsByStatus(status);

        if (mentors.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No mentors found with status ${status}`
            });
        }

        return res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createMentor,
    getMentorById,
    getAllMentors,
    getMentorByName,
    getMentorByEmail,
    getMentorsByStatus
};