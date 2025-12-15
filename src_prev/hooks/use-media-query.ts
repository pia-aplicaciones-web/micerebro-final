
'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook that listens to a CSS media query and returns whether it matches.
 * @param query The CSS media query string to listen for.
 * @returns {boolean} True if the media query matches, false otherwise.
 */
export const useMediaQuery = (query: string): boolean => {
  // Initialize state to a default value, `false`.
  // This prevents hydration mismatches on the server where window is not available.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Media query is a browser-only API, so we only execute this on the client.
    const media = window.matchMedia(query);
    
    // Update state if the media query match status changes.
    const listener = () => setMatches(media.matches);
    
    // Call it once initially to set the correct state on the client.
    listener();
    
    // Subscribe to future changes.
    media.addEventListener('change', listener);

    // Clean up the listener when the component unmounts.
    return () => media.removeEventListener('change', listener);
  }, [query]); // Re-run the effect if the query string changes.

  return matches;
};
