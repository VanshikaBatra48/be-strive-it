"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });
    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));
        return res.status(400).json({
            success: false,
            message: errors[0]?.message || 'Validation failed',
            errors,
        });
    }
    // Write cleaned data back (trim, lowercase, coerce)
    const data = result.data;
    if (data.body !== undefined)
        req.body = data.body;
    if (data.params)
        Object.assign(req.params, data.params);
    if (data.query)
        req.validatedQuery = data.query;
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map