import { body, validationResult } from "express-validator";

export const signupValidation = [
  body("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8, max: 32 })
    .withMessage("Password must be 8–32 characters"),

  body("first_name")
    .notEmpty()
    .withMessage("First name is required"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }
    next();
  }
];

export const loginValidation = [
  body("email").isEmail(),
  body("password").notEmpty(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    next();
  }
];
