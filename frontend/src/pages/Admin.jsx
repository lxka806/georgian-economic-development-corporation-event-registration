import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export default function Admin({ adminToken, setAdminToken }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data State
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [orderDrafts, setOrderDrafts] = useState({});
  const [sessionsError, setSessionsError] = useState("");
  const [updatingSessionId, setUpdatingSessionId] = useState("");
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. Check if admin is already logged in on mount
  useEffect(() => {
    if (!adminToken) {
      setCheckingAuth(false);
      return;
    }

    fetch(`${API_BASE}/api/admin/session`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setAdminToken("");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [adminToken, setAdminToken]);

  // 2. Fetch dashboard data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    setLoadingData(true);
    setDataError("");
    fetch(`${API_BASE}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
      .then(async (res) => {
        if (res.status === 401) {
          setAdminToken("");
          setIsAuthenticated(false);
          throw new Error("Session expired");
        }
        const responseData = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(responseData?.message || `Failed to load data (${res.status})`);
        }
        return responseData;
      })
      .then((responseData) => {
        if (!responseData || !responseData.summary || !Array.isArray(responseData.users)) {
          throw new Error("The dashboard returned incomplete data. Refresh and try again.");
        }
        setData(responseData);
      })
      .catch((err) => {
        setData(null);
        setDataError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => setLoadingData(false));
  }, [isAuthenticated, adminToken, setAdminToken]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetch(`${API_BASE}/api/sessions`)
      .then(async (res) => {
        const responseData = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(responseData?.message || `Failed to load sessions (${res.status})`);
        }
        if (!Array.isArray(responseData)) {
          throw new Error("The sessions endpoint returned invalid data.");
        }
        setSessions(responseData);
        setOrderDrafts(Object.fromEntries(responseData.map((session) => [
          session._id,
          String(session.order)
        ])));
      })
      .catch((err) => setSessionsError(err.message || "Failed to load sessions."));
  }, [isAuthenticated]);

  const handleRequiredSessionChange = async (session) => {
    const isRequired = session.isRequired !== true;
    setSessionsError("");
    setUpdatingSessionId(session._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sessions/${session._id}/required`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isRequired })
      });
      const responseData = await res.json().catch(() => null);
      if (res.status === 401) {
        setAdminToken("");
        setIsAuthenticated(false);
        setData(null);
        throw new Error("Session expired. Please sign in again.");
      }
      if (!res.ok) {
        throw new Error(responseData?.message || `Failed to update session (${res.status})`);
      }
      setSessions((current) => current.map((item) =>
        item._id === session._id ? { ...item, isRequired: responseData.session.isRequired } : item
      ));
    } catch (err) {
      setSessionsError(err.message || "Failed to update session.");
    } finally {
      setUpdatingSessionId("");
    }
  };

  const handleSessionOrderChange = async (session) => {
    const order = Number(orderDrafts[session._id]);
    if (!Number.isSafeInteger(order) || order < 1 || order > sessions.length) {
      setSessionsError(`რიგითი ნომერი უნდა იყოს 1-დან ${sessions.length}-მდე.`);
      return;
    }

    setSessionsError("");
    setUpdatingSessionId(session._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sessions/${session._id}/order`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ order })
      });
      const responseData = await res.json().catch(() => null);
      if (res.status === 401) {
        setAdminToken("");
        setIsAuthenticated(false);
        setData(null);
        throw new Error("Session expired. Please sign in again.");
      }
      if (!res.ok) {
        throw new Error(responseData?.message || `Failed to update session order (${res.status})`);
      }
      if (!Array.isArray(responseData?.sessions)) {
        throw new Error("The session order endpoint returned invalid data.");
      }
      setSessions(responseData.sessions);
      setOrderDrafts(Object.fromEntries(responseData.sessions.map((item) => [
        item._id,
        String(item.order)
      ])));
    } catch (err) {
      setSessionsError(err.message || "Failed to update session order.");
    } finally {
      setUpdatingSessionId("");
    }
  };

  // 3. Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "Invalid password");
      if (typeof resData.token !== "string" || resData.token.length === 0) {
        throw new Error("The server did not return an admin token.");
      }
      setAdminToken(resData.token);
      setPassword("");
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } finally {
      setAdminToken("");
      setIsAuthenticated(false);
      setData(null);
    }
  };

  // 5. Export to REAL Excel (.xlsx)
  const exportExcel = () => {
    if (!data) return;
    
    const excelData = users.map(u => ({
      "რეგისტრაციის ნომერი": u._id,
      "სახელი": u.firstName,
      "გვარი": u.lastName,
      "ტელეფონი": u.phoneNumber,
      "ელ. ფოსტა": u.email,
      "რეგისტრაციის თარიღი": u.createdAt ? new Date(u.createdAt).toLocaleString() : "",
      "კომპანია": u.businessName || "",
      "პოზიცია": u.position || "",
      "სფერო": u.activity || "",
      "ბიზნესის აღწერა": u.businessDescription || "",
      "არჩეული სესიები": (u.sessions || []).map((session) =>
        [session.name, session.startTime, session.endTime].filter(Boolean).join(" | ")
      ).join("\n") || "—",
      "არჩეული ივენთები": (u.events || []).map((event) =>
        [event.name, event.time, event.place].filter(Boolean).join(" | ")
      ).join("\n") || "—"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const columnWidths = [
      { wch: 26 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
      { wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
      { wch: 40 }, { wch: 30 }, { wch: 30 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "მონაწილეები");

    XLSX.writeFile(workbook, "samagrelos_biznesis_dge_2026.xlsx");
  };

  if (checkingAuth) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">იტვირთება...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#122924] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-[#122924] mb-6 text-center">ადმინის პანელი</h2>
          <input
            type="password"
            placeholder="პაროლი"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 mb-4 outline-none focus:border-[#122924]"
          />
          {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
          <button type="submit" className="w-full bg-[#122924] text-white py-3 rounded-md font-bold hover:bg-[#1e3632]">
            შესვლა
          </button>
        </form>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        იტვირთება...
      </div>
    );
  }

  if (dataError || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert" className="text-red-700">
          {dataError || "Dashboard data is not available."}
        </p>
        <button
          type="button"
          onClick={() => {
            setDataError("");
            setIsAuthenticated(false);
          }}
          className="rounded-md bg-[#122924] px-5 py-3 font-semibold text-white hover:bg-[#1e3632]"
        >
          Return to admin sign in
        </button>
      </div>
    );
  }

  // ==========================================
  // DYNAMIC DATA CALCULATION
  // ==========================================
  const users = Array.isArray(data.users) ? data.users : [];

  const filteredUsers = users.filter(user => {
    const searchString = `${user.firstName} ${user.lastName} ${user.phoneNumber} ${user.email} ${user.businessName}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    let matchesSession = true;
    if (sessionFilter !== "all") {
      matchesSession = user.sessions.some(s => s.name === sessionFilter) || 
                       user.events.some(e => e.name === sessionFilter);
    }

    return matchesSearch && matchesSession;
  });

  const allUniqueNames = [];
  users.forEach(user => {
    (user.sessions || []).forEach(s => {
      if (s.name && !allUniqueNames.includes(s.name)) allUniqueNames.push(s.name);
    });
    (user.events || []).forEach(e => {
      if (e.name && !allUniqueNames.includes(e.name)) allUniqueNames.push(e.name);
    });
  });

  const sessionStats = {};
  allUniqueNames.forEach(name => {
    sessionStats[name] = 0;
  });

  users.forEach(user => {
    (user.sessions || []).forEach(s => {
      if (s.name) sessionStats[s.name] += 1;
    });
    (user.events || []).forEach(e => {
      if (e.name) sessionStats[e.name] += 1;
    });
  });

  const navItems = [
    { key: "dashboard", label: "დაფა" },
    { key: "registrations", label: "მონაწილეები" },
    { key: "sessions", label: "სესიების პარამეტრები" },
  ];

  return (
  <div className="min-h-screen bg-[#f4f4f4] flex font-sans text-gray-800">
    
    {/* Mobile overlay */}
    {sidebarOpen && (
      <div
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
    )}

    {/* SIDEBAR — responsive: drawer on mobile, static on lg+ */}
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#122924] flex flex-col text-white shrink-0 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Mobile close button */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 lg:hidden">
        <span className="text-sm font-semibold">მენიუ</span>
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="დახურვა"
          className="text-gray-300 hover:text-white text-2xl leading-none px-2"
        >
          ×
        </button>
      </div>

      <nav className="flex-1 py-4 lg:py-6">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setActiveTab(item.key);
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === item.key
                ? "bg-white/10 border-l-4 border-white"
                : "text-gray-300 hover:bg-white/5 border-l-4 border-transparent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10">
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
          გასვლა
        </button>
      </div>
    </aside>

    {/* MAIN CONTENT AREA */}
    <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
      
      {/* Header with mobile menu button */}
      <div className="flex items-center gap-3 mb-6 lg:mb-8">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="მენიუს გახსნა"
          className="lg:hidden shrink-0 rounded-md border border-gray-300 bg-white p-2 text-[#122924] hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#122924] truncate">
            {activeTab === "dashboard" ? "დაფა" : activeTab === "sessions" ? "სესიების პარამეტრები" : "მონაწილეები"}
          </h1>
          <span className="text-gray-400 text-xs sm:text-sm truncate">სამეგრელოს ბიზნესის დღე 2026</span>
        </div>
      </div>

      {activeTab === "sessions" ? (
        /* ================= SESSIONS SETTINGS ================= */
        <section className="max-w-4xl">
          <p className="mb-6 text-sm text-gray-600">
            დააყენეთ სესიების რიგი და მონიშნეთ სავალდებულო სესიები. მონაწილეებს სესიები ამ რიგით გამოუჩნდებათ; სავალდებულო სესიები ავტომატურად აერჩევათ.
          </p>
          {sessionsError && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {sessionsError}
            </p>
          )}
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session._id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-[#122924] break-words">{session.name}</span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {session.startTime} – {session.endTime}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm sm:shrink-0">
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={sessions.length}
                      value={orderDrafts[session._id] ?? ""}
                      aria-label={`${session.name} რიგითი ნომერი`}
                      disabled={updatingSessionId === session._id}
                      onChange={(event) => setOrderDrafts((current) => ({
                        ...current,
                        [session._id]: event.target.value
                      }))}
                      className="w-16 rounded border border-gray-300 px-2 py-1"
                    />
                    <button
                      type="button"
                      disabled={updatingSessionId === session._id}
                      onClick={() => handleSessionOrderChange(session)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      შენახვა
                    </button>
                  </span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={session.isRequired === true}
                      disabled={updatingSessionId === session._id}
                      onChange={() => handleRequiredSessionChange(session)}
                      className="h-5 w-5 rounded border-gray-300 text-[#122924] focus:ring-[#122924]"
                    />
                    სავალდებულო
                  </label>
                </span>
              </div>
            ))}
            {sessions.length === 0 && !sessionsError && (
              <p className="rounded-lg bg-white p-4 text-sm text-gray-500">სესიები არ არის დამატებული.</p>
            )}
          </div>
        </section>
      ) : activeTab === "dashboard" ? (
        /* ================= DASHBOARD ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-[#122924] text-white p-6 rounded-xl shadow-md">
            <p className="text-sm text-gray-300 mb-1">სულ დარეგისტრირებული</p>
            <p className="text-xs text-gray-400 mb-6">რეგისტრირებული მონაწილეები</p>
            <p className="text-4xl sm:text-5xl font-bold">{data.summary.totalUsers}</p>
          </div>

          {Object.entries(sessionStats).map(([name, count]) => (
            <div key={name} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-600 mb-1 break-words">{name}</p>
              <p className="text-xs text-gray-400 mb-6">რეგისტრირებული მონაწილეები</p>
              <p className="text-3xl sm:text-4xl font-bold text-[#122924]">{count}</p>
            </div>
          ))}
        </div>
      ) : (
        /* ================= REGISTRATIONS VIEW ================= */
        <div>
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-72">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="ძებნა…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#122924] text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="გასუფთავება"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#122924] bg-white w-full sm:w-auto"
              >
                <option value="all">სესია / ივენთი: ყველა</option>
                {allUniqueNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap">{filteredUsers.length} მონაწილე</span>
              <button 
                onClick={exportExcel}
                className="bg-[#122924] text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#1e3632] transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">ყველა მომხმარებლის Excel-ში ჩამოტვირთვა</span>
                <span className="sm:hidden">Excel</span>
              </button>
            </div>
          </div>

          {/* Table wrapper — horizontal scroll on small screens */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-gray-700 min-w-[1400px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">სახელი</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">გვარი</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">ტელეფონი</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">ელ. ფოსტა</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">კომპანია</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">პოზიცია</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">სფერო</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">არჩეული სესიები</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">არჩეული ივენთები</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{user.firstName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">{user.lastName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{user.phoneNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-blue-600">{user.email}</td>
                      <td className="px-4 py-3">{user.businessName || "—"}</td>
                      <td className="px-4 py-3">{user.position || "—"}</td>
                      <td className="px-4 py-3">{user.activity || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {user.sessions.length > 0 ? user.sessions.map((s, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded w-fit whitespace-nowrap">
                              {s.name}
                            </span>
                          )) : <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {user.events && user.events.length > 0 ? user.events.map((e, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded w-fit whitespace-nowrap">
                              {e.name}
                            </span>
                          )) : <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                        მონაწილეები ვერ მოიძებნა
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-400">
            მონაცემები აისახება რეალურ დროში ბაზიდან.
          </p>
        </div>
      )}
    </main>
  </div>
);
}