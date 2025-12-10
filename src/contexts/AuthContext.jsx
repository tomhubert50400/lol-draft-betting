import React, { useContext, useState, useEffect } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "../firebase";
import { logger } from "../utils/logger";
import LoadingSpinner from "../components/LoadingSpinner";
import { useDelayedLoading } from "../hooks/useDelayedLoading";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading, { delay: 200, minDisplayTime: 500 });

  async function signup(email, password, username, socials = {}) {
    const trimmedUsername = username.trim();

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", trimmedUsername)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        throw new Error(
          "Ce pseudo est déjà utilisé. Veuillez en choisir un autre."
        );
      }
    } catch (error) {
      if (error.message.includes("pseudo")) {
        throw error;
      }
      logger.error("Error checking username uniqueness:", error);
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: trimmedUsername });

    try {
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        username: trimmedUsername,
        email: email,
        totalScore: 0,
        eventScores: {},
        isAdmin: email === "admin@lolbetting.com",
        createdAt: serverTimestamp(),
        socials: {
          twitter: socials.twitter || "",
          instagram: socials.instagram || "",
          discord: socials.discord || "",
        },
      });
      logger.log("User document created successfully");
    } catch (error) {
      logger.error("Error creating user document:", error);
      throw error;
    }

    return result;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function updateUserSocials(socials) {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        socials: {
          twitter: socials.twitter || "",
          instagram: socials.instagram || "",
          discord: socials.discord || "",
        },
      });
    } catch (error) {
      logger.error("Error updating socials:", error);
      throw error;
    }
  }

  async function changePassword(currentPassword, newPassword) {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      logger.error("Error changing password:", error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().isAdmin || false);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          if (error.code !== 'not-found' && error.code !== 'unavailable' && error.code !== 'deadline-exceeded') {
            logger.error("Error fetching user data:", error);
          }
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    loading,
    signup,
    login,
    logout,
    updateUserSocials,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {showLoading ? (
        <LoadingSpinner size="large" text="Initializing..." fullScreen />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
