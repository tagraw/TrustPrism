const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLogin = ({ email, password }) => {
  const errors = {};

  if (!email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(email)) {
    errors.email = "Invalid email address";
  }

  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
};

export const validateRegister = (data) => {
  const errors = {};

  if (!data.email) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(data.email)) {
    errors.email = "Invalid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 8) {
    // UX hint (backend allows it anyway)
    errors.password = "Password must be at least 8 characters";
  }

  if (!data.first_name) {
    errors.first_name = "First name is required";
  }

  if (!data.last_name) {
    errors.last_name = "Last name is required";
  }

  if (!["user", "researcher"].includes(data.role)) {
    errors.role = "Please select a valid role";
  }

  if (data.role === "user" && !data.dob) {
    errors.dob = "Date of birth is required";
  }

  return errors;
};
