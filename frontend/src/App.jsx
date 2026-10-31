import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Sessions from "./pages/Sessions";
import Header from "./components/Header";
import ThankYou from "./pages/Thanks";

import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

function App() {
  const [participantToken, setParticipantToken] = useState("");
  const [adminToken, setAdminToken] = useState("");

  return (
    <>
      <Header />
      <Routes>
        {/* Both Home and Register render on the root path */}
        <Route
          path="/"
          element={
            <>
              <Home />
            </>
          }
        />
        <Route
          path="/register"
          element={<Register setParticipantToken={setParticipantToken} />}
        />
        <Route
          path="/sessions"
          element={
            <Sessions
              participantToken={participantToken}
              setParticipantToken={setParticipantToken}
            />
          }
        />
        <Route path="/admin" element={<Admin adminToken={adminToken} setAdminToken={setAdminToken} />} />
        <Route path="/thx" element={<ThankYou />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;