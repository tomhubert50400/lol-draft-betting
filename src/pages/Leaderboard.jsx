import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, collection, query, orderBy, getDocs } from "../firebase";
import UserSearch from "../components/UserSearch";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("global");
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
    const usersSnapshot = await getDocs(collection(db, "users"));
    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let leaderboardData;

    if (selectedEventId === "global") {
      leaderboardData = usersData.map(user => ({
        userId: user.id,
        username: user.username || "Unknown User",
        points: user.totalScore || 0
      })).filter(user => user.points > 0);
    } else {
      leaderboardData = usersData.map(user => ({
        userId: user.id,
        username: user.username || "Unknown User",
        points: (user.eventScores && user.eventScores[selectedEventId]) || 0
      })).filter(user => user.points > 0); // Only show users who participated
    }

    leaderboardData.sort((a, b) => b.points - a.points);
    setUsers(leaderboardData);
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
      </div>
    </div>
  );
}
