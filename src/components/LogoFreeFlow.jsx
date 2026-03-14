import React from "react";
import logoPng from "../assets/Freeflowlogo.png";

export default function LogoFreeFlow() {
  return (
    <div className="flex items-center" aria-label="FreeFlow">
      <img
        src={logoPng}
        alt="FreeFlow"
        className="h-auto w-[min(15rem,58vw)] select-none object-contain drop-shadow-[0_0_22px_rgba(255,145,0,0.18)] md:w-[18rem]"
        draggable={false}
      />
    </div>
  );
}
