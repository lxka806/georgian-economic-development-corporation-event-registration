import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function Sessions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || sessionStorage.getItem("registrationEmail") || "";
  
  // States
  const [sessions, setSessions] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [selectionLoaded, setSelectionLoaded] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location, navigate]);

  const loadPendingSelections = () => {
    try {
      const saved = sessionStorage.getItem("pendingSelections");
      if (!saved) return null;
      const selections = JSON.parse(saved);
      if (!Array.isArray(selections.sessionIds) || !Array.isArray(selections.eventIds)) {
        return null;
      }
      return selections;
    } catch {
      return null;
    }
  };

  // Fetch sessions and current user selections on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch all sessions (which includes events based on your backend)
        const sessionsRes = await fetch(`${API_BASE}/api/sessions`);
        const sessionsData = await sessionsRes.json();
        if (!sessionsRes.ok) throw new Error("პროგრამის ჩატვირთვა ვერ მოხერხდა");
        const availableSessions = Array.isArray(sessionsData) ? sessionsData : [];
        setSessions(availableSessions);
        const requiredSessionIds = availableSessions
          .filter((session) => session.isRequired === true)
          .map((session) => session._id);
        const availableSessionIds = new Set(availableSessions.map((session) => session._id));
        const availableEventIds = new Set(
          availableSessions.flatMap((session) =>
            Array.isArray(session.events) ? session.events.map((event) => event._id) : []
          )
        );

        // 2. Fetch user's existing selections
        const selectionsRes = await fetch(`${API_BASE}/api/registrations/selections/me`, {
          credentials: "include"
        });
        
        if (selectionsRes.ok) {
          const selectionsData = await selectionsRes.json();
          const existingSessionIds = Array.isArray(selectionsData.sessions)
            ? selectionsData.sessions
                .map((session) => session._id)
                .filter((sessionId) => availableSessionIds.has(sessionId))
            : [];
          setSelectedSessionIds([...new Set([...existingSessionIds, ...requiredSessionIds])]);
          setSelectedEventIds(
            Array.isArray(selectionsData.events)
              ? selectionsData.events
                  .map((event) => event._id)
                  .filter((eventId) => availableEventIds.has(eventId))
                  .slice(0, 1)
              : []
          );
          setSelectionLoaded(true);
        } else {
          const pending = loadPendingSelections();
          if (pending) {
            const pendingSessionIds = pending.sessionIds.filter((sessionId) =>
              availableSessionIds.has(sessionId)
            );
            setSelectedSessionIds([...new Set([...pendingSessionIds, ...requiredSessionIds])]);
            setSelectedEventIds(
              pending.eventIds.filter((eventId) => availableEventIds.has(eventId)).slice(0, 1)
            );
          } else {
            setSelectedSessionIds(requiredSessionIds);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle session selection (for non-parallel events)
  const handleToggleSession = (sessionId) => {
    if (sessions.some((session) => session._id === sessionId && session.isRequired)) {
      return;
    }
    setSelectedSessionIds(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId) 
        : [...prev, sessionId]
    );
  };

  // Toggle event selection (for parallel events)
  const handleToggleEvent = (eventId) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? [] : [eventId]
    );
  };

  // Save selections after verification, or keep them temporarily for the next step.
  const handleSubmit = async () => {
    if (!privacyAccepted) {
      setError("გთხოვთ, დაეთანხმოთ პირობებს");
      return;
    }

    if (selectedSessionIds.length === 0 && selectedEventIds.length === 0) {
      setError("გთხოვთ, აირჩიოთ ერთი სესია ან ღონისძიება");
      return;
    }
    if (selectedEventIds.length !== 1) {
      setError("გთხოვთ, აირჩიოთ ერთი ღონისძიება");
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      if (!selectionLoaded) {
        sessionStorage.setItem("pendingSelections", JSON.stringify({
          sessionIds: selectedSessionIds,
          eventIds: selectedEventIds
        }));
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const sessionsRes = await fetch(`${API_BASE}/api/sessions`);
      const availableSessions = await sessionsRes.json();
      if (!sessionsRes.ok || !Array.isArray(availableSessions)) {
        throw new Error("პროგრამის ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.");
      }
      const availableSessionIds = new Set(availableSessions.map((session) => session._id));
      const availableEventIds = new Set(
        availableSessions.flatMap((session) =>
          Array.isArray(session.events) ? session.events.map((event) => event._id) : []
        )
      );
      if (selectedEventIds.length !== 1 || !availableEventIds.has(selectedEventIds[0])) {
        setSelectedEventIds([]);
        setError("არჩეული ღონისძიება აღარ არის ხელმისაწვდომი. გთხოვთ, აირჩიოთ სხვა ღონისძიება.");
        return;
      }
      const requiredSessionIds = availableSessions
        .filter((session) => session.isRequired === true)
        .map((session) => session._id);
      const currentSessionIds = [...new Set([
        ...selectedSessionIds.filter((sessionId) => availableSessionIds.has(sessionId)),
        ...requiredSessionIds
      ])];

      const res = await fetch(`${API_BASE}/api/registrations/selections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIds: currentSessionIds,
          eventIds: selectedEventIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "შენახვა ვერ მოხერხდა");

      navigate("/verify-email");
    } catch (err) {
      if (err.message.toLowerCase().includes("selected event")) {
        setSelectedEventIds([]);
        setError("არჩეული ღონისძიება აღარ არის ხელმისაწვდომი. გთხოვთ, აირჩიოთ სხვა ღონისძიება.");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans">იტვირთება...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4 font-sans text-gray-800">
      <div className=" bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        
        {/* STEPPER */}
        <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-[#122924]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>მონაცემები</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5 text-[#b33922]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#b33922] text-white">2</span>
            <span className="text-[#b33922]">პროგრამა</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300">3</span>
            <span>ელფოსტის დადასტურება</span>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-[#122924] mb-2">ღონისძიების პროგრამა</h1>
          <p className="text-sm text-gray-500 mb-8">აირჩიეთ აქტივობები, რომლებსაც დაესწრებით</p>

          <div className="space-y-4">
            {sessions.map((session) => {
              const isRequired = session.isRequired === true;
              const isSessionSelected = selectedSessionIds.includes(session._id);
              const isParallelEventGroup =
                typeof session.name === "string" &&
                session.name.includes("პარალელური სესიები");

              return (
                <div key={session._id} className={`border rounded-lg overflow-hidden transition-colors ${isSessionSelected ? 'border-[#122924] bg-[#f8faf9]' : 'border-gray-200 bg-white'}`}>
                  
                  {/* Main Session Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex gap-4">
                      {/* Time */}
                      <div className="w-24 text-sm font-bold text-gray-700 shrink-0">
                        <p>{session.startTime} - {session.endTime}</p>
                      </div>
                      
                      {/* Details */}
                      <div>
                        <h3 className="font-bold text-[#122924] text-[15px]">{session.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{session.description}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-[#f0b429]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                          {session.place}
                        </div>
                      </div>
                    </div>

                    {!isParallelEventGroup && !isRequired && <button
                        onClick={() => handleToggleSession(session._id)}
                        aria-pressed={isSessionSelected}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-colors border ${
                          isSessionSelected 
                            ? 'bg-[#e6f4ea] text-[#137333] border-[#137333]' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isSessionSelected ? "✓ არჩეულია" : "აირჩიე"}
                    </button>}
                  </div>

                  {/* Events belonging to this session */}
                  {Array.isArray(session.events) && session.events.length > 0 && (
                    <div className="bg-[#f4f4f4] p-4 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-600 mb-3">
                        ღონისძიებები <span className="font-normal text-gray-500">აირჩიეთ მინიმუმ ერთი ღონისძიება</span>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {session.events.map((event) => {
                          const isEventSelected = selectedEventIds.includes(event._id);
                          return (
                            <div 
                              key={event._id} 
                              className={`bg-white border p-4 rounded-md flex flex-col justify-between transition-colors ${
                                isEventSelected ? 'border-[#122924] ring-1 ring-[#122924]' : 'border-gray-200'
                              }`}
                            >
                              <div>
                                <h4 className="font-bold text-sm text-[#122924] mb-1">{event.name}</h4>
                                <p className="text-[11px] text-gray-500 mb-2">{event.time}</p>
                                <div className="flex items-center gap-1 mb-4 text-[11px] text-gray-500">
                                  <svg className="w-3 h-3 text-[#f0b429]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                  {event.place}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleToggleEvent(event._id)}
                                className={`w-full py-1.5 rounded-md text-sm font-medium transition-colors border ${
                                  isEventSelected 
                                    ? 'bg-[#e6f4ea] text-[#137333] border-[#137333]' 
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {isEventSelected ? "✓ არჩეულია" : "აირჩიე"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
          <p className="mt-5 text-xs text-gray-600">
            აირჩიეთ მინიმუმ ერთი ღონისძიება. პარალელური სესიების ჯგუფს ცალკე არჩევის ღილაკი არ სჭირდება — აირჩიეთ მასში ერთი ღონისძიება.
          </p>

          {/* FOOTER */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input 
                type="checkbox" 
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#122924] focus:ring-[#122924]"
              />
              <span>თანახმა ვარ ჩემ მიერ წარმოდგენილი ინფორმაცია გაზიარდეს ღონისძიების მონაწილეებთან.</span>
            </label>

            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => navigate("/")}
                className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors flex-1 md:flex-none"
              >
                ‹ უკან
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 bg-[#b33922] text-white rounded-md text-sm font-bold hover:bg-[#922d1b] transition-colors disabled:opacity-70 flex-1 md:flex-none"
              >
                {submitting ? "ინახება..." : selectionLoaded ? "არჩევანის განახლება" : "შემდეგი — ელფოსტის დადასტურება"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}