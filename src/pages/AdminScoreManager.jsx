import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch
} from "../firebase";
import { logger } from "../utils/logger";

export default function AdminScoreManager() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchUser(e) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setMessage("");
    setFoundUser(null);

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username.trim())
      );
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        setMessage("❌ User not found");
      } else {
        const userData = querySnapshot.docs[0].data();
        setFoundUser({
          id: querySnapshot.docs[0].id,
          ...userData
        });
        setMessage("✅ User found!");
      }
    } catch (error) {
      logger.error("Error searching user:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  async function modifyScore(e) {
    e.preventDefault();
    if (!foundUser || !pointsToAdd) return;

    const points = parseInt(pointsToAdd);
    if (isNaN(points)) {
      setMessage("❌ Please enter a valid number");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      const newTotalScore = (foundUser.totalScore || 0) + points;

      await updateDoc(userRef, {
        totalScore: newTotalScore
      });

      setMessage(`✅ Score updated! ${foundUser.totalScore || 0} → ${newTotalScore}`);
      
      setFoundUser({
        ...foundUser,
        totalScore: newTotalScore
      });
      
      setPointsToAdd("");
    } catch (error) {
      logger.error("Error updating score:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  async function resetAllScores() {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will reset ALL users' scores to 0. This action cannot be undone. Are you sure?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const batch = writeBatch(db);

      usersSnapshot.forEach((userDoc) => {
        const userRef = doc(db, "users", userDoc.id);
        batch.update(userRef, {
          totalScore: 0,
          eventScores: {}
        });
      });

      await batch.commit();
      
      setMessage(`✅ Successfully reset ${usersSnapshot.size} users' scores to 0`);
      
      setFoundUser(null);
      setUsername("");
    } catch (error) {
      logger.error("Error resetting scores:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Score Management</h2>
        <button onClick={() => navigate('/admin')} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      {message && (
        <div className="alert" style={{ 
          marginBottom: '20px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: message.includes('❌') ? 'rgba(255, 107, 107, 0.1)' : 'rgba(10, 200, 185, 0.1)',
          border: message.includes('❌') ? '1px solid #ff6b6b' : '1px solid #0AC8B9',
          color: message.includes('❌') ? '#ff6b6b' : '#0AC8B9'
        }}>
          {message}
        </div>
      )}

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3>Change User Score</h3>
        
        <form onSubmit={searchUser} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Search by Username</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                required
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={loading} className="btn-primary">
                Search
              </button>
            </div>
          </div>
        </form>

        {foundUser && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: 'rgba(200, 155, 60, 0.1)', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>{foundUser.username}</h4>
            <p style={{ margin: '5px 0' }}>
              <strong>Email:</strong> {foundUser.email}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Current Total Score:</strong> {foundUser.totalScore || 0}
            </p>
          </div>
        )}

        {foundUser && (
          <form onSubmit={modifyScore}>
            <div className="form-group">
              <label>Points to Add/Subtract</label>
              <input
                type="number"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value)}
                placeholder="Enter positive or negative number (e.g., 50 or -20)"
                required
              />
              <small style={{ display: 'block', marginTop: '5px', opacity: 0.7 }}>
                Use positive numbers to add points, negative numbers to subtract
              </small>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              Apply Score Change
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3 style={{ color: '#ff6b6b' }}>⚠️ Danger Zone</h3>
        <p style={{ marginBottom: '15px', opacity: 0.8 }}>
          This will reset ALL users' total scores and event scores to 0. This action cannot be undone.
        </p>
        <button
          onClick={resetAllScores}
          disabled={loading}
          className="btn-secondary"
          style={{
            borderColor: '#d13639',
            color: '#ff6b6b',
            fontWeight: 'bold'
          }}
        >
          Reset All Scores
        </button>
      </div>
    </div>
  );
}
