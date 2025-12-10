import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, query, orderBy, limit, getDocs } from "../firebase";
import UserSearch from "../components/UserSearch";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("global");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedEventId]);

  async function loadEvents() {
    const eventsSnapshot = await getDocs(query(collection(db, "events"), orderBy("createdAt", "desc")));
    const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEvents(eventsData);
  }

  async function fetchLeaderboard() {
    setLoading(true);
    const LEADERBOARD_LIMIT = 200;
    
    let leaderboardData;

    if (selectedEventId === "global") {
      const usersQuery = query(
        collection(db, "users"),
        orderBy("totalScore", "desc"),
        limit(LEADERBOARD_LIMIT)
      );
      const usersSnapshot = await getDocs(usersQuery);
      leaderboardData = usersSnapshot.docs
        .map(doc => ({
          userId: doc.id,
          username: doc.data().username || "Unknown User",
          points: doc.data().totalScore || 0
        }))
        .filter(user => user.points > 0);
    } else {
      const usersQuery = query(
        collection(db, "users"),
        limit(LEADERBOARD_LIMIT * 2)
      );
      const usersSnapshot = await getDocs(usersQuery);
      leaderboardData = usersSnapshot.docs
        .map(doc => {
          const userData = doc.data();
          return {
            userId: doc.id,
            username: userData.username || "Unknown User",
            points: (userData.eventScores && userData.eventScores[selectedEventId]) || 0
          };
        })
        .filter(user => user.points > 0)
        .sort((a, b) => b.points - a.points)
        .slice(0, LEADERBOARD_LIMIT);
    }

    setUsers(leaderboardData);
    setLoading(false);
  }

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      
      <div className="leaderboard-controls card">
        <div className="leaderboard-controls-grid">
          <div>
            <label>Filter by Event</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="global">🌍 Global (All Events)</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label>Search Users</label>
            <UserSearch placeholder="Search by username..." />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingSpinner size="medium" text="Loading leaderboard..." />
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
              <tr 
                key={user.userId}
                onClick={() => navigate(`/profile/${user.userId}`)}
              >
                <td>
                  {index === 0 && <span className="rank-medal">🥇</span>}
                  {index === 1 && <span className="rank-medal">🥈</span>}
                  {index === 2 && <span className="rank-medal">🥉</span>}
                  {index > 2 && <span>{index + 1}</span>}
                </td>
                <td className={index < 3 ? 'top-rank' : ''}>
                  {user.username}
                </td>
                <td className="points">
                  {user.points}
                </td>
              </tr>
            ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3">No scores yet</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
