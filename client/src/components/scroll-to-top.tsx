import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Component that handles scrolling to top when route changes
 * Automatically scrolls to the top of the page for both navigation and refresh
 * Usage: Just add this component once at the app root level
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // When location changes, scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location]);

  // Handle page refresh
  useEffect(() => {
    // Set up an event that runs once when the page loads
    const handlePageLoad = () => {
      window.scrollTo({
        top: 0,
        behavior: 'auto' // Use 'auto' for refresh to avoid visible animation
      });
    };

    // Call immediately and also attach to load event
    handlePageLoad();
    window.addEventListener('load', handlePageLoad);

    // Clean up
    return () => {
      window.removeEventListener('load', handlePageLoad);
    };
  }, []);

  // This component doesn't render anything
  return null;
}