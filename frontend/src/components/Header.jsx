import React from "react";
import logo from "../assets/logo.png"


export default function Header() {
  return (
    <header className="bg-[#142924] w-full py-3 px-6 md:px-8 flex items-center justify-start gap-3">
      <img src={logo} alt="" className="w-9" />
      {/* Text */}
      <div className="flex flex-col text-[#d1d5db]">
        <span className="text-[9px] uppercase tracking-widest font-medium opacity-80">სს საქართველოს ეკონომიკის <br /> განვითარების კორპორაცია</span>
      </div>
    </header>
  );
}