import { useState, useEffect, useRef } from "react";

export function useDelayedLoading(loading, options = {}) {
  const {
    delay = 300,
    minDisplayTime = 400,
  } = options;

  const [show, setShow] = useState(false);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const minDisplayTimeoutRef = useRef(null);

  useEffect(() => {
    if (loading) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      timeoutRef.current = setTimeout(() => {
        setShow(true);
      }, delay);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (show && startTimeRef.current !== null) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, minDisplayTime - elapsed);

        if (remaining > 0) {
          minDisplayTimeoutRef.current = setTimeout(() => {
            setShow(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          setShow(false);
          startTimeRef.current = null;
        }
      } else {
        setShow(false);
        startTimeRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
      }
    };
  }, [loading, delay, minDisplayTime, show]);

  return show;
}

