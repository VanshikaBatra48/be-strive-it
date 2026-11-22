"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHierarchy = void 0;
const user_1 = __importDefault(require("../../src/models/user"));
const getHierarchy = async (req, res) => {
    try {
        const admins = await user_1.default.findAll({
            where: { role: 'admin' },
            attributes: ['id', 'name', 'email', 'role', 'status'],
        });
        const mentors = await user_1.default.findAll({
            where: { role: 'mentor' },
            attributes: ['id', 'name', 'email', 'role', 'status'],
            include: [
                {
                    model: user_1.default,
                    as: 'mentees',
                    attributes: ['id', 'name', 'email', 'role', 'status'],
                },
            ],
            order: [['name', 'ASC']],
        });
        // All mentors go under admin(s)
        const tree = admins.map((admin) => ({
            ...admin.toJSON(),
            children: mentors.map((m) => {
                const { mentees, ...mentor } = m.toJSON();
                return { ...mentor, children: mentees ?? [] };
            }),
        }));
        res.json(tree);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch hierarchy' });
    }
};
exports.getHierarchy = getHierarchy;
//# sourceMappingURL=hierarchyController.js.map