export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    shouldRetry = (error) => {
      const retryableErrors = [
        'unavailable',
        'deadline-exceeded',
        'network-error',
        'timeout',
      ];
      return retryableErrors.some(code => 
        error.code === code || error.message?.toLowerCase().includes(code)
      );
    },
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function getErrorMessage(error) {
  if (!error) return "An unknown error occurred";
  
  if (error.code) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'This email is already registered',
      'auth/weak-password': 'Password is too weak',
      'auth/invalid-email': 'Invalid email address',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/too-many-requests': 'Too many requests. Please try again later',
      'unavailable': 'Service temporarily unavailable. Please try again',
      'deadline-exceeded': 'Request timed out. Please try again',
      'permission-denied': 'You do not have permission to perform this action',
      'not-found': 'Resource not found',
    };
    
    return errorMessages[error.code] || error.message || 'An error occurred';
  }
  
  return error.message || 'An unknown error occurred';
}

