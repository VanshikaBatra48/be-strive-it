"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class PasswordReset extends sequelize_1.Model {
}
PasswordReset.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    otpHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    attempts: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    verifiedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    resetTokenHash: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    resetTokenExpiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    usedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'PasswordReset',
    tableName: 'password_resets',
    timestamps: true,
    indexes: [{ fields: ['userId'] }],
});
exports.default = PasswordReset;
//# sourceMappingURL=resetPassword.js.map