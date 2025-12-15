// Validadores de formularios y datos

/**
 * Valida un email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida una contraseña (mínimo 6 caracteres)
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Valida que un string no esté vacío
 */
export const isNotEmpty = (str) => {
  return str && str.trim().length > 0;
};

/**
 * Valida un nombre de tablero
 */
export const isValidBoardName = (name) => {
  return isNotEmpty(name) && name.length <= 100;
};

