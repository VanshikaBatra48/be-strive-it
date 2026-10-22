const Intern = require('./intern');
const Mentor = require('./mentor');

// One mentor can have many interns
Mentor.hasMany(Intern, {
    foreignKey: 'mentorId',
    as: 'interns'
});

// Each intern belongs to one mentor
Intern.belongsTo(Mentor, {
    foreignKey: 'mentorId',
    as: 'mentor'
});

module.exports = { Intern, Mentor };