const { where } = require('sequelize');
const { Intern, Mentor } = require('../models/associations');

//creating interns
async function createIntern(data) {
    const { name, email,role,joinedOn,status, mentorId } = data;

    // Business validation
    if (!name || !email) {
        throw new Error('Name and email are required');
    }

    // Check whether email already exists
    const existingIntern = await Intern.findOne({
        where: { email }
    });

    if (existingIntern) {
        throw new Error('An intern with this email already exists');
    }

    // Validate mentor if one was provided
    if (mentorId !== undefined && mentorId !== null) {
        const mentor = await Mentor.findByPk(mentorId);

        if (!mentor) {
            throw new Error('Mentor not found');
        }

        if (mentor.status !== 'active') {
            throw new Error('Cannot assign an inactive mentor');
        }
    }

    // Create intern in the database
    const intern = await Intern.create({
        name,
        email,
        role,
        joinedOn,
        status,
        mentorId: mentorId ?? null
    });

    return intern;
}


//Getting all mentee
async function getAllInterns() {
    return Intern.findAll({
        include: [
            {
                model: Mentor,
                as: 'mentor',
                attributes: ['id', 'name', 'email']
            }
        ]
    });
}

//Getting mentee by Id
async function getInternById(id) {
    const intern = await Intern.findByPk(id, {
        include: [
            {
                model: Mentor,
                as: 'mentor',
                attributes: ['id', 'name', 'email']
            }
        ]
    });

    if (!intern) {
        throw new Error('Intern not found');
    }

    return intern;
}

//Getting intern by name
async function getInternByName(name){
    const intern = await Intern.findAll({
        where:{
            name: name
        },
        include: [
            {
            model: Mentor,
            as: 'mentor',
            attributes: ['id', 'name', 'email']
            }
        ]
    });
    if(intern.length === 0){
        throw new Error(`No Intern with ${name} found`)
    }

    return intern;
}


//get intern by email
async function getInternByEmail(email){
    const intern = await Intern.findOne({
        where:{
            email: email
        },
        include: [
            {
                model: Mentor,
            as: 'mentor',
            attributes: ['id', 'name', 'email']
            }
        ]
    });
    if(!intern){
        throw new Error(`No Intern with ${email} found`)
    }
    return intern;
}

//getting intern by active or inactive filter
async function getInternByStatus(status){
    const intern = await Intern.findAll({
        where:{
            status: status
        
        },
        include: [
            {
                model: Mentor,
                as: 'mentor',
                attributes: ['id', 'name', 'email']
            }
        ]
    });

    if(intern.length  === 0){
        throw new Error(`${status} intern not found`);
    }
    return intern;
}

module.exports = {
    createIntern,
    getAllInterns,
    getInternById,
    getInternByEmail,
    getInternByName,
    getInternByStatus
};