import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Sessions from "./pages/Sessions";
import Header from "./components/Header";
import ThankYou from "./pages/Thanks";

import { Navigate, Route, Routes } from "react-router-dom";

function App() {
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
      <Route path="/register" element={<Register />}/>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/thx" element={<ThankYou />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;