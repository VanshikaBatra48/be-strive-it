const { DataTypes } = require('sequelize');
const { sequelize }= require('../config/database');

const Intern = sequelize.define(
    'Intern',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        role:{
            type: DataTypes.ENUM('intern'),
            allowNull: false,
            defaultValue: 'intern'
        },
        mentorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'mentor',
                key: 'id'
            }
        },
        joinedOn :{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        status:{
             type: DataTypes.ENUM(
            'active',
            'inactive'
            ),
            allowNull: false,
            defaultValue: 'active'
        }
        
    },
    {
        tableName: 'interns',
        timestamps: true
    }
);

module.exports = Intern;