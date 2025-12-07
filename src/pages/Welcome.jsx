import React from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div
        className="auth-card"
        style={{ maxWidth: "500px", textAlign: "center" }}
      >
        <h2>Welcome! 🎉</h2>
        <div style={{ marginBottom: "2rem" }}>
          <p
            style={{
              marginBottom: "1rem",
              fontSize: "1rem",
              lineHeight: "1.6",
            }}
          >
            This website and the gifts are offered for free, however, I could
            appreciate a follow.
          </p>
          <a
            href="https://x.com/tomhrt1"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              marginBottom: "1rem",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow @tomhrt1
          </a>
        </div>
        <button
          onClick={() => navigate("/")}
          className="btn-secondary"
          style={{ width: "100%" }}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}

