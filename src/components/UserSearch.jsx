import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, getDocs } from "../firebase";
import { logger } from "../utils/logger";

const UserSearch = forwardRef(function UserSearch(
  { placeholder = "Search users..." },
  ref
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const searchUsers = useCallback(async () => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const allUsers = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtered = allUsers.filter((user) =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setResults(filtered.slice(0, 5)); // Limit to 5 results

      if (filtered.length === 0) {
        setError("No users found");
      }
    } catch (error) {
      logger.error("Error searching users:", error);
      setError("Error searching users. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  function handleSelectUser(userId) {
    navigate(`/profile/${userId}`);
    setSearchTerm("");
    setShowResults(false);
    setError("");
  }

  function handleInputFocus() {
    if (results.length > 0 || error) {
      setShowResults(true);
    }
  }

  function handleInputBlur(e) {
    // Ne pas fermer si on clique sur les résultats
    if (resultsRef.current && resultsRef.current.contains(e.relatedTarget)) {
      return;
    }
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Empêche le submit de formulaire

      // Si on a des résultats, sélectionner le premier
      if (results.length > 0) {
        handleSelectUser(results[0].id);
      } else if (searchTerm.trim().length >= 2 && !loading) {
        // Si pas de résultats mais recherche valide, forcer la recherche
        searchUsers();
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
      inputRef.current?.blur();
    }
  }

  function handleSearchClick() {
    if (results.length > 0) {
      handleSelectUser(results[0].id);
    } else if (searchTerm.trim().length >= 2 && !loading) {
      searchUsers();
    }
  }

  return (
    <div
      className="user-search"
      style={{ position: "relative", display: "flex", gap: "8px" }}
    >
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: "8px 12px",
          backgroundColor: "#1E2328",
          border: "1px solid #3C3C41",
          borderRadius: "4px",
          color: "#F0E6D2",
          fontSize: "14px",
        }}
      />
      {(searchTerm.trim().length >= 2 || results.length > 0) && (
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#0AC8B9",
            border: "none",
            borderRadius: "4px",
            color: "#1E2328",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
          aria-label="Search"
        >
          {loading ? "..." : "Search"}
        </button>
      )}

      {showResults && (
        <div
          ref={resultsRef}
          className="search-results"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#1E2328",
            border: "1px solid #3C3C41",
            borderRadius: "4px",
            marginTop: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
          }}
        >
          {loading && (
            <div
              style={{
                padding: "10px 12px",
                textAlign: "center",
                color: "#A09B8C",
                fontSize: "14px",
              }}
            >
              Searching...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "10px 12px",
                textAlign: "center",
                color: "#ff6b6b",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              {results.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  onMouseDown={(e) => e.preventDefault()} // Empêche le blur avant le click
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #3C3C41",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#0A1428")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = "transparent")
                  }
                >
                  <div style={{ fontWeight: "bold", color: "#F0E6D2" }}>
                    {user.username}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#A09B8C",
                      marginTop: "2px",
                    }}
                  >
                    {user.totalScore || 0} total points
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading &&
            !error &&
            searchTerm.trim().length >= 2 &&
            results.length === 0 && (
              <div
                style={{
                  padding: "10px 12px",
                  textAlign: "center",
                  color: "#A09B8C",
                  fontSize: "14px",
                }}
              >
                No users found
              </div>
            )}
        </div>
      )}
    </div>
  );
});

export default UserSearch;
