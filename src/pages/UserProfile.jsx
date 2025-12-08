import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
} from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { logger } from "../utils/logger";

export default function UserProfile() {
  const { userId } = useParams();
  const { currentUser, isAdmin, updateUserSocials, changePassword } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [events, setEvents] = useState([]);
  const [matches, setMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editSocials, setEditSocials] = useState({
    twitter: "",
    instagram: "",
    discord: "",
  });
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId, currentUser, isAdmin]);

  async function loadUserProfile() {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        alert("User not found");
        navigate("/");
        return;
      }
      setUser({ id: userDoc.id, ...userDoc.data() });

      // Tous les utilisateurs peuvent voir les bets de n'importe qui
      try {
        const betsQuery = query(
          collection(db, "bets"),
          where("userId", "==", userId)
        );
        const betsSnapshot = await getDocs(betsQuery);
        const betsData = betsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        betsData.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setBets(betsData);
      } catch (betsError) {
        logger.error("Error loading bets:", betsError);
        setBets([]);
      }

      const eventsSnapshot = await getDocs(collection(db, "events"));
      const eventsData = {};
      eventsSnapshot.forEach((doc) => {
        eventsData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setEvents(eventsData);

      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const matchesData = {};
      matchesSnapshot.forEach((doc) => {
        matchesData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setMatches(matchesData);
    } catch (error) {
      logger.error("Error loading profile:", error);
      // Ne pas afficher d'alerte pour les erreurs de permissions sur les bets
      if (!error.message.includes("permissions")) {
        alert("Error loading profile: " + error.message);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user && user.socials) {
      setEditSocials({
        twitter: user.socials.twitter || "",
        instagram: user.socials.instagram || "",
        discord: user.socials.discord || "",
      });
    }
  }, [user]);

  async function handleSaveSocials() {
    setError("");
    setSaving(true);
    try {
      await updateUserSocials(editSocials);
      await loadUserProfile();
      setIsEditing(false);
      alert("Socials updated successfully!");
    } catch (err) {
      setError("Failed to update socials: " + err.message);
    }
    setSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");

    if (passwordData.new !== passwordData.confirm) {
      setError("New passwords don't match");
      return;
    }

    if (passwordData.new.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwordData.current, passwordData.new);
      setPasswordData({ current: "", new: "", confirm: "" });
      alert("Password changed successfully!");
    } catch (err) {
      setError("Failed to change password: " + err.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="user-profile">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile">
        <h2>User not found</h2>
      </div>
    );
  }

  const eventScores = user.eventScores || {};
  const visibleEventScores = Object.entries(eventScores).filter(
    ([eventId]) => !!events[eventId]
  );
  const totalBets = bets.length;
  const scoredBets = bets.filter(
    (b) => b.score !== null && b.score !== undefined
  );
  const totalPoints = scoredBets.reduce((sum, b) => sum + (b.score || 0), 0);
  const avgScore =
    scoredBets.length > 0 ? (totalPoints / scoredBets.length).toFixed(1) : 0;
  const socials = user.socials || {};

  const calculateAdvancedStats = () => {
    const roleStats = {
      Top: { correct: 0, total: 0 },
      Jungle: { correct: 0, total: 0 },
      Mid: { correct: 0, total: 0 },
      Bot: { correct: 0, total: 0 },
      Support: { correct: 0, total: 0 },
    };

    const championStats = {};
    const perfectScores = bets.filter((b) => b.isPerfectScore === true).length;
    const winRate =
      scoredBets.length > 0
        ? (
            (scoredBets.filter((b) => (b.score || 0) >= 5).length /
              scoredBets.length) *
            100
          ).toFixed(1)
        : 0;

    scoredBets.forEach((bet) => {
      const match = matches[bet.matchId];
      if (!match || !match.resultDraft) return;

      const roles = ["Top", "Jungle", "Mid", "Bot", "Support"];

      roles.forEach((role) => {
        roleStats[role].total += 1;
        if (
          bet.predictions?.team1?.[role] === match.resultDraft.team1?.[role]
        ) {
          roleStats[role].correct += 1;
          const champ = bet.predictions.team1[role];
          if (champ) {
            if (!championStats[champ]) {
              championStats[champ] = { correct: 0, total: 0 };
            }
            championStats[champ].total += 1;
            championStats[champ].correct += 1;
          }
        } else {
          const champ = bet.predictions?.team1?.[role];
          if (champ) {
            if (!championStats[champ]) {
              championStats[champ] = { correct: 0, total: 0 };
            }
            championStats[champ].total += 1;
          }
        }
      });

      roles.forEach((role) => {
        roleStats[role].total += 1;
        if (
          bet.predictions?.team2?.[role] === match.resultDraft.team2?.[role]
        ) {
          roleStats[role].correct += 1;
          const champ = bet.predictions.team2[role];
          if (champ) {
            if (!championStats[champ]) {
              championStats[champ] = { correct: 0, total: 0 };
            }
            championStats[champ].total += 1;
            championStats[champ].correct += 1;
          }
        } else {
          const champ = bet.predictions?.team2?.[role];
          if (champ) {
            if (!championStats[champ]) {
              championStats[champ] = { correct: 0, total: 0 };
            }
            championStats[champ].total += 1;
          }
        }
      });
    });

    const roleAccuracy = {};
    Object.keys(roleStats).forEach((role) => {
      const stats = roleStats[role];
      roleAccuracy[role] =
        stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0;
    });

    const topChampions = Object.entries(championStats)
      .map(([champ, stats]) => ({
        name: champ,
        accuracy:
          stats.total > 0
            ? ((stats.correct / stats.total) * 100).toFixed(1)
            : 0,
        total: stats.total,
        correct: stats.correct,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      roleAccuracy,
      topChampions,
      perfectScores,
      winRate,
    };
  };

  const advancedStats = calculateAdvancedStats();

  function getTwitterUrl(username) {
    if (!username) return null;
    const cleanUsername = username.replace(/^@/, "").trim();
    if (!cleanUsername) return null;
    return `https://x.com/${cleanUsername}`;
  }

  function getInstagramUrl(username) {
    if (!username) return null;
    const cleanUsername = username.replace(/^@/, "").trim();
    if (!cleanUsername) return null;
    return `https://www.instagram.com/${cleanUsername}`;
  }

  function handleSocialClick(e, webUrl, platform) {
    e.preventDefault();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      let deepLink = null;
      if (platform === "twitter") {
        const username = webUrl.split("/").pop();
        deepLink = `twitter://user?screen_name=${username}`;
      } else if (platform === "instagram") {
        const username = webUrl.split("/").pop();
        deepLink = `instagram://user?username=${username}`;
      }

      if (deepLink) {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = deepLink;
        document.body.appendChild(iframe);

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);

        setTimeout(() => {
          window.open(webUrl, "_blank", "noopener,noreferrer");
        }, 800);
      } else {
        window.open(webUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  }

  const twitterWebUrl = socials.twitter ? getTwitterUrl(socials.twitter) : null;
  const instagramWebUrl = socials.instagram
    ? getInstagramUrl(socials.instagram)
    : null;

  return (
    <div className="user-profile">
      <div className="profile-header card" style={{ position: "relative" }}>
        {currentUser && currentUser.uid === user.id && (
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}
            className="profile-edit-button"
            aria-label={isEditing ? "Save changes" : "Edit profile"}
            style={{
              position: "absolute",
              top: "var(--spacing-md)",
              right: "var(--spacing-md)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "all var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-secondary)";
            }}
          >
            {isEditing && (
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                Save changes
              </span>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d="M 9.6660156 2 L 9.1757812 4.5234375 C 8.3516137 4.8342536 7.5947862 5.2699307 6.9316406 5.8144531 L 4.5078125 4.9785156 L 2.171875 9.0214844 L 4.1132812 10.708984 C 4.0386488 11.16721 4 11.591845 4 12 C 4 12.408768 4.0398071 12.832626 4.1132812 13.291016 L 4.1132812 13.292969 L 2.171875 14.980469 L 4.5078125 19.021484 L 6.9296875 18.1875 C 7.5928951 18.732319 8.3514346 19.165567 9.1757812 19.476562 L 9.6660156 22 L 14.333984 22 L 14.824219 19.476562 C 15.648925 19.165543 16.404903 18.73057 17.068359 18.185547 L 19.492188 19.021484 L 21.826172 14.980469 L 19.886719 13.291016 C 19.961351 12.83279 20 12.408155 20 12 C 20 11.592457 19.96113 11.168374 19.886719 10.710938 L 19.886719 10.708984 L 21.828125 9.0195312 L 19.492188 4.9785156 L 17.070312 5.8125 C 16.407106 5.2676813 15.648565 4.8344327 14.824219 4.5234375 L 14.333984 2 L 9.6660156 2 z M 11.314453 4 L 12.685547 4 L 13.074219 6 L 14.117188 6.3945312 C 14.745852 6.63147 15.310672 6.9567546 15.800781 7.359375 L 16.664062 8.0664062 L 18.585938 7.40625 L 19.271484 8.5917969 L 17.736328 9.9277344 L 17.912109 11.027344 L 17.912109 11.029297 C 17.973258 11.404235 18 11.718768 18 12 C 18 12.281232 17.973259 12.595718 17.912109 12.970703 L 17.734375 14.070312 L 19.269531 15.40625 L 18.583984 16.59375 L 16.664062 15.931641 L 15.798828 16.640625 C 15.308719 17.043245 14.745852 17.36853 14.117188 17.605469 L 14.115234 17.605469 L 13.072266 18 L 12.683594 20 L 11.314453 20 L 10.925781 18 L 9.8828125 17.605469 C 9.2541467 17.36853 8.6893282 17.043245 8.1992188 16.640625 L 7.3359375 15.933594 L 5.4140625 16.59375 L 4.7285156 15.408203 L 6.265625 14.070312 L 6.0878906 12.974609 L 6.0878906 12.972656 C 6.0276183 12.596088 6 12.280673 6 12 C 6 11.718768 6.026742 11.404282 6.0878906 11.029297 L 6.265625 9.9296875 L 4.7285156 8.59375 L 5.4140625 7.40625 L 7.3359375 8.0683594 L 8.1992188 7.359375 C 8.6893282 6.9567546 9.2541467 6.6314701 9.8828125 6.3945312 L 10.925781 6 L 11.314453 4 z M 12 8 C 9.8034768 8 8 9.8034768 8 12 C 8 14.196523 9.8034768 16 12 16 C 14.196523 16 16 14.196523 16 12 C 16 9.8034768 14.196523 8 12 8 z M 12 10 C 13.111477 10 14 10.888523 14 12 C 14 13.111477 13.111477 14 12 14 C 10.888523 14 10 13.111477 10 12 C 10 10.888523 10.888523 10 12 10 z"></path>
            </svg>
          </button>
        )}
        <div>
          <h2>{user.username}</h2>
          {currentUser && currentUser.uid === user.id && (
            <div className="user-info">
              <p className="user-email">{user.email}</p>
            </div>
          )}
        </div>
        <div className="total-score">
          <span className="score-label">Total Points</span>
          <span className="score-value">{user.totalScore || 0}</span>
        </div>
      </div>

      {currentUser && currentUser.uid === user.id && isEditing && (
        <div className="edit-profile card">
          <h3>Edit Profile</h3>
          {error && (
            <div className="alert error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <div className="form-section" style={{ marginBottom: "2rem" }}>
            <h4>Socials</h4>
            <div className="form-group">
              <label>Twitter</label>
              <input
                type="text"
                value={editSocials.twitter}
                onChange={(e) =>
                  setEditSocials({ ...editSocials, twitter: e.target.value })
                }
                placeholder="tomhrt1 (sans @)"
              />
              <small
                style={{
                  display: "block",
                  marginTop: "4px",
                  opacity: 0.7,
                  fontSize: "0.85rem",
                }}
              >
                Just enter your username (e.g., tomhrt1)
              </small>
            </div>
            <div className="form-group">
              <label>Instagram</label>
              <input
                type="text"
                value={editSocials.instagram}
                onChange={(e) =>
                  setEditSocials({ ...editSocials, instagram: e.target.value })
                }
                placeholder="tomhrt1"
              />
              <small
                style={{
                  display: "block",
                  marginTop: "4px",
                  opacity: 0.7,
                  fontSize: "0.85rem",
                }}
              >
                Just enter your username (e.g., tomhrt1)
              </small>
            </div>
            <div className="form-group">
              <label>Discord</label>
              <input
                type="text"
                value={editSocials.discord}
                onChange={(e) =>
                  setEditSocials({ ...editSocials, discord: e.target.value })
                }
                placeholder="Username#1234"
              />
            </div>
            <button
              onClick={handleSaveSocials}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save Socials"}
            </button>
          </div>

          <div className="form-section">
            <h4>Change Password</h4>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      current: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirm: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {(socials.twitter || socials.instagram || socials.discord) && (
        <div className="profile-stats card">
          <h3>Socials</h3>
          <div className="stats-grid">
            {socials.twitter && twitterWebUrl && (
              <div
                className="stat-item"
                onClick={(e) => handleSocialClick(e, twitterWebUrl, "twitter")}
                style={{ cursor: "pointer" }}
              >
                <span className="stat-label">Twitter</span>
                <span
                  className="stat-value"
                  style={{
                    color: "var(--accent-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {socials.twitter.replace(/^@/, "")}
                </span>
              </div>
            )}
            {socials.instagram && instagramWebUrl && (
              <div
                className="stat-item"
                onClick={(e) =>
                  handleSocialClick(e, instagramWebUrl, "instagram")
                }
                style={{ cursor: "pointer" }}
              >
                <span className="stat-label">Instagram</span>
                <span
                  className="stat-value"
                  style={{
                    color: "var(--accent-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.98-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  {socials.instagram.replace(/^@/, "")}
                </span>
              </div>
            )}
            {socials.discord && (
              <div className="stat-item">
                <span className="stat-label">Discord</span>
                <span
                  className="stat-value"
                  style={{
                    color: "var(--accent-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  {socials.discord}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {user.badges && user.badges.length > 0 && (
        <div className="badges-section card">
          <h3>Achievements</h3>
          <div
            className="badges-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {user.badges.map((badge) => (
              <div
                key={badge.id}
                className="badge-item"
                title={badge.description}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "1rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-primary)",
                  transition: "all var(--transition-base)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-primary)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  className="badge-icon"
                  style={{
                    fontSize: "2.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {badge.icon}
                </div>
                <span
                  className="badge-name"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    textAlign: "center",
                  }}
                >
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Card with Tabs */}
      <div className="card">
        {/* Tabs Navigation */}
        <div
          className="profile-tabs"
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-primary)",
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            className={
              activeTab === "overview" ? "btn-primary" : "btn-secondary"
            }
            style={{
              borderBottom:
                activeTab === "overview"
                  ? "2px solid var(--accent-primary)"
                  : "none",
              borderRadius: "0",
              borderBottomLeftRadius: "var(--radius-sm)",
              borderBottomRightRadius: "var(--radius-sm)",
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={activeTab === "stats" ? "btn-primary" : "btn-secondary"}
            style={{
              borderBottom:
                activeTab === "stats"
                  ? "2px solid var(--accent-primary)"
                  : "none",
              borderRadius: "0",
              borderBottomLeftRadius: "var(--radius-sm)",
              borderBottomRightRadius: "var(--radius-sm)",
            }}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab("bets")}
            className={activeTab === "bets" ? "btn-primary" : "btn-secondary"}
            style={{
              borderBottom:
                activeTab === "bets"
                  ? "2px solid var(--accent-primary)"
                  : "none",
              borderRadius: "0",
              borderBottomLeftRadius: "var(--radius-sm)",
              borderBottomRightRadius: "var(--radius-sm)",
            }}
          >
            All Bets
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            <div className="profile-stats">
              <h3>Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Bets</span>
                  <span className="stat-value">{totalBets}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Scored Bets</span>
                  <span className="stat-value">{scoredBets.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Score</span>
                  <span className="stat-value">{avgScore}</span>
                </div>
              </div>
            </div>

            {visibleEventScores.length > 0 && (
              <div className="event-scores" style={{ marginTop: "1.5rem" }}>
                <h3>Event Scores</h3>
                <div className="events-list">
                  {visibleEventScores.map(([eventId, score]) => (
                    <div key={eventId} className="event-score-item">
                      <span className="event-name">
                        {events[eventId]?.name || "Unknown Event"}
                      </span>
                      <span className="event-score">{score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="recent-bets" style={{ marginTop: "1.5rem" }}>
              <h3>Recent Bets</h3>
              {bets.length === 0 ? (
                <p>No bets placed yet</p>
              ) : (
                <div className="bets-list">
                  {bets.slice(0, 10).map((bet) => {
                    const match = matches[bet.matchId];
                    if (!match) return null;

                    return (
                      <div key={bet.id} className="bet-item">
                        <div className="bet-match">
                          <strong>
                            {match.team1} vs {match.team2}
                          </strong>
                          <span className={`status-badge ${match.status}`}>
                            {match.status}
                          </span>
                        </div>
                        <div className="bet-score">
                          {bet.score !== null && bet.score !== undefined ? (
                            <span className="score-earned">
                              {bet.score} pts
                            </span>
                          ) : (
                            <span className="score-pending">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div className="advanced-stats">
            <h3>Advanced Statistics</h3>

            {/* Key Metrics */}
            <div
              className="stats-overview"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <div
                className="stat-card"
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Win Rate
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                  }}
                >
                  {advancedStats.winRate}%
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {scoredBets.filter((b) => (b.score || 0) >= 5).length} /{" "}
                  {scoredBets.length} bets
                </div>
              </div>

              <div
                className="stat-card"
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Perfect Scores
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--accent-gold)",
                  }}
                >
                  {advancedStats.perfectScores}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  10/10 points
                </div>
              </div>

              <div
                className="stat-card"
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-primary)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Average Score
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    color: "var(--accent-primary)",
                  }}
                >
                  {avgScore}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  per bet
                </div>
              </div>
            </div>

            {/* Accuracy by Role */}
            <div
              className="role-stats-section"
              style={{ marginBottom: "2rem" }}
            >
              <h3 style={{ marginBottom: "1rem" }}>Accuracy by Role</h3>
              <div
                className="role-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "1rem",
                }}
              >
                {Object.entries(advancedStats.roleAccuracy).map(
                  ([role, accuracy]) => (
                    <div
                      key={role}
                      style={{
                        padding: "1rem",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {role}
                      </div>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 600,
                          color: "var(--accent-primary)",
                        }}
                      >
                        {accuracy}%
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Top Predicted Champions */}
            {advancedStats.topChampions.length > 0 && (
              <div className="champion-stats-section">
                <h4 style={{ marginBottom: "1rem" }}>
                  Most Predicted Champions
                </h4>
                <div
                  className="champions-list"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {advancedStats.topChampions.map((champ) => (
                    <div
                      key={champ.name}
                      style={{
                        padding: "1rem",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {champ.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Accuracy:{" "}
                        <span
                          style={{
                            color: "var(--accent-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {champ.accuracy}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {champ.correct} / {champ.total} correct
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Bets Tab */}
        {activeTab === "bets" && (
          <div className="all-bets">
            <h3>All Bets</h3>
            {bets.length === 0 ? (
              <p>No bets placed yet</p>
            ) : (
              <div className="bets-list">
                {bets.map((bet) => {
                  const match = matches[bet.matchId];
                  if (!match) return null;

                  return (
                    <div key={bet.id} className="bet-item">
                      <div className="bet-match">
                        <strong>
                          {match.team1} vs {match.team2}
                        </strong>
                        <span className={`status-badge ${match.status}`}>
                          {match.status}
                        </span>
                      </div>
                      <div className="bet-score">
                        {bet.score !== null && bet.score !== undefined ? (
                          <span className="score-earned">
                            {bet.score} pts
                            {bet.isPerfectScore && (
                              <span
                                style={{
                                  marginLeft: "0.5rem",
                                  color: "var(--accent-gold)",
                                }}
                              >
                                ⭐ Perfect!
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="score-pending">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
