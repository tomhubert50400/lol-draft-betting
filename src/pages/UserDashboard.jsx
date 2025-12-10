import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  db, 
  collection, 
  query, 
  addDoc, 
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  orderBy
} from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import DraftSelector from "../components/DraftSelector";
import { logger } from "../utils/logger";
import LoadingSpinner from "../components/LoadingSpinner";

export default function UserDashboard() {
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [predictions, setPredictions] = useState({ team1: {}, team2: {} });
  const [loading, setLoading] = useState(false);
  const [editingBet, setEditingBet] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [excludedChampionsFromSeries, setExcludedChampionsFromSeries] = useState([]);

  useEffect(() => {
    async function getExcludedChampionsFromSeries() {
      if (!selectedMatch || !selectedMatch.seriesId || !selectedMatch.gameNumber) {
        setExcludedChampionsFromSeries([]);
        return;
      }

      try {
        const seriesMatchesQuery = query(
          collection(db, "matches"),
          where("seriesId", "==", selectedMatch.seriesId),
          where("status", "==", "completed")
        );
        const seriesMatchesSnapshot = await getDocs(seriesMatchesQuery);
        
        const excludedChampions = [];
        seriesMatchesSnapshot.forEach((doc) => {
          const matchData = doc.data();
          if (matchData.gameNumber && matchData.gameNumber < selectedMatch.gameNumber) {
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
  }, [selectedMatch]);

  useEffect(() => {
    const matchesQuery = query(
      collection(db, "matches"),
      orderBy("createdAt", "desc")
    );
    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      logger.log("UserDashboard: Received matches snapshot", snapshot.size);
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchesData);
    });

    return () => unsubscribeMatches();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const betsQuery = query(collection(db, "bets"), where("userId", "==", currentUser.uid));
    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      const betsData = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        betsData[data.matchId] = { id: doc.id, ...data };
      });
      setBets(betsData);
    });

    return () => unsubscribeBets();
  }, [currentUser]);

  function handleSelect(team, role, champion) {
    setPredictions(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [role]: champion
      }
    }));
  }

  async function submitBet() {
    if (!currentUser) {
      return;
    }
    if (!selectedMatch) return;
    
    setLoading(true);
    try {
      const matchRef = doc(db, "matches", selectedMatch.id);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        setLoading(false);
        return;
      }
      
      const currentMatchData = matchDoc.data();
      
      if (currentMatchData.status !== "open") {
        setSelectedMatch(null);
        setPredictions({ team1: {}, team2: {} });
        setLoading(false);
        return;
      }
      
      if (editingBet) {
        const betRef = doc(db, "bets", editingBet.id);
        await updateDoc(betRef, {
          predictions,
          status: "pending",
          score: 0
        });
      } else {
        await addDoc(collection(db, "bets"), {
          userId: currentUser.uid,
          matchId: selectedMatch.id,
          eventId: selectedMatch.eventId,
          predictions,
          score: 0,
          status: "pending",
          createdAt: new Date()
        });

        const uniqueMatches = new Set();
        Object.values(bets).forEach((bet) => {
          if (bet.matchId) {
            uniqueMatches.add(bet.matchId);
          }
        });
        uniqueMatches.add(selectedMatch.id);
        const totalBets = uniqueMatches.size;
        
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
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
          
          if (newBadges.length > currentBadges.length) {
            await updateDoc(userRef, { badges: newBadges });
          }
        }
      }
      setSelectedMatch(null);
      setEditingBet(null);
      setPredictions({ team1: {}, team2: {} });
    } catch (error) {
      logger.error("Error placing bet: ", error);
    }
    setLoading(false);
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h2>Matches</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowCompleted(prev => !prev)}
        >
          {showCompleted ? "Hide Completed Matches" : "Show Completed Matches"}
        </button>
      </div>

      {selectedMatch ? (
        <div className="betting-interface card">
          <h3>
            Betting on: {selectedMatch.team1} vs {selectedMatch.team2}
            {selectedMatch.bestOf && (
              <span style={{ 
                marginLeft: "0.5rem", 
                fontSize: "0.875rem", 
                color: "var(--text-secondary)",
                fontWeight: "normal"
              }}>
                ({selectedMatch.bestOf.toUpperCase()}
                {selectedMatch.gameNumber && ` - Game ${selectedMatch.gameNumber}`})
              </span>
            )}
          </h3>
          {!currentUser && (
            <div className="alert" style={{ 
              marginBottom: '20px',
              padding: '15px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid #ffc107',
              color: '#ffc107'
            }}>
              ⚠️ You must be logged in to place a bet. <Link to="/login" style={{ color: '#ffc107', textDecoration: 'underline' }}>Log in here</Link>
            </div>
          )}
          <div className="draft-container">
            <DraftSelector 
              teamName={selectedMatch.team1} 
              selections={predictions.team1} 
              onSelect={(role, champ) => handleSelect("team1", role, champ)}
              disabled={!currentUser}
              excludedChampions={[
                ...Object.values(predictions.team2).filter(Boolean),
                ...excludedChampionsFromSeries
              ]}
            />
            <DraftSelector 
              teamName={selectedMatch.team2} 
              selections={predictions.team2} 
              onSelect={(role, champ) => handleSelect("team2", role, champ)}
              disabled={!currentUser}
              excludedChampions={[
                ...Object.values(predictions.team1).filter(Boolean),
                ...excludedChampionsFromSeries
              ]}
            />
          </div>
          <div className="actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button 
              onClick={submitBet} 
              disabled={loading || !currentUser} 
              className="btn-primary"
              title={!currentUser ? "You must be logged in to place a bet" : ""}
            >
              {editingBet ? "Save Changes" : "Submit Bet"}
            </button>
            {loading && (
              <LoadingSpinner size="small" text="" />
            )}
            <button
              onClick={() => {
                setSelectedMatch(null);
                setEditingBet(null);
                setPredictions({ team1: {}, team2: {} });
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.length === 0 && <p>No matches found.</p>}
          {matches
            .filter(match => showCompleted || match.status !== "completed")
            .map(match => {
            const userBet = bets[match.id];
            return (
              <div key={match.id} className="match-card card">
                <div className="match-info">
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
                  <span className={`status-badge ${match.status}`}>{match.status}</span>
                </div>
                <div className="match-actions">
                  {match.status === "open" && !userBet && (
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          return;
                        }
                        setSelectedMatch(match);
                        setEditingBet(null);
                        setPredictions({ team1: {}, team2: {} });
                      }}
                      className="btn-primary"
                      title={!currentUser ? "You must be logged in to place a bet" : ""}
                    >
                      Place Bet
                    </button>
                  )}
                  {userBet && (
                    <div className="bet-status" style={{ width: "100%" }}>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 600 }}>
                          Bet Placed
                          {userBet.score !== null && userBet.score !== undefined
                            ? ` - Score: ${userBet.score}`
                            : ""}
                        </span>
                      </div>
                      {userBet.predictions && (
                        <div className="bet-predictions" style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                          marginTop: "0.75rem",
                          padding: "0.75rem",
                          backgroundColor: "var(--bg-secondary)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.875rem"
                        }}>
                          <div>
                            <div style={{ 
                              fontWeight: 600, 
                              marginBottom: "0.5rem",
                              color: "var(--accent-primary)"
                            }}>
                              {match.team1}
                            </div>
                            {["Top", "Jungle", "Mid", "Bot", "Support"].map(role => {
                              const champ = userBet.predictions?.team1?.[role];
                              return champ ? (
                                <div key={role} style={{ 
                                  marginBottom: "0.25rem",
                                  display: "flex",
                                  justifyContent: "space-between"
                                }}>
                                  <span style={{ color: "var(--text-secondary)" }}>{role}:</span>
                                  <span style={{ fontWeight: 500 }}>{champ}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                          <div>
                            <div style={{ 
                              fontWeight: 600, 
                              marginBottom: "0.5rem",
                              color: "var(--accent-primary)"
                            }}>
                              {match.team2}
                            </div>
                            {["Top", "Jungle", "Mid", "Bot", "Support"].map(role => {
                              const champ = userBet.predictions?.team2?.[role];
                              return champ ? (
                                <div key={role} style={{ 
                                  marginBottom: "0.25rem",
                                  display: "flex",
                                  justifyContent: "space-between"
                                }}>
                                  <span style={{ color: "var(--text-secondary)" }}>{role}:</span>
                                  <span style={{ fontWeight: 500 }}>{champ}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {match.status === "open" && userBet && currentUser && (
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setEditingBet(userBet);
                        setPredictions(userBet.predictions || { team1: {}, team2: {} });
                      }}
                      className="btn-secondary"
                      style={{ marginTop: "0.5rem" }}
                    >
                      Change Bet
                    </button>
                  )}
                  {match.status !== "open" && !userBet && (
                    <span>Betting Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
