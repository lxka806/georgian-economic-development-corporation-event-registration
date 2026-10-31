
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0D2826] text-white flex items-center justify-center px-6 py-10">

      {/* Background effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#FFD700]/10 blur-[100px]" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#b33922]/10 blur-[100px]" />

      {/* Decorative circles */}
      <div className="absolute top-[15%] right-[15%] w-24 h-24 border border-[#FFD700]/20 rounded-full animate-[spin_20s_linear_infinite] hidden md:block" />
      <div className="absolute bottom-[18%] left-[12%] w-16 h-16 border border-white/10 rounded-2xl rotate-12 animate-pulse hidden md:block" />

      {/* Main content */}
      <main className="relative z-10 w-full max-w-4xl text-center">

        {/* Event badge */}

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight animate-[fadeUp_0.8s_ease-out_both]">
          სამეგრელოს ბიზნესის დღე
          <br />
        </h1>

        {/* Description */}


        {/* CTA */}
        <div className="mt-9 flex flex-col items-center gap-4 animate-[fadeUp_1.3s_ease-out_both]">
          <button
            onClick={() => navigate("/register")}
            className="group relative inline-flex items-center justify-center gap-4 overflow-hidden rounded-xl bg-[#FFD700] px-9 py-4 font-bold text-lg text-[#0D2826] shadow-lg shadow-[#FFD700]/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFD700]/20 active:translate-y-0"
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-white/25 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-[120%]" />
            <span className="relative">გაიარე რეგისტრაცია</span>
            <span className="relative text-xl transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>

          <p className="text-xs text-white/35">
                      განვითარების ყველა ეტაპზე
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <div className="w-12 h-px bg-white/15" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700]/60" />
          <div className="w-12 h-px bg-white/15" />
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;
