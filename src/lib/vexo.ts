// Vexo Analytics utility
// https://www.vexo.co/

declare global {
  interface Window {
    vexo?: {
      identifyDevice: (userId: string) => void;
    };
  }
}

/**
 * Identify a user for Vexo analytics tracking
 * Call this after user login or when user is authenticated
 * @param userId - User's email or unique identifier
 */
export const identifyUser = (userId: string) => {
  if (typeof window !== 'undefined' && window.vexo) {
    window.vexo.identifyDevice(userId);
  }
};

/**
 * Check if Vexo is loaded and ready
 */
export const isVexoReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.vexo;
};
