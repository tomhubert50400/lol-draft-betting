import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function DelayedLoadingSpinner({ 
  delay = 300,
  minDisplayTime = 400,
  size = "large",
  text = "Loading...",
  fullScreen = false 
}) {
  const [show, setShow] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (show) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      
      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShow(false);
        }, remaining);
        return () => clearTimeout(timer);
      }
    }
  }, [show, minDisplayTime, startTime]);

  if (!show) return null;

  return <LoadingSpinner size={size} text={text} fullScreen={fullScreen} />;
}

