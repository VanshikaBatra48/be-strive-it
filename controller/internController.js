const internService = require('../service/internService');

//create intern
async function createIntern(req, res, next) {
try {
    const { name, email , mentorId, joinedOn, status } = req.body;

    // Validate required fields
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Name and email are required'
        });
    }

    const internData = {
        name, 
        email,
        role:'intern',
        mentorId,
        joinedOn,
        status
    };

    const intern = await internService.createIntern(internData);

    return res.status(201).json({
        success: true,
        message: 'Intern created successfully',
        data: intern
    });
} catch (error) {
    next(error);
}
}

//get intern by id
async function getInternById(req, res, next) {
try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid intern ID'
        });
    }

    const intern = await internService.getInternById(Number(id));

    if (!intern) {
        return res.status(404).json({
            success: false,
            message: `Intern with ID ${id} not found`
        });
    }

    return res.status(200).json({
        success: true,
        data: intern
    });
} catch (error) {
    next(error);
}
}

// Get all interns
async function getAllInterns(req, res, next) {
try {
const interns = await internService.getAllInterns();

    return res.status(200).json({
        success: true,
        count: interns.length,
        data: interns
    });
} catch (error) {
    next(error);
}

}



//Get Interns By name
async function getInternByName(req , res , next) {
    try{
        const { name } = req.params;
        const intern = await internService.getInternByName(name);

        if (intern.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No interns found with name ${name}`
            });
        }
         res.status(200).json({
            success: true,
            count: intern.length,
            data: intern
        });
    }catch (error) {
        next(error);
    }
}

//Get Interns by Email
async function getInternByEmail(req, res, next) {
    try{
        const{ email } = req.params;
        const intern = await internService.getInternByEmail(email);

        if(!intern){
            return res.status(404).json({
                success: false,
                message: `No Inter with emai; ${email}`
            });
        }
         res.status(200).json({
                success: true,
                data: intern
            })
    }catch(err){
        next(err);
    }
}

//get all intern status
async function getAllInterByStatus(req, res, next) {
    try{
        const { status } = req.params;
        const intern = await internService.getInternByStatus(status);

        if(intern.length === 0){
            return res.status(404).json({
                success: false,
                message: `No Inter with emai; ${status}`
            });
        }
         res.status(200).json({
                success: true,
                count: intern.length,
                data: intern
            });
    }catch(err){
        next(err);
    }
}




module.exports = {
createIntern,
getInternById,
getAllInterns,
getInternByEmail,
getInternByName,
getAllInterByStatus
};