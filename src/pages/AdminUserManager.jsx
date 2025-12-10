import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  functions,
  httpsCallable,
} from "../firebase";
import { logger } from "../utils/logger";
import ConfirmModal from "../components/ConfirmModal";

export default function AdminUserManager() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("search");

  const [scoreChange, setScoreChange] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newSocials, setNewSocials] = useState({ twitter: "", instagram: "", discord: "" });
  const [isAdminToggle, setIsAdminToggle] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function searchUser(e) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setMessage("");
    setFoundUser(null);
    setUserStats(null);

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
        const user = {
          id: querySnapshot.docs[0].id,
          ...userData,
        };
        setFoundUser(user);
        setNewUsername(user.username || "");
        setNewSocials(user.socials || { twitter: "", instagram: "", discord: "" });
        setIsAdminToggle(user.isAdmin || false);
        setMessage("✅ User found!");

        await loadUserStats(user.id);
      }
    } catch (error) {
      logger.error("Error searching user:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  async function loadUserStats(userId) {
    try {
      const betsQuery = query(
        collection(db, "bets"),
        where("userId", "==", userId)
      );
      const betsSnapshot = await getDocs(betsQuery);
      
      const bets = betsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pendingBets = bets.filter(b => b.status === "pending").length;
      const scoredBets = bets.filter(b => b.status === "scored").length;
      const totalBets = bets.length;
      const avgScore = scoredBets > 0 
        ? (bets.filter(b => b.status === "scored").reduce((sum, b) => sum + (b.score || 0), 0) / scoredBets).toFixed(1)
        : 0;

      setUserStats({
        totalBets,
        pendingBets,
        scoredBets,
        avgScore,
      });
    } catch (error) {
      logger.error("Error loading user stats:", error);
    }
  }

  async function modifyScore(e) {
    e.preventDefault();
    if (!foundUser || !scoreChange) return;

    const points = parseInt(scoreChange);
    if (isNaN(points)) {
      setMessage("❌ Please enter a valid number");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      const newTotalScore = Math.max(0, (foundUser.totalScore || 0) + points);

      await updateDoc(userRef, {
        totalScore: newTotalScore,
      });

      setMessage(`✅ Score updated! ${foundUser.totalScore || 0} → ${newTotalScore}`);
      
      setFoundUser({
        ...foundUser,
        totalScore: newTotalScore,
      });
      
      setScoreChange("");
    } catch (error) {
      logger.error("Error updating score:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  async function updateUsername(e) {
    e.preventDefault();
    if (!foundUser || !newUsername.trim()) return;

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", newUsername.trim())
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty && usernameSnapshot.docs[0].id !== foundUser.id) {
        setMessage("❌ This username is already taken");
        return;
      }
    } catch (error) {
      logger.error("Error checking username:", error);
      setMessage("❌ Error checking username availability");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      await updateDoc(userRef, {
        username: newUsername.trim(),
      });

      setMessage(`✅ Username updated! ${foundUser.username} → ${newUsername.trim()}`);
      
      setFoundUser({
        ...foundUser,
        username: newUsername.trim(),
      });
    } catch (error) {
      logger.error("Error updating username:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  async function updateSocials(e) {
    e.preventDefault();
    if (!foundUser) return;

    setLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      await updateDoc(userRef, {
        socials: {
          twitter: newSocials.twitter.trim() || "",
          instagram: newSocials.instagram.trim() || "",
          discord: newSocials.discord.trim() || "",
        },
      });

      setMessage("✅ Socials updated!");
      
      setFoundUser({
        ...foundUser,
        socials: {
          twitter: newSocials.twitter.trim() || "",
          instagram: newSocials.instagram.trim() || "",
          discord: newSocials.discord.trim() || "",
        },
      });
    } catch (error) {
      logger.error("Error updating socials:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  function handleToggleAdminStatus() {
    if (!foundUser) return;

    const newAdminStatus = !foundUser.isAdmin;
    setConfirmModal({
      isOpen: true,
      title: `${newAdminStatus ? "Grant" : "Revoke"} Admin Privileges`,
      message: `Are you sure you want to ${newAdminStatus ? "grant" : "revoke"} admin privileges for ${foundUser.username}?`,
      onConfirm: () => toggleAdminStatus(newAdminStatus),
    });
  }

  async function toggleAdminStatus(newAdminStatus) {
    setLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      await updateDoc(userRef, {
        isAdmin: newAdminStatus,
      });

      const adminStatus = newAdminStatus !== undefined ? newAdminStatus : !foundUser.isAdmin;
      setMessage(`✅ Admin status updated! ${foundUser.username} is now ${adminStatus ? "an admin" : "a regular user"}`);
      
      setIsAdminToggle(adminStatus);
      setFoundUser({
        ...foundUser,
        isAdmin: adminStatus,
      });
    } catch (error) {
      logger.error("Error updating admin status:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  function handleChangeUserPassword(e) {
    e.preventDefault();
    if (!foundUser || !foundUser.email) {
      setMessage("❌ User email not found");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setMessage("❌ Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords don't match");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Change User Password",
      message: `Change password for ${foundUser.username} (${foundUser.email})?\n\n⚠️ The user will need to use this new password to log in.`,
      onConfirm: () => changeUserPassword(),
    });
  }

  async function changeUserPassword() {
    setLoading(true);

    try {
      const changePasswordFunction = httpsCallable(functions, 'changeUserPassword');
      
      await changePasswordFunction({
        userId: foundUser.id,
        newPassword: newPassword
      });

      setMessage(`✅ Password changed successfully for ${foundUser.username}`);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      logger.error("Error changing password:", error);
      const errorMessage = error.message || "Failed to change password. Make sure Cloud Functions are deployed.";
      setMessage("❌ Error: " + errorMessage);
    }

    setLoading(false);
  }

  function handleDeleteUser() {
    if (!foundUser) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      message: `⚠️ WARNING: This will PERMANENTLY delete ${foundUser.username}'s account:\n\n- Firebase Auth account\n- Firestore user document\n- All associated bets\n\nThis action CANNOT be undone. Are you sure?`,
      onConfirm: () => deleteUser(),
    });
  }

  async function deleteUser() {
    setLoading(true);
    setMessage("");

    try {
      const betsQuery = query(
        collection(db, "bets"),
        where("userId", "==", foundUser.id)
      );
      const betsSnapshot = await getDocs(betsQuery);

      const batch = writeBatch(db);

      betsSnapshot.forEach((betDoc) => {
        batch.delete(doc(db, "bets", betDoc.id));
      });

      batch.delete(doc(db, "users", foundUser.id));

      await batch.commit();

      try {
        const deleteUserFunction = httpsCallable(functions, 'deleteUserAccount');
        await deleteUserFunction({ userId: foundUser.id });
      } catch (authError) {
        logger.error("Error deleting Auth account:", authError);
        setMessage(`⚠️ User data deleted, but Auth account deletion had an issue: ${authError.message}`);
      }

      setMessage(`✅ User ${foundUser.username} completely deleted (Auth + Firestore + ${betsSnapshot.size} bets)`);
      
      setFoundUser(null);
      setUsername("");
      setUserStats(null);
    } catch (error) {
      logger.error("Error deleting user:", error);
      setMessage("❌ Error: " + error.message);
    }

    setLoading(false);
  }

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>User Management</h2>
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
        <h3>Search User</h3>
        
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
            <h4 style={{ margin: '0 0 10px 0' }}>
              {foundUser.username} {foundUser.isAdmin && <span style={{ color: '#ff6b6b', fontSize: '0.8rem' }}>(Admin)</span>}
            </h4>
            <p style={{ margin: '5px 0' }}>
              <strong>Email:</strong> {foundUser.email}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>User ID:</strong> {foundUser.id}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>Total Score:</strong> {foundUser.totalScore || 0}
            </p>
            {userStats && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ margin: '5px 0' }}><strong>Total Bets:</strong> {userStats.totalBets}</p>
                <p style={{ margin: '5px 0' }}><strong>Pending:</strong> {userStats.pendingBets}</p>
                <p style={{ margin: '5px 0' }}><strong>Scored:</strong> {userStats.scoredBets}</p>
                <p style={{ margin: '5px 0' }}><strong>Average Score:</strong> {userStats.avgScore}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {foundUser && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-primary)' }}>
            <button
              onClick={() => setActiveTab("score")}
              className={activeTab === "score" ? "btn-primary" : "btn-secondary"}
              style={{ borderBottom: activeTab === "score" ? "2px solid var(--accent-primary)" : "none" }}
            >
              Score
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={activeTab === "profile" ? "btn-primary" : "btn-secondary"}
              style={{ borderBottom: activeTab === "profile" ? "2px solid var(--accent-primary)" : "none" }}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("danger")}
              className={activeTab === "danger" ? "btn-primary" : "btn-secondary"}
              style={{ borderBottom: activeTab === "danger" ? "2px solid var(--accent-primary)" : "none", color: '#ff6b6b' }}
            >
              Danger Zone
            </button>
          </div>

          {activeTab === "score" && (
            <div className="card" style={{ marginBottom: '30px' }}>
              <h3>Modify Score</h3>
              <form onSubmit={modifyScore}>
                <div className="form-group">
                  <label>Points to Add/Subtract</label>
                  <input
                    type="number"
                    value={scoreChange}
                    onChange={(e) => setScoreChange(e.target.value)}
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
            </div>
          )}

          {activeTab === "profile" && (
            <div className="card" style={{ marginBottom: '30px' }}>
              <h3>Edit Profile</h3>

              <form onSubmit={updateUsername} style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Username</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter new username..."
                      required
                      style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={loading} className="btn-primary">
                      Update Username
                    </button>
                  </div>
                </div>
              </form>

              <form onSubmit={updateSocials} style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Social Media</label>
                  <input
                    type="text"
                    value={newSocials.twitter}
                    onChange={(e) => setNewSocials({ ...newSocials, twitter: e.target.value })}
                    placeholder="Twitter username (e.g., tomhrt1)"
                    style={{ marginBottom: '10px' }}
                  />
                  <input
                    type="text"
                    value={newSocials.instagram}
                    onChange={(e) => setNewSocials({ ...newSocials, instagram: e.target.value })}
                    placeholder="Instagram username (e.g., tomhrt1)"
                    style={{ marginBottom: '10px' }}
                  />
                  <input
                    type="text"
                    value={newSocials.discord}
                    onChange={(e) => setNewSocials({ ...newSocials, discord: e.target.value })}
                    placeholder="Discord (e.g., Username#1234)"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary">
                  Update Socials
                </button>
              </form>

              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Admin Status</label>
                    <small style={{ opacity: 0.7 }}>
                      Current: {foundUser.isAdmin ? "Admin" : "Regular User"}
                    </small>
                  </div>
                    <button
                      onClick={handleToggleAdminStatus}
                      disabled={loading}
                      className="btn-secondary"
                      style={{
                        borderColor: foundUser.isAdmin ? '#ff6b6b' : '#0AC8B9',
                        color: foundUser.isAdmin ? '#ff6b6b' : '#0AC8B9',
                      }}
                    >
                      {foundUser.isAdmin ? "Revoke Admin" : "Grant Admin"}
                    </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="card">
              <h3 style={{ color: '#ff6b6b' }}>⚠️ Danger Zone</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>Change Password</h4>
                <p style={{ marginBottom: '15px', opacity: 0.8 }}>
                  Set a new password for {foundUser.username}
                </p>
                <form onSubmit={handleChangeUserPassword}>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                      style={{ marginBottom: '10px' }}
                    />
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    Change Password
                  </button>
                </form>
              </div>

              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-primary)' }}>
                <h4 style={{ marginBottom: '10px', color: '#ff6b6b' }}>Delete Account</h4>
                <p style={{ marginBottom: '15px', opacity: 0.8 }}>
                  This will <strong>PERMANENTLY</strong> delete {foundUser.username}'s account:
                  <br />
                  • Firebase Auth account (cannot login anymore)
                  <br />
                  • Firestore user document
                  <br />
                  • All associated bets
                  <br />
                  <strong style={{ color: '#ff6b6b' }}>This action CANNOT be undone.</strong>
                </p>
                <button
                  onClick={handleDeleteUser}
                  disabled={loading}
                  className="btn-secondary"
                  style={{
                    borderColor: '#d13639',
                    color: '#ff6b6b',
                    fontWeight: 'bold'
                  }}
                >
                  Delete User Account Completely
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        confirmText="Yes"
        cancelText="No"
      />
    </div>
  );
}

