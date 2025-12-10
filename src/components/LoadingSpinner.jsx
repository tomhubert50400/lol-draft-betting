import React from "react";
import "./LoadingSpinner.css";

export default function LoadingSpinner({ 
  size = "medium", 
  text = "Loading...",
  fullScreen = false 
}) {
  return (
    <div className={`loading-container ${fullScreen ? "fullscreen" : ""}`}>
      <div className="loading-content">
        <div className={`loading-spinner ${size}`}>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-center"></div>
        </div>
        {text && <p className="loading-text">{text}</p>}
      </div>
    </div>
  );
}

