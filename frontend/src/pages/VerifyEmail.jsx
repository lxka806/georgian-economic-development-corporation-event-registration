import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const request = async (path, body) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
};

const savePendingSelections = async () => {
  const pending = sessionStorage.getItem("pendingSelections");
  if (!pending) return false;

  let selections;
  try {
    selections = JSON.parse(pending);
  } catch {
    throw new Error("Your saved programme choices could not be read. Go back and choose your programme again.");
  }

  if (!Array.isArray(selections.sessionIds) || !Array.isArray(selections.eventIds) ||
      (selections.sessionIds.length === 0 && selections.eventIds.length === 0)) {
    throw new Error("Your programme choices are incomplete. Go back and choose at least one session or event.");
  }

  const sessionsResponse = await fetch(`${API_BASE}/api/sessions`);
  const availableSessions = await sessionsResponse.json().catch(() => null);
  if (!sessionsResponse.ok || !Array.isArray(availableSessions)) {
    throw new Error("Available programme choices could not be checked. Please try again.");
  }
  const availableEventIds = new Set(
    availableSessions.flatMap((session) =>
      Array.isArray(session.events) ? session.events.map((event) => event._id) : []
    )
  );
  const availableSessionIds = new Set(availableSessions.map((session) => session._id));
  const requiredSessionIds = availableSessions
    .filter((session) => session.isRequired === true)
    .map((session) => session._id);
  if (selections.eventIds.length !== 1 || !availableEventIds.has(selections.eventIds[0])) {
    sessionStorage.removeItem("pendingSelections");
    return false;
  }

  const currentSelections = {
    sessionIds: [...new Set([
      ...selections.sessionIds.filter((sessionId) => availableSessionIds.has(sessionId)),
      ...requiredSessionIds
    ])],
    eventIds: selections.eventIds
  };
  await request("/api/registrations/selections", currentSelections);
  sessionStorage.removeItem("pendingSelections");
  return true;
};

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState(Array(8).fill(""));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const inputRefs = useRef([]);

  const handleCodeChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    if (value && index < 7) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      
      const focusIndex = Math.min(pastedData.length, 7);
      inputRefs.current[focusIndex].focus();
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 8) return;

    setBusy(true);
    setNotice(null);
    try {
      await request("/api/auth/verify-email", { code: fullCode });
      setIsSuccess(true);
      try {
        const hasPendingSelections = Boolean(sessionStorage.getItem("pendingSelections"));
        const saved = await savePendingSelections();
        if (saved) {
          sessionStorage.removeItem("registrationEmail");
          navigate("/thx", { replace: true });
        } else if (!hasPendingSelections) {
          navigate("/sessions", { replace: true });
        } else {
          navigate("/sessions", {
            replace: true,
            state: { message: "Your event is no longer available. Please choose another event." }
          });
        }
      } catch (saveError) {
        if (saveError.message.toLowerCase().includes("selected event")) {
          sessionStorage.removeItem("pendingSelections");
          navigate("/sessions", {
            replace: true,
            state: { message: "Your event is no longer available. Please choose another event." }
          });
          return;
        }
        setNotice({
          type: "error",
          text: `Your email is verified, but your programme choices could not be saved: ${saveError.message}`
        });
      }
    } catch (error) {
      setNotice({ type: "error", text: error.message || "ვერიფიკაცია ვერ მოხერხდა." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-center py-10 px-4 font-sans text-gray-800">
      <section className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 relative">
        
        {/* BACK BUTTON */}
        <button 
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-10 flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          უკან
        </button>

        {/* HEADER */}
        <header className="bg-[#122924] p-4 text-center">
          <h1 className="text-sm font-semibold tracking-wide text-gray-300">
            სამეგრელოს ბიზნესის დღე 2026
          </h1>
        </header>

        {/* STEPPER */}
        <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-[#122924]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>მონაცემები</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5 text-[#122924]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>პროგრამა</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-white ${isSuccess ? 'bg-[#122924]' : 'bg-[#b33922]'}`}>
              {isSuccess ? '✓' : '3'}
            </span>
            <span className={isSuccess ? 'text-[#122924]' : 'text-[#b33922]'}>
              ელფოსტის დადასტურება
            </span>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-8 text-center pt-10">
          
          {!isSuccess ? (
            /* STATE 1: ENTER CODE */
            <>
              <h2 className="text-xl font-bold text-[#122924] mb-3">
                ელ. ფოსტის დადასტურება
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                თქვენს ელ. ფოსტაზე გამოგზავნილია დამადასტურებელი კოდი. გთხოვთ, შეიყვანოთ კოდი რეგისტრაციის დასასრულებლად.
              </p>
              
              <p className="font-bold text-sm mb-6">{email || "თქვენი ელ. ფოსტა"}</p>

              <form onSubmit={verify} className="space-y-6">
                
                {/* 8 OTP BOXES */}
                <div className="flex justify-center gap-1.5 md:gap-2" dir="ltr">
                  {code.map((data, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={data}
                      onChange={(e) => handleCodeChange(e.target, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      disabled={busy}
                      className={`w-10 h-12 md:w-11 md:h-14 text-center text-xl md:text-2xl font-bold border rounded-md outline-none transition-colors
                        ${notice ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[#122924] focus:ring-1 focus:ring-[#122924]'}`}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-gray-500">კოდი მოქმედებს 15 წუთი</p>

                {notice && (
                  <p
                    role={notice.type === "error" ? "alert" : "status"}
                    className={`text-sm ${notice.type === "error" ? "text-red-600" : "text-green-700"}`}
                  >
                    {notice.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || code.join("").length !== 8}
                  className="w-full rounded-md bg-[#b33922] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#922d1b] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {busy ? "მოწმდება..." : "დადასტურება"}
                </button>
              </form>

              <button
                type="button"
                disabled={busy || !email}
                onClick={async () => {
                  setBusy(true);
                  setNotice(null);
                  try {
                    const data = await request("/api/auth/resend-verification", { email });
                    setCode(Array(8).fill(""));
                    setNotice({
                      type: "success",
                      text: data.message || "If an account exists for that email address, a new verification code will be sent shortly."
                    });
                    inputRefs.current[0]?.focus();
                  } catch (error) {
                    setNotice({
                      type: "error",
                      text: error.message || "ახალი კოდის მოთხოვნა ვერ მოხერხდა."
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-6 text-xs font-semibold text-[#122924] underline underline-offset-2 hover:text-[#b33922] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ახალი კოდის მოთხოვნა
              </button>
            </>
          ) : (
            /* STATE 2: SUCCESS */
            <>
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[#122924] text-white mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-[#122924] mb-4">
                გილოცავთ!
              </h2>
              <p className="text-sm text-gray-700 mb-8 leading-relaxed">
                თქვენ წარმატებით დარეგისტრირდით სამეგრელოს ბიზნესის დღეზე. გელოდებით ღონისძიებაზე!
              </p>

              <p className="text-xs text-gray-500 mb-1">სარეგისტრაციო ნომერი</p>

              <button
                onClick={async () => {
                  setBusy(true);
                  try {
                    const hasPendingSelections = Boolean(sessionStorage.getItem("pendingSelections"));
                    const saved = await savePendingSelections();
                    if (saved) {
                      sessionStorage.removeItem("registrationEmail");
                      navigate("/thx", { replace: true });
                    } else if (!hasPendingSelections) {
                      navigate("/sessions", { replace: true });
                    } else {
                      navigate("/sessions", {
                        replace: true,
                        state: { message: "Your event is no longer available. Please choose another event." }
                      });
                    }
                  } catch (saveError) {
                    setNotice({ type: "error", text: saveError.message });
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="w-full rounded-md bg-[#122924] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#1e3632] disabled:opacity-70"
              >
                {busy ? "ინახება..." : "არჩევანის შენახვა და გაგრძელება"}
              </button>
              {notice && <p role="alert" className="mt-4 text-sm text-red-600">{notice.text}</p>}
            </>
          )}

        </div>
      </section>
    </main>
  );
}

export default VerifyEmail;