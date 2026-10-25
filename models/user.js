const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { assign } = require('nodemailer/lib/shared');

const User = sequelize.define(
    'User',
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
            unique: true,
            validate: {
                isEmail: true
            }
        },
        
        assigned_to:{
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: 'admin'

        },

        password: {
            type: DataTypes.STRING,
            allowNull: false
        },

        role: {
            type: DataTypes.ENUM('admin', 'mentee', 'mentor'),
            allowNull: false,
            defaultValue: 'admin'
        },

        joined: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active'
        }
        ,firstLogin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
    },
    {
        tableName: 'users',
        timestamps: true

    }
);

module.exports = User;