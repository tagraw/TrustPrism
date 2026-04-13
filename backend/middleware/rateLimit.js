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

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: "Too many requests from this IP. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: "Too many password reset requests from this IP. Please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const settingsUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many settings updates from this IP. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const createGroupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: "Too many groups created from this IP. Please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const createGameLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10,
  message: {
    error: "Too many games created from this IP. Please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const createTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 20,
  message: {
    error: "Too many tickets/requests created from this IP. Please try again after an hour."
  },
  standardHeaders: true,
  legacyHeaders: false
});
