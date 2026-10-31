import { Link } from "react-router-dom";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4 font-sans text-gray-800">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mt-10 h-fit">
        
        {/* HEADER */}
        <div className="bg-[#1e3632] text-white p-6 md:p-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide">
            სამეგრელოს ბიზნესის დღე 2026
          </h1>
        </div>

        {/* STEPPER (All Completed) */}
        <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 text-[11px] font-bold text-[#122924]">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>მონაცემები</span>
          </div>
          <div className="h-px bg-[#122924] w-6 mx-2"></div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>პროგრამა</span>
          </div>
          <div className="h-px bg-[#122924] w-6 mx-2"></div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#122924] text-white">✓</span>
            <span>დადასტურება</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-10 text-center flex flex-col items-center">
          
          {/* Big Success Checkmark */}
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#e6f4ea] text-[#137333] mb-8">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-3xl font-extrabold text-[#1e3632] mb-4">
            მადლობა!
          </h2>
          
          <div className="flex flex-col">
            <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
            თქვენ წარმატებით დაასრულეთ რეგისტრაცია სამეგრელოს ბიზნესის დღეზე. 
            
          </p>
          <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
            გელოდებით ღონისძიებაზე 25 ნოემბერს!
          </p>
          </div>

          <Link 
            to="/"
            className="text-[#b33922] font-semibold hover:underline"
          >
            მთავარ გვერდზე დაბრუნება
          </Link>

        </div>
      </div>
    </div>
  );
}