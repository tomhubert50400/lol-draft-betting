export const validateEmail = (email) => {
  if (!email) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  if (email.length > 100) return "Email is too long (max 100 characters)";
  return null;
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > 128) return "Password is too long (max 128 characters)";
  return null;
};

export const validateUsername = (username) => {
  if (!username) return "Username is required";
  const trimmed = username.trim();
  if (trimmed.length < 3) return "Username must be at least 3 characters";
  if (trimmed.length > 20) return "Username is too long (max 20 characters)";
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return "Username can only contain letters, numbers, underscores, and hyphens";
  }
  return null;
};

export const validateSocialUsername = (username, platform) => {
  if (!username) return null; // Socials are optional
  const trimmed = username.trim();
  if (trimmed.length > 50) return `${platform} username is too long (max 50 characters)`;
  return null;
};

export const validateTeamName = (teamName) => {
  if (!teamName) return "Team name is required";
  const trimmed = teamName.trim();
  if (trimmed.length < 2) return "Team name must be at least 2 characters";
  if (trimmed.length > 50) return "Team name is too long (max 50 characters)";
  return null;
};

export const validateEventName = (eventName) => {
  if (!eventName) return "Event name is required";
  const trimmed = eventName.trim();
  if (trimmed.length < 3) return "Event name must be at least 3 characters";
  if (trimmed.length > 100) return "Event name is too long (max 100 characters)";
  return null;
};

