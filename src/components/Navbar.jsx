import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import UserSearch from "./UserSearch";

export default function Navbar() {
  const { currentUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  function closeMenu() {
    setMenuOpen(false);
    setShowSearch(false);
  }

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        showSearch
      ) {
        setShowSearch(false);
      }
    }

    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showSearch]);

  async function handleLogout() {
    setError("");

    try {
      await logout();
      closeMenu();
      navigate("/login");
    } catch {
      setError("Failed to log out");
    }
  }

  const navLinks = (
    <>
      {currentUser && (
        <div
          ref={searchContainerRef}
          className={`nav-search ${showSearch ? "open" : ""}`}
        >
          <button
            type="button"
            className="nav-icon-button"
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label={showSearch ? "Close search" : "Search users"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" />
            </svg>
          </button>
          <div className="nav-search-input">
            <UserSearch ref={searchInputRef} placeholder="Search players..." />
          </div>
        </div>
      )}
      <Link to="/" onClick={closeMenu}>
        Matches
      </Link>
      <Link to="/leaderboard" onClick={closeMenu}>
        Leaderboard
      </Link>
      {currentUser && (
        <>
          {isAdmin && (
            <Link to="/admin" onClick={closeMenu}>
              Admin
            </Link>
          )}
          <button
            type="button"
            className="user-info"
            onClick={() => {
              closeMenu();
              navigate(`/profile/${currentUser.uid}`);
            }}
          >
            {currentUser.displayName || currentUser.email}
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </>
      )}
      {!currentUser && (
        <Link to="/login" onClick={closeMenu}>
          Login
        </Link>
      )}
    </>
  );

  return (
    <nav className={`navbar ${menuOpen ? "menu-open" : ""}`}>
      <div className="nav-brand">
        <Link to="/" onClick={closeMenu}>
          LoL Draft Betting
        </Link>
      </div>
      <button
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className={`nav-links ${menuOpen ? "open" : ""}`}>{navLinks}</div>
    </nav>
  );
}
