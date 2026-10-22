const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mentor = sequelize.define(
    'Mentor',
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
            type: DataTypes.ENUM('mentor'),
            allowNull: false,
            defaultValue: 'mentor'
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
        tableName: 'mentor',
        timestamps: true
    }
);

module.exports = Mentor;