import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { auth, sendPasswordResetEmail } from "../firebase";
import { logger } from "../utils/logger";
import { validateEmail, validatePassword, validateUsername, validateSocialUsername } from "../utils/validation";
import { getErrorMessage } from "../utils/network";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Login() {
  const emailRef = useRef();
  const passwordRef = useRef();
  const usernameRef = useRef();
  const { login, signup } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  const twitterRef = useRef();
  const instagramRef = useRef();
  const discordRef = useRef();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError("");
      
      const email = emailRef.current.value;
      const password = passwordRef.current.value;
      
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }
      
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      
      if (!isLogin) {
        const username = usernameRef.current.value;
        const usernameError = validateUsername(username);
        if (usernameError) {
          setError(usernameError);
          return;
        }
        
        const twitter = twitterRef.current?.value || "";
        const instagram = instagramRef.current?.value || "";
        const discord = discordRef.current?.value || "";
        
        const twitterError = validateSocialUsername(twitter, "Twitter");
        if (twitterError) {
          setError(twitterError);
          return;
        }
        
        const instagramError = validateSocialUsername(instagram, "Instagram");
        if (instagramError) {
          setError(instagramError);
          return;
        }
      }
      
      setLoading(true);
      if (isLogin) {
        await login(email, password);
        navigate("/");
      } else {
        await signup(
          email,
          password,
          usernameRef.current.value,
          {
            twitter: twitterRef.current?.value || "",
            instagram: instagramRef.current?.value || "",
            discord: discordRef.current?.value || "",
          }
        );
        navigate("/welcome");
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(
        "Failed to " +
          (isLogin ? "log in" : "create an account") +
          ": " +
          errorMsg
      );
    }

    setLoading(false);
  }

  async function handleResetPassword() {
    const email = emailRef.current.value;
    if (!email) {
      return;
    }
    
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      navigate("/reset-confirmation");
    } catch (error) {
      logger.error("Error sending password reset email:", error);
      const errorMsg = getErrorMessage(error);
      setError("Error: " + errorMsg);
    }
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? "Log In" : "Sign Up"}</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" ref={emailRef} required />
            {!isLogin && (
              <small
                style={{ display: "block", marginTop: "4px", opacity: 0.8 }}
              >
                There is no need to use a real email. tho, if you use a fake
                email, you won't be able to reset your password.
              </small>
            )}
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input type="text" ref={usernameRef} required />
            </div>
          )}
          {!isLogin && (
            <div className="form-group">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSocials((prev) => !prev)}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                }}
              >
                {showSocials ? (
                  <>
                    <span>−</span>
                    <span>Hide socials</span>
                  </>
                ) : (
                  <>
                    <span>+</span>
                    <span>Add socials (optional)</span>
                  </>
                )}
              </button>
            </div>
          )}
          {!isLogin && showSocials && (
            <div className="form-group">
              <label>Socials (optional)</label>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <input
                  type="text"
                  placeholder="Twitter username (e.g. tomhrt1)"
                  ref={twitterRef}
                />
                <input
                  type="text"
                  placeholder="Instagram username (e.g. tomhrt1)"
                  ref={instagramRef}
                />
                <input
                  type="text"
                  placeholder="Discord (e.g. Username#1234)"
                  ref={discordRef}
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type={showPassword ? "text" : "password"}
                ref={passwordRef}
                required
                style={{ width: "100%", paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-6.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.66 18.66 0 0 1-2.16 3.19" />
                    <path d="M14.12 9.88A3 3 0 0 1 14.12 14.12" />
                    <path d="M1 1l22 22" />
                    </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s3-7 11-7 11 7 11 7-3 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {isLogin && (
            <div className="forgot-password">
              <button
                type="button"
                onClick={handleResetPassword}
                className="btn-link"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button disabled={loading} type="submit" className="btn-primary">
              {isLogin ? "Log In" : "Sign Up"}
            </button>
            {loading && (
              <LoadingSpinner size="small" text="" />
            )}
          </div>
        </form>
        <div className="auth-footer">
          {isLogin ? "Need an account? " : "Already have an account? "}
          <button className="btn-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}
