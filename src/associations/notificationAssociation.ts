import  User  from "../models/user";
import { Notification } from "../models/notification";

User.hasMany(Notification, { foreignKey: "userId", as: "notifications", onDelete: "CASCADE" });
Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

export { User, Notification };