const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PasswordReset = sequelize.define( 
    "PasswordReset",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
        },

        otpHash: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },

        attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        resetTokenHash: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        resetTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },

        usedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "password_resets",
        timestamps: true,
        indexes: [
            { fields: ["userId"] },
        ],
    }
);

module.exports = PasswordReset;
