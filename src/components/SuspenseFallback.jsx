import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function SuspenseFallback() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return <LoadingSpinner size="large" text="Loading page..." fullScreen />;
}

