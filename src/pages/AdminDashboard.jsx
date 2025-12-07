import React, { useState, useEffect } from "react";
import {
  db,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  writeBatch,
  onSnapshot,
  serverTimestamp,
} from "../firebase";
import DraftSelector from "../components/DraftSelector";
import { logger } from "../utils/logger";

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [showClosedEvents, setShowClosedEvents] = useState(false);

  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [bestOf, setBestOf] = useState("bo1");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvingMatch, setResolvingMatch] = useState(null);
  const [resultDraft, setResultDraft] = useState({ team1: {}, team2: {} });
  const [excludedChampionsFromSeries, setExcludedChampionsFromSeries] = useState([]);

  useEffect(() => {
    async function getExcludedChampionsFromSeries() {
      if (!resolvingMatch || !resolvingMatch.seriesId || !resolvingMatch.gameNumber) {
        setExcludedChampionsFromSeries([]);
        return;
      }

      try {
        const seriesMatchesQuery = query(
          collection(db, "matches"),
          where("seriesId", "==", resolvingMatch.seriesId),
          where("status", "==", "completed")
        );
        const seriesMatchesSnapshot = await getDocs(seriesMatchesQuery);
        
        const excludedChampions = [];
        seriesMatchesSnapshot.forEach((doc) => {
          const matchData = doc.data();
          if (matchData.gameNumber && matchData.gameNumber < resolvingMatch.gameNumber) {
            const resultDraft = matchData.resultDraft;
            if (resultDraft) {
              if (resultDraft.team1) {
                Object.values(resultDraft.team1).forEach(champ => {
                  if (champ) excludedChampions.push(champ);
                });
              }
              if (resultDraft.team2) {
                Object.values(resultDraft.team2).forEach(champ => {
                  if (champ) excludedChampions.push(champ);
                });
              }
            }
          }
        });
        
        setExcludedChampionsFromSeries([...new Set(excludedChampions)]);
      } catch (error) {
        logger.error("Error fetching excluded champions from series:", error);
        setExcludedChampionsFromSeries([]);
      }
    }

    getExcludedChampionsFromSeries();
  }, [resolvingMatch]);

  useEffect(() => {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsData);

      if (!selectedEventId && eventsData.length > 0) {
        const activeEvent = eventsData.find((e) => e.status === "active");
        if (activeEvent) {
          setSelectedEventId(activeEvent.id);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMatches(matchesData);
    });
    return unsubscribe;
  }, []);

  async function createEvent(e) {
    e.preventDefault();
    if (!eventName.trim()) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "events"), {
        name: eventName,
        description: eventDescription,
        status: "active",
        createdAt: serverTimestamp(),
      });

      setEventName("");
      setEventDescription("");
      setSelectedEventId(docRef.id);
      alert("Event created successfully!");
    } catch (error) {
      logger.error("Error creating event:", error);
      alert("Error creating event: " + error.message);
    }
    setLoading(false);
  }

  async function createMatch(e) {
    e.preventDefault();

    if (!selectedEventId) {
      alert("Please select an event first!");
      return;
    }

    const currentTeam1 = team1;
    const currentTeam2 = team2;
    const currentBestOf = bestOf;
    const currentEventId = selectedEventId;

    const seriesId = `series-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tempId = "temp-" + Date.now();
    const newMatch = {
      id: tempId,
      eventId: currentEventId,
      team1: currentTeam1,
      team2: currentTeam2,
      bestOf: currentBestOf,
      gameNumber: 1,
      seriesId: seriesId,
      status: "open",
      createdAt: { seconds: Date.now() / 1000 },
      resultDraft: null,
    };

    setMatches((prev) => [newMatch, ...prev]);
    setTeam1("");
    setTeam2("");
    setBestOf("bo1");

    try {
      await addDoc(collection(db, "matches"), {
        eventId: currentEventId,
        team1: currentTeam1,
        team2: currentTeam2,
        bestOf: currentBestOf,
        gameNumber: 1,
        seriesId: seriesId,
        status: "open",
        createdAt: serverTimestamp(),
        resultDraft: null,
      });

      logger.log("Match created successfully in Firestore");
    } catch (error) {
      logger.error("Error creating match: ", error);
      alert("Error creating match: " + error.message);
      setMatches((prev) => prev.filter((m) => m.id !== tempId));
      setTeam1(currentTeam1);
      setTeam2(currentTeam2);
    }
  }

  async function updateMatchStatus(matchId, newStatus) {
    const previousMatches = [...matches];
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: newStatus } : m))
    );

    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, { status: newStatus });
    } catch (error) {
      logger.error("Error updating match: ", error);
      setMatches(previousMatches);
      alert("Failed to update status");
    }
  }

  function handleResultSelect(team, role, champion) {
    setResultDraft((prev) => ({
      ...prev,
      [team]: {
        ...prev[team],
        [role]: champion,
      },
    }));
  }

  async function resolveMatch() {
    if (!resolvingMatch) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);

      const matchRef = doc(db, "matches", resolvingMatch.id);
      batch.update(matchRef, {
        status: "completed",
        resultDraft: resultDraft,
      });

      const betsQuery = query(
        collection(db, "bets"),
        where("matchId", "==", resolvingMatch.id)
      );
      const betsSnapshot = await getDocs(betsQuery);

      const userEventScores = {};

      betsSnapshot.forEach((betDoc) => {
        const betData = betDoc.data();
        let score = 0;
        let perfectScore = true;

        Object.keys(resultDraft.team1).forEach((role) => {
          if (betData.predictions.team1[role] === resultDraft.team1[role]) {
            score += 1;
          } else {
            perfectScore = false;
          }
        });

        Object.keys(resultDraft.team2).forEach((role) => {
          if (betData.predictions.team2[role] === resultDraft.team2[role]) {
            score += 1;
          } else {
            perfectScore = false;
          }
        });

        if (perfectScore && score === 10) {
          score = 12;
        }

        const betRef = doc(db, "bets", betDoc.id);
        batch.update(betRef, { 
          score: score,
          isPerfectScore: perfectScore && score === 12
        });

        if (!userEventScores[betData.userId]) {
          userEventScores[betData.userId] = 0;
        }
        userEventScores[betData.userId] += score;
      });

      await batch.commit();

      for (const [userId, scoreToAdd] of Object.entries(userEventScores)) {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", userId))
        );

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const eventScores = userData.eventScores || {};
          const eventId = resolvingMatch.eventId;

          eventScores[eventId] = (eventScores[eventId] || 0) + scoreToAdd;
          const newTotalScore = (userData.totalScore || 0) + scoreToAdd;

          const userBetsQuery = query(
            collection(db, "bets"),
            where("userId", "==", userId),
            where("isPerfectScore", "==", true)
          );
          const perfectBetsSnapshot = await getDocs(userBetsQuery);
          const hasPerfectScore = perfectBetsSnapshot.size > 0;

          const allUserBetsQuery = query(
            collection(db, "bets"),
            where("userId", "==", userId)
          );
          const allUserBetsSnapshot = await getDocs(allUserBetsQuery);
          const uniqueMatches = new Set();
          allUserBetsSnapshot.forEach((doc) => {
            const betData = doc.data();
            if (betData.matchId) {
              uniqueMatches.add(betData.matchId);
            }
          });
          const totalBets = uniqueMatches.size;

          const currentBadges = userData.badges || [];
          const newBadges = [...currentBadges];
          
          if (totalBets >= 1 && !newBadges.find(b => b.id === 'first_bet')) {
            newBadges.push({
              id: 'first_bet',
              name: 'First Bet',
              icon: '🎯',
              description: 'Placed your first bet',
              unlockedAt: new Date()
            });
          }

          if (hasPerfectScore && !newBadges.find(b => b.id === 'perfect_score')) {
            newBadges.push({
              id: 'perfect_score',
              name: 'Perfect Score',
              icon: '⭐',
              description: 'Achieved a perfect 10/10 score',
              unlockedAt: new Date()
            });
          }

          if (totalBets >= 10 && !newBadges.find(b => b.id === 'dedicated_bettor')) {
            newBadges.push({
              id: 'dedicated_bettor',
              name: 'Dedicated Bettor',
              icon: '🔥',
              description: 'Placed 10 bets',
              unlockedAt: new Date()
            });
          }

          if (totalBets >= 50 && !newBadges.find(b => b.id === 'veteran')) {
            newBadges.push({
              id: 'veteran',
              name: 'Veteran',
              icon: '🏅',
              description: 'Placed 50 bets',
              unlockedAt: new Date()
            });
          }

          if (newTotalScore >= 1000 && !newBadges.find(b => b.id === 'top_scorer')) {
            newBadges.push({
              id: 'top_scorer',
              name: 'Top Scorer',
              icon: '💎',
              description: 'Reached 1000+ total points',
              unlockedAt: new Date()
            });
          }

          const allUsersSnapshot = await getDocs(collection(db, "users"));
          const allUsers = [];
          allUsersSnapshot.forEach((doc) => {
            const data = doc.data();
            allUsers.push({
              id: doc.id,
              totalScore: data.totalScore || 0
            });
          });
          allUsers.sort((a, b) => b.totalScore - a.totalScore);
          const userRank = allUsers.findIndex(u => u.id === userId) + 1;
          
          if (userRank <= 10 && userRank > 0 && !newBadges.find(b => b.id === 'top_10')) {
            newBadges.push({
              id: 'top_10',
              name: 'Top 10',
              icon: '🏆',
              description: 'Ranked in the top 10 globally',
              unlockedAt: new Date()
            });
          }

          await updateDoc(userRef, {
            totalScore: newTotalScore,
            eventScores: eventScores,
            badges: newBadges,
          });
        }
      }

      const bestOf = resolvingMatch.bestOf || "bo1";
      const currentGameNumber = resolvingMatch.gameNumber || 1;
      const seriesId = resolvingMatch.seriesId;
      
      let maxGames = 1;
      if (bestOf === "bo3") maxGames = 3;
      if (bestOf === "bo5") maxGames = 5;

      if (currentGameNumber < maxGames && seriesId) {
        const nextGameNumber = currentGameNumber + 1;
        
        await addDoc(collection(db, "matches"), {
          eventId: resolvingMatch.eventId,
          team1: resolvingMatch.team1,
          team2: resolvingMatch.team2,
          bestOf: bestOf,
          gameNumber: nextGameNumber,
          seriesId: seriesId,
          status: "open",
          createdAt: serverTimestamp(),
          resultDraft: null,
        });
        
        alert(`Match resolved and scores calculated! Game ${nextGameNumber} has been automatically created.`);
      } else {
        alert("Match resolved and scores calculated!");
      }

      setResolvingMatch(null);
      setResultDraft({ team1: {}, team2: {} });
    } catch (error) {
      logger.error("Error resolving match: ", error);
      alert("Error resolving match");
    }
    setLoading(false);
  }

  async function deleteMatch(matchId) {
    logger.log("Deleting match:", matchId);

    const previousMatches = [...matches];
    setMatches((prev) => prev.filter((m) => m.id !== matchId));

    try {
      const matchRef = doc(db, "matches", matchId);
      const matchDoc = await getDoc(matchRef);
      const matchData = matchDoc.exists() ? matchDoc.data() : null;
      const eventId = matchData?.eventId;

      const betsQuery = query(
        collection(db, "bets"),
        where("matchId", "==", matchId)
      );
      const betsSnapshot = await getDocs(betsQuery);

      const userScoresToSubtract = {};

      betsSnapshot.forEach((betDoc) => {
        const betData = betDoc.data();
        const score = betData.score || 0;
        
        if (score > 0 && betData.userId) {
          if (!userScoresToSubtract[betData.userId]) {
            userScoresToSubtract[betData.userId] = 0;
          }
          userScoresToSubtract[betData.userId] += score;
        }
      });

      for (const [userId, scoreToSubtract] of Object.entries(userScoresToSubtract)) {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentTotalScore = userData.totalScore || 0;
          const newTotalScore = Math.max(0, currentTotalScore - scoreToSubtract);
          
          let eventScores = userData.eventScores || {};
          if (eventId && eventScores[eventId]) {
            const currentEventScore = eventScores[eventId] || 0;
            const newEventScore = Math.max(0, currentEventScore - scoreToSubtract);
            eventScores = {
              ...eventScores,
              [eventId]: newEventScore
            };
          }

          await updateDoc(userRef, {
            totalScore: newTotalScore,
            eventScores: eventScores
          });
        }
      }

      for (const betDoc of betsSnapshot.docs) {
        const betRef = doc(db, "bets", betDoc.id);
        await deleteDoc(betRef);
      }

      await deleteDoc(matchRef);

      logger.log("Match deleted successfully");
      alert("Match and all associated bets deleted. User scores have been adjusted.");
    } catch (error) {
      logger.error("Error deleting match:", error);
      setMatches(previousMatches);
      alert("Failed to delete match: " + error.message);
    }
  }

  async function reopenBetting(matchId) {
    await updateMatchStatus(matchId, "open");
  }

  async function deleteEvent(eventId) {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will delete the event and ALL associated matches and bets. This action cannot be undone. Are you sure?"
    );

    if (!confirmed) return;

    logger.log("Deleting event:", eventId);

    const previousEvents = [...events];
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    if (selectedEventId === eventId) {
      setSelectedEventId("");
    }

    try {
      const matchesQuery = query(
        collection(db, "matches"),
        where("eventId", "==", eventId)
      );
      const matchesSnapshot = await getDocs(matchesQuery);

      for (const matchDoc of matchesSnapshot.docs) {
        const betsQuery = query(
          collection(db, "bets"),
          where("matchId", "==", matchDoc.id)
        );
        const betsSnapshot =           await getDocs(betsQuery);

        for (const betDoc of betsSnapshot.docs) {
          await deleteDoc(doc(db, "bets", betDoc.id));
        }

        await deleteDoc(doc(db, "matches", matchDoc.id));
      }

      const usersSnapshot = await getDocs(collection(db, "users"));
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const eventScores = userData.eventScores || {};
        const scoreForEvent = eventScores[eventId];

        if (scoreForEvent && typeof scoreForEvent === "number") {
          const userRef = doc(db, "users", userDoc.id);
          const currentTotal = userData.totalScore || 0;
          const newTotal = Math.max(0, currentTotal - scoreForEvent);

          const { [eventId]: _removed, ...restEventScores } = eventScores;

          await updateDoc(userRef, {
            totalScore: newTotal,
            eventScores: restEventScores,
          });
        }
      }

      const eventRef = doc(db, "events", eventId);
      await deleteDoc(eventRef);

      logger.log("Event deleted successfully");
      alert("Event and all associated data deleted successfully!");
    } catch (error) {
      logger.error("Error deleting event:", error);
      setEvents(previousEvents);
      if (selectedEventId === eventId) {
        setSelectedEventId(eventId);
      }
      alert("Failed to delete event: " + error.message);
    }
  }

  async function updateEventStatus(eventId, newStatus) {
    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, { status: newStatus });
      if (newStatus !== "active" && selectedEventId === eventId) {
        setSelectedEventId("");
      }
    } catch (error) {
      logger.error("Error updating event status:", error);
      alert("Failed to update event status: " + error.message);
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <button
          onClick={() => (window.location.href = "/admin/users")}
          className="btn-primary"
        >
          👥 Manage Users
        </button>
      </div>

      <div className="create-event-section card">
        <div className="dashboard-header" style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginBottom: 0 }}>Create Event</h3>
          {events.length > 0 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowClosedEvents((prev) => !prev)}
            >
              {showClosedEvents ? "Hide Closed Events" : "Show Closed Events"}
            </button>
          )}
        </div>
        <form onSubmit={createEvent}>
          <div className="form-group">
            <label>Event Name</label>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
              placeholder="e.g. LEC Spring 2024"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Event description (optional)"
              rows="2"
            />
          </div>
          <button disabled={loading} type="submit" className="btn-primary">
            Create Event
          </button>
        </form>

        {events.length > 0 && (
          <div className="events-list">
            <h4>Events</h4>
            {events
              .filter((event) => showClosedEvents || event.status !== "closed")
              .map((event) => (
                <div
                  key={event.id}
                  className={`event-item ${
                    selectedEventId === event.id ? "selected" : ""
                  }`}
                  onClick={(e) => {
                    if (event.status === "closed") return;
                    if (!e.target.closest("button")) {
                      setSelectedEventId(event.id);
                    }
                  }}
                >
                  <div className="event-item-header">
                    <div>
                      <strong>{event.name}</strong>
                      <span
                        className={`status-badge ${event.status}`}
                        style={{ marginLeft: "10px" }}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {event.status === "active" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateEventStatus(event.id, "closed");
                          }}
                          className="btn-secondary"
                        >
                          Close
                        </button>
                      )}
                      {event.status === "closed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateEventStatus(event.id, "active");
                          }}
                          className="btn-secondary"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event.id);
                        }}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {event.description && <p>{event.description}</p>}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="create-match-section card">
        <h3>Create Match</h3>
        {!selectedEventId && (
          <p className="event-info warning">⚠️ Please select an event first</p>
        )}
        {selectedEventId && (
          <p className="event-info success">
            Creating match for:{" "}
            <strong>
              {events.find((e) => e.id === selectedEventId)?.name}
            </strong>
          </p>
        )}
        <form onSubmit={createMatch}>
          <div className="form-group">
            <label>Team 1</label>
            <input
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              required
              placeholder="e.g. KC"
            />
          </div>
          <div className="form-group">
            <label>Team 2</label>
            <input
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              required
              placeholder="e.g. G2"
            />
          </div>
          <div className="form-group">
            <label>Best Of</label>
            <select
              value={bestOf}
              onChange={(e) => setBestOf(e.target.value)}
              required
            >
              <option value="bo1">Bo1</option>
              <option value="bo3">Bo3</option>
              <option value="bo5">Bo5</option>
            </select>
          </div>
          <button
            disabled={loading || !selectedEventId}
            type="submit"
            className="btn-primary"
          >
            Create Match
          </button>
        </form>
      </div>

      {resolvingMatch && (
        <div className="resolve-section card">
          <h3>
            Resolving: {resolvingMatch.team1} vs {resolvingMatch.team2}
            {resolvingMatch.bestOf && (
              <span style={{ 
                marginLeft: "0.5rem", 
                fontSize: "0.875rem", 
                color: "var(--text-secondary)",
                fontWeight: "normal"
              }}>
                ({resolvingMatch.bestOf.toUpperCase()}
                {resolvingMatch.gameNumber && ` - Game ${resolvingMatch.gameNumber}`})
              </span>
            )}
          </h3>
          <div className="draft-container">
            <DraftSelector
              teamName={resolvingMatch.team1}
              selections={resultDraft.team1}
              onSelect={(role, champ) =>
                handleResultSelect("team1", role, champ)
              }
              excludedChampions={[
                ...Object.values(resultDraft.team2).filter(Boolean),
                ...excludedChampionsFromSeries
              ]}
            />
            <DraftSelector
              teamName={resolvingMatch.team2}
              selections={resultDraft.team2}
              onSelect={(role, champ) =>
                handleResultSelect("team2", role, champ)
              }
              excludedChampions={[
                ...Object.values(resultDraft.team1).filter(Boolean),
                ...excludedChampionsFromSeries
              ]}
            />
          </div>
          <div className="actions">
            <button
              onClick={resolveMatch}
              disabled={loading}
              className="btn-primary"
            >
              Confirm Results
            </button>
            <button
              onClick={() => setResolvingMatch(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="matches-list">
        <h3>Matches</h3>
        {matches.map((match) => (
          <div key={match.id} className="match-card card">
            <div className="match-header">
              <h4>
                {match.team1} vs {match.team2}
                {match.bestOf && (
                  <span style={{ 
                    marginLeft: "0.5rem", 
                    fontSize: "0.875rem", 
                    color: "var(--text-secondary)",
                    fontWeight: "normal"
                  }}>
                    ({match.bestOf.toUpperCase()}
                    {match.gameNumber && ` - Game ${match.gameNumber}`})
                  </span>
                )}
              </h4>
              <span className={`status-badge ${match.status}`}>
                {match.status}
              </span>
            </div>
            <div className="match-actions">
              {match.status === "open" && (
                <button
                  onClick={() => updateMatchStatus(match.id, "locked")}
                  className="btn-secondary"
                >
                  Lock Bets
                </button>
              )}
              {match.status === "locked" && (
                <>
                  <button
                    onClick={() => setResolvingMatch(match)}
                    className="btn-secondary"
                  >
                    Resolve (Draft)
                  </button>
                  <button
                    onClick={() => reopenBetting(match.id)}
                    className="btn-secondary"
                  >
                    Reopen Betting
                  </button>
                </>
              )}
              {match.status === "completed" && (
                <button
                  onClick={() => reopenBetting(match.id)}
                  className="btn-secondary"
                >
                  Reopen Betting
                </button>
              )}
              <button
                onClick={() => deleteMatch(match.id)}
                className="btn-delete"
              >
                Delete Match
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
