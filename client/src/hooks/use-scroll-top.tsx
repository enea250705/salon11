import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Custom hook to scroll to the top of the page when the route changes
 */
export function useScrollTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, [location]);
}