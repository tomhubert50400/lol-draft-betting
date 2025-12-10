import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { ChampionsProvider } from "./contexts/ChampionsContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdminRoute from "./components/AdminRoute";
import SuspenseFallback from "./components/SuspenseFallback";

const Login = lazy(() => import("./pages/Login"));
const Welcome = lazy(() => import("./pages/Welcome"));
const PasswordResetConfirmation = lazy(() =>
  import("./pages/PasswordResetConfirmation")
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUserManager = lazy(() => import("./pages/AdminUserManager"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const UserBets = lazy(() => import("./pages/UserBets"));


function App() {
  return (
    <Router>
      <AuthProvider>
        <ChampionsProvider>
          <div className="app-container">
            <Navbar />
            <Suspense fallback={<SuspenseFallback />}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route
                path="/reset-confirmation"
                element={<PasswordResetConfirmation />}
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUserManager />
                  </AdminRoute>
                }
              />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile/:userId/bets" element={<UserBets />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/" element={<UserDashboard />} />
            </Routes>
          </Suspense>
        </div>
        </ChampionsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
