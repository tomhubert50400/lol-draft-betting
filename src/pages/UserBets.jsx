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
} from "../firebase";
import { logger } from "../utils/logger";

export default function UserBets() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bets, setBets] = useState([]);
  const [events, setEvents] = useState({});
  const [matches, setMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [expandedBetId, setExpandedBetId] = useState(null);

  useEffect(() => {
    if (userId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      // Charger les infos utilisateur
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        alert("User not found");
        navigate("/");
        return;
      }
      setUser({ id: userDoc.id, ...userDoc.data() });

      // Charger les bets
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

      // Charger les événements
      const eventsSnapshot = await getDocs(collection(db, "events"));
      const eventsData = {};
      eventsSnapshot.forEach((doc) => {
        eventsData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setEvents(eventsData);

      // Charger les matches
      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const matchesData = {};
      matchesSnapshot.forEach((doc) => {
        matchesData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setMatches(matchesData);
    } catch (error) {
      logger.error("Error loading data:", error);
      alert("Error loading data: " + error.message);
    }
    setLoading(false);
  }

  // Convertir events en tableau trié
  const eventsList = Object.values(events).sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // Plus récent en premier
  });

  // Filtrer les bets par événement sélectionné
  const eventBets = selectedEventId
    ? bets.filter((bet) => bet.eventId === selectedEventId)
    : [];

  // Calculer les stats par événement
  const getEventStats = (eventId) => {
    const eventBetsList = bets.filter((bet) => bet.eventId === eventId);
    const totalBets = eventBetsList.length;
    const scoredBets = eventBetsList.filter(
      (b) => b.score !== null && b.score !== undefined
    );
    const totalPoints = scoredBets.reduce((sum, b) => sum + (b.score || 0), 0);
    const avgScore =
      scoredBets.length > 0 ? (totalPoints / scoredBets.length).toFixed(1) : 0;
    const perfectScores = eventBetsList.filter(
      (b) => b.isPerfectScore === true
    ).length;

    return {
      totalBets,
      scoredBets: scoredBets.length,
      avgScore,
      perfectScores,
      totalPoints,
    };
  };

  if (loading) {
    return (
      <div className="user-bets" style={{ padding: "0.2rem" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-bets" style={{ padding: "0.2rem" }}>
        <h2>User not found</h2>
      </div>
    );
  }

  return (
    <div className="user-bets" style={{ padding: "0.2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: "2rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center" }}>
            {user.username}'s Bets
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Total: {bets.length} bets
          </p>
        </div>
        <button
          onClick={() => navigate(`/profile/${userId}`)}
          className="btn-secondary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            alignSelf: "flex-start",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>
      </div>

      {selectedEventId ? (
        // Vue des bets d'un événement sélectionné
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <div>
              <h2>
                {events[selectedEventId]?.name || `Event ${selectedEventId}`}
              </h2>
              <p
                style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}
              >
                {eventBets.length} bets
              </p>
            </div>
            <button
              onClick={() => setSelectedEventId(null)}
              className="btn-secondary"
            >
              ← Back to Events
            </button>
          </div>

          {eventBets.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
              No bets found for this event
            </p>
          ) : (
            <div className="bets-list">
              {eventBets.map((bet) => {
                const match = matches[bet.matchId];
                if (!match) return null;

                const isExpanded = expandedBetId === bet.id;
                const predictions = bet.predictions || { team1: {}, team2: {} };
                const roles = ["Top", "Jungle", "Mid", "Bot", "Support"];

                return (
                  <div
                    key={bet.id}
                    className="bet-item"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-primary)",
                    }}
                    onClick={() => setExpandedBetId(isExpanded ? null : bet.id)}
                  >
                    <div
                      className="bet-header-mobile"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: isExpanded ? "1rem" : "0",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <strong style={{ fontSize: "1.1rem" }}>
                            {match.team1} vs {match.team2}
                            {match.bestOf && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: "normal",
                                  color: "var(--text-secondary)",
                                  marginLeft: "0.5rem",
                                }}
                              >
                                ({match.bestOf.toUpperCase()})
                              </span>
                            )}
                          </strong>
                          <span
                            className={`status-badge ${match.status}`}
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "0.875rem",
                            }}
                          >
                            {match.status}
                          </span>
                        </div>
                        {bet.createdAt && (
                          <div
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {new Date(
                              bet.createdAt.seconds * 1000
                            ).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          flexShrink: 0,
                        }}
                      >
                        {bet.score !== null && bet.score !== undefined ? (
                          <div>
                            <span
                              className="score-earned"
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "var(--accent-primary)",
                              }}
                            >
                              {bet.score} pts
                            </span>
                            {bet.isPerfectScore && (
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  color: "var(--accent-gold)",
                                  fontSize: "0.875rem",
                                }}
                              >
                                ⭐ Perfect!
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            className="score-pending"
                            style={{
                              fontSize: "1rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Pending
                          </span>
                        )}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent-primary)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.3s",
                            flexShrink: 0,
                          }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        className="bet-expanded-content"
                        style={{
                          marginTop: "1.5rem",
                          paddingTop: "1.5rem",
                          borderTop: "1px solid var(--border-primary)",
                        }}
                      >
                        <div className="bets-predictions-grid">
                          {/* Team 1 Predictions */}
                          <div>
                            <h4
                              className="bet-team-name-mobile"
                              style={{
                                marginBottom: "1rem",
                                color: "var(--text-primary)",
                                fontSize: "1rem",
                                fontWeight: 600,
                              }}
                            >
                              {match.team1} - Predictions
                            </h4>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                              }}
                            >
                              {roles.map((role) => (
                                <div
                                  key={role}
                                  className="bet-role-item-mobile"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "0.5rem",
                                    backgroundColor: "var(--bg-primary)",
                                    borderRadius: "var(--radius-sm)",
                                  }}
                                >
                                  <span
                                    className="bet-role-label-mobile"
                                    style={{
                                      minWidth: "80px",
                                      fontSize: "0.875rem",
                                      color: "var(--text-secondary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {role}:
                                  </span>
                                  <span
                                    className="bet-role-value-mobile"
                                    style={{
                                      fontSize: "1rem",
                                      color: "var(--text-primary)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {predictions.team1?.[role] || "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Team 2 Predictions */}
                          <div>
                            <h4
                              className="bet-team-name-mobile"
                              style={{
                                marginBottom: "1rem",
                                color: "var(--text-primary)",
                                fontSize: "1rem",
                                fontWeight: 600,
                              }}
                            >
                              {match.team2} - Predictions
                            </h4>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.75rem",
                              }}
                            >
                              {roles.map((role) => (
                                <div
                                  key={role}
                                  className="bet-role-item-mobile"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "0.5rem",
                                    backgroundColor: "var(--bg-primary)",
                                    borderRadius: "var(--radius-sm)",
                                  }}
                                >
                                  <span
                                    className="bet-role-label-mobile"
                                    style={{
                                      minWidth: "80px",
                                      fontSize: "0.875rem",
                                      color: "var(--text-secondary)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {role}:
                                  </span>
                                  <span
                                    className="bet-role-value-mobile"
                                    style={{
                                      fontSize: "1rem",
                                      color: "var(--text-primary)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {predictions.team2?.[role] || "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Show result draft if match is completed */}
                        {match.status === "completed" && match.resultDraft && (
                          <div
                            style={{
                              marginTop: "2rem",
                              paddingTop: "1.5rem",
                              borderTop: "1px solid var(--border-primary)",
                            }}
                          >
                            <h4
                              style={{
                                marginBottom: "1rem",
                                color: "var(--accent-primary)",
                                fontSize: "1rem",
                                fontWeight: 600,
                              }}
                            >
                              Actual Result
                            </h4>
                            <div className="bets-predictions-grid">
                              {/* Team 1 Result */}
                              <div>
                                <h5
                                  className="bet-team-name-mobile"
                                  style={{
                                    marginBottom: "0.75rem",
                                    color: "var(--text-primary)",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {match.team1}
                                </h5>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                  }}
                                >
                                  {roles.map((role) => {
                                    const predicted = predictions.team1?.[role];
                                    const actual =
                                      match.resultDraft.team1?.[role];
                                    const isCorrect = predicted === actual;

                                    return (
                                      <div
                                        key={role}
                                        className="bet-role-item-mobile"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "1rem",
                                          padding: "0.5rem",
                                          backgroundColor: isCorrect
                                            ? "rgba(10, 200, 185, 0.1)"
                                            : "var(--bg-primary)",
                                          borderRadius: "var(--radius-sm)",
                                          border: isCorrect
                                            ? "1px solid var(--accent-primary)"
                                            : "1px solid transparent",
                                          position: "relative",
                                        }}
                                      >
                                        <span
                                          className="bet-role-label-mobile"
                                          style={{
                                            minWidth: "80px",
                                            fontSize: "0.875rem",
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          {role}:
                                        </span>
                                        <span
                                          className="bet-role-value-mobile"
                                          style={{
                                            fontSize: "1rem",
                                            color: isCorrect
                                              ? "var(--accent-primary)"
                                              : "var(--text-primary)",
                                            fontWeight: 600,
                                            flex: 1,
                                          }}
                                        >
                                          {actual || "—"}
                                        </span>
                                        {isCorrect && (
                                          <span
                                            style={{
                                              color: "var(--accent-primary)",
                                              fontSize: "1.25rem",
                                              flexShrink: 0,
                                              marginLeft: "auto",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              lineHeight: 1,
                                            }}
                                          >
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Team 2 Result */}
                              <div>
                                <h5
                                  className="bet-team-name-mobile"
                                  style={{
                                    marginBottom: "0.75rem",
                                    color: "var(--text-primary)",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {match.team2}
                                </h5>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                  }}
                                >
                                  {roles.map((role) => {
                                    const predicted = predictions.team2?.[role];
                                    const actual =
                                      match.resultDraft.team2?.[role];
                                    const isCorrect = predicted === actual;

                                    return (
                                      <div
                                        key={role}
                                        className="bet-role-item-mobile"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "1rem",
                                          padding: "0.5rem",
                                          backgroundColor: isCorrect
                                            ? "rgba(10, 200, 185, 0.1)"
                                            : "var(--bg-primary)",
                                          borderRadius: "var(--radius-sm)",
                                          border: isCorrect
                                            ? "1px solid var(--accent-primary)"
                                            : "1px solid transparent",
                                          position: "relative",
                                        }}
                                      >
                                        <span
                                          className="bet-role-label-mobile"
                                          style={{
                                            minWidth: "80px",
                                            fontSize: "0.875rem",
                                            color: "var(--text-secondary)",
                                          }}
                                        >
                                          {role}:
                                        </span>
                                        <span
                                          className="bet-role-value-mobile"
                                          style={{
                                            fontSize: "1rem",
                                            color: isCorrect
                                              ? "var(--accent-primary)"
                                              : "var(--text-primary)",
                                            fontWeight: 600,
                                            flex: 1,
                                          }}
                                        >
                                          {actual || "—"}
                                        </span>
                                        {isCorrect && (
                                          <span
                                            style={{
                                              color: "var(--accent-primary)",
                                              fontSize: "1.25rem",
                                              flexShrink: 0,
                                              marginLeft: "auto",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              lineHeight: 1,
                                            }}
                                          >
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Liste simple des événements (affichée par défaut)
        <div>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ marginBottom: "0.5rem" }}>Select an Event</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Choose an event below to view all bets for that event
            </p>
          </div>
          {eventsList.length === 0 ? (
            <div className="card">
              <p
                style={{ textAlign: "center", color: "var(--text-secondary)" }}
              >
                No events found
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {eventsList.map((event, index) => {
                const eventBetsCount = bets.filter(
                  (bet) => bet.eventId === event.id
                ).length;

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    style={{
                      padding: "1.25rem 1.5rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderBottom:
                        index < eventsList.length - 1
                          ? "1px solid var(--border-primary)"
                          : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.1rem",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          {event.name || `Event ${event.id}`}
                        </h3>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--accent-primary)",
                            fontWeight: 600,
                            padding: "2px 8px",
                            backgroundColor: "rgba(10, 200, 185, 0.1)",
                            borderRadius: "12px",
                          }}
                        >
                          {eventBetsCount}{" "}
                          {eventBetsCount === 1 ? "bet" : "bets"}
                        </span>
                      </div>
                      {event.createdAt && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.875rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {new Date(
                            event.createdAt.seconds * 1000
                          ).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginLeft: "1rem" }}
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
