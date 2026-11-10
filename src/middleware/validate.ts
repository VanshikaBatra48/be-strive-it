import { Request, Response, NextFunction } from "express";
import { ZodType} from "zod";

export const validate =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
     console.log("VALIDATE RAN:", req.method, req.originalUrl, req.body);

    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });


    console.log("VALIDATION SUCCESS?", result.success);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // Write cleaned data back (trim, lowercase, coerce)
    const data = result.data as any;
    if (data.body) req.body = data.body;
    if (data.params) Object.assign(req.params, data.params);

    next();
  };