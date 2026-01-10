import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute
  max: 5,
  message: {
    error: "Too many login attempts. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const signupLimiter = rateLimit({
  windowMs: 1440 * 60 * 1000, // 24 hour
  max: 7,
  message: {
    error: "Too many signup attempts. Try again later."
  }
});
