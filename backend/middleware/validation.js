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
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    next();
  }
];

export const profileUpdateValidation = [
  body("first_name").optional().trim().notEmpty().withMessage("First name cannot be empty"),
  body("last_name").optional().trim().notEmpty().withMessage("Last name cannot be empty"),
  body("affiliation").optional().trim().escape(),
  body("research_interests").optional().isArray().withMessage("Research interests must be an array"),
  body("api_key").optional().trim().escape(),
  body("notification_prefs").optional().isObject().withMessage("Notification preferences must be an object"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const emailAddValidation = [
  body("email").isEmail().withMessage("Please enter a valid email address").normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const passwordUpdateValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 8, max: 32 }).withMessage("New password must be 8-32 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const groupCreateValidation = [
  body("name").trim().isLength({ min: 3 }).withMessage("Group name must be at least 3 characters").escape(),
  body("description").optional().trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const gameCreateValidation = [
  body("name").trim().notEmpty().withMessage("Name is required").escape(),
  body("description").trim().notEmpty().withMessage("Description is required").escape(),
  body("gameType").trim().notEmpty().withMessage("Game Type is required").escape(),
  body("experimentalConditions").optional().trim().escape(),
  body("targetSampleSize").optional().isInt({ min: 1 }).withMessage("Target sample size must be a positive integer"),
  body("irbApproval").optional().isBoolean().withMessage("IRB Approval must be a boolean").customSanitizer(val => val === true || val === 'true'),
  body("groupId").optional().isInt().withMessage("Group ID must be an integer"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const ticketValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").escape(),
  body("description").trim().notEmpty().withMessage("Description is required").escape(),
  body("game_id").notEmpty().withMessage("Game ID is required").isInt(),
  body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
  body("category").optional().isIn(["bug", "feature_request", "data_issue", "other"]).withMessage("Invalid category"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];

export const ccrValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").escape(),
  body("description").trim().notEmpty().withMessage("Description is required").escape(),
  body("change_type").isIn(["security_config", "access_rights", "system_config", "game_lifecycle", "account_management", "infrastructure"]).withMessage("Invalid change type"),
  body("security_impact").trim().notEmpty().withMessage("Security impact assessment is required").escape(),
  body("game_id").optional().isInt(),
  body("priority").optional().isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }
    next();
  }
];
