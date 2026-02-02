/**
 * Time Control Utilities
 * Parse time control strings like "10+0" into numeric values
 * 
 * CRITICAL: Backend expects ALL time values in SECONDS
 */

export interface ParsedTimeControl {
  timeControl: number;      // SECONDS (backend expects seconds!)
  timeIncrement: number;    // SECONDS
}

/**
 * Parse time control string format "MM+SS"
 * @param timeControlString - Format: "minutes+increment" (e.g., "10+0", "3+2")
 * @returns Object with timeControl (SECONDS) and timeIncrement (SECONDS)
 */
export function parseTimeControl(timeControlString: string): ParsedTimeControl {
  const parts = timeControlString.split('+');
  
  if (parts.length !== 2) {
    throw new Error('Invalid time control format. Expected "MM+SS"');
  }

  const minutes = parseInt(parts[0], 10);
  const incrementSeconds = parseInt(parts[1], 10);

  if (isNaN(minutes) || isNaN(incrementSeconds)) {
    throw new Error('Invalid time control values');
  }

  return {
    timeControl: minutes * 60,  // Convert minutes to SECONDS for backend
    timeIncrement: incrementSeconds,
  };
}

/**
 * Format time control for display (MM+SS format)
 */
export function formatTimeControlForDisplay(seconds: number | null, increment: number | null): string {
  if (seconds === null) return 'Unlimited';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}+${increment || 0}`;
}
