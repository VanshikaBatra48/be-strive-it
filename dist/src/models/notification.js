"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Notification extends sequelize_1.Model {
}
exports.Notification = Notification;
Notification.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        get() {
            return Number(this.getDataValue("id"));
        },
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    }, // no `field: "id"`
    type: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    title: {
        type: sequelize_1.DataTypes.STRING(150),
        allowNull: false
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false
    },
    data: {
        type: sequelize_1.DataTypes.JSONB,
        allowNull: false, defaultValue: {}
    },
    is_read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE
    },
}, {
    sequelize: database_1.sequelize,
    tableName: "notifications",
    modelName: "Notification",
    timestamps: true,
    createdAt: "created_at", // use your attribute instead of adding createdAt
    updatedAt: false,
});
//# sourceMappingURL=notification.js.map