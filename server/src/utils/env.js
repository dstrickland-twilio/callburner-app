/**
 * Environment utility functions
 */

/**
 * Check if the PUBLIC_BASE_URL is pointing to localhost
 * @param {string} publicBaseUrl - The PUBLIC_BASE_URL from environment
 * @returns {boolean} True if running on localhost
 */
export const isLocalhost = (publicBaseUrl) => {
  return !publicBaseUrl ||
         publicBaseUrl.includes('localhost') ||
         publicBaseUrl.includes('127.0.0.1');
};

/**
 * Check if transcription simulation should be enabled
 * @param {boolean} simulationEnabled - Explicit simulation flag
 * @param {string} publicBaseUrl - The PUBLIC_BASE_URL from environment
 * @returns {boolean} True if simulation should run
 */
export const shouldSimulateTranscription = (simulationEnabled, publicBaseUrl) => {
  return simulationEnabled || isLocalhost(publicBaseUrl);
};
