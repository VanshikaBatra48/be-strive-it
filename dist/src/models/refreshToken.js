"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class RefreshToken extends sequelize_1.Model {
}
RefreshToken.init({
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    tokenHash: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
        unique: true,
    },
    familyId: {
        type: sequelize_1.DataTypes.STRING(36),
        allowNull: false,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    revokedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
    createdAt: sequelize_1.DataTypes.DATE,
    updatedAt: sequelize_1.DataTypes.DATE,
}, {
    sequelize: database_1.sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['familyId'] },
        { fields: ['expiresAt'] },
    ],
});
exports.default = RefreshToken;
//# sourceMappingURL=refreshToken.js.map