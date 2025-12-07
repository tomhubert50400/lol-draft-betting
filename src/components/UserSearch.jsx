import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, query, getDocs, where } from "../firebase";
import { logger } from "../utils/logger";

const UserSearch = forwardRef(function UserSearch(
  { placeholder = "Search users..." },
  ref
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }

    searchUsers();
  }, [searchTerm]);

  async function searchUsers() {
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
    } catch (error) {
      logger.error("Error searching users:", error);
    }
  }

  function handleSelectUser(userId) {
    navigate(`/profile/${userId}`);
    setSearchTerm("");
    setShowResults(false);
  }

  return (
    <div className="user-search" style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 12px",
          backgroundColor: "#1E2328",
          border: "1px solid #3C3C41",
          borderRadius: "4px",
          color: "#F0E6D2",
          fontSize: "14px",
        }}
      />

      {showResults && results.length > 0 && (
        <div
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
          }}
        >
          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #3C3C41",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0A1428")}
              onMouseLeave={(e) =>
                (e.target.style.backgroundColor = "transparent")
              }
            >
              <div style={{ fontWeight: "bold", color: "#F0E6D2" }}>
                {user.username}
              </div>
              <div
                style={{ fontSize: "12px", color: "#A09B8C", marginTop: "2px" }}
              >
                {user.totalScore || 0} total points
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default UserSearch;
