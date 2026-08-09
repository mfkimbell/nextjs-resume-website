"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, PencilLine, ArrowLeft } from "lucide-react";
import CanvasBoard from "./CanvasBoard";

const CONTACT_IMAGE = "/signs/contactme.png";
const MAILTO =
  "mailto:mfkimbell@gmail.com?subject=Portfolio%20contact&body=Hi%20Mitch%2C%0D%0A%0D%0AI%20saw%20your%20portfolio%20and%20wanted%20to%20reach%20out.%0D%0A%0D%0A";

interface ContactSignProps {
  visits: number;
  clicks: number;
  mouseMiles: number;
}

export default function ContactSign({ visits, clicks, mouseMiles }: ContactSignProps) {
  const [mode, setMode] = useState<"menu" | "sketch">("menu");

  return (
    <div
      className="relative z-10 mx-auto w-[min(92vw,620px)]"
      style={{ aspectRatio: "1162 / 1354" }}
    >
      <Image
        src={CONTACT_IMAGE}
        alt="Contact Mitch sign"
        fill
        priority
        sizes="(max-width: 640px) 92vw, 620px"
        className="pointer-events-none select-none object-contain"
      />

      {/* Bright tan board interior. Percentages are based on contactme.png's native frame. */}
      <div
        className="absolute flex flex-col items-center justify-center overflow-hidden rounded-sm px-4 py-4 text-center"
        style={{
          top: "13%",
          right: "17.2%",
          bottom: "27.2%",
          left: "17.2%",
        }}
      >
        {mode === "menu" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-5 sm:gap-7">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-950/65">
                Contact
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-amber-950 drop-shadow-sm sm:text-5xl">
                Mitch
              </h2>
            </div>

            <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href={MAILTO}
                className="group relative flex min-h-32 rotate-[-2deg] flex-col items-center justify-center gap-2 rounded-[3px] bg-[#fff4cf] px-5 py-5 text-lg font-black text-amber-950 shadow-[0_10px_20px_rgba(71,34,10,0.28)] ring-1 ring-amber-900/15 transition hover:-translate-y-1 hover:rotate-[-1deg] active:translate-y-0 sm:text-2xl"
              >
                <span className="pointer-events-none absolute left-1/2 top-1.5 h-4 w-14 -translate-x-1/2 rotate-2 rounded-sm bg-amber-100/80 shadow-sm ring-1 ring-amber-900/10" />
                <Mail className="h-7 w-7 text-amber-950/80 transition group-hover:rotate-[-8deg] sm:h-9 sm:w-9" />
                Email Mitch
              </a>

              <button
                type="button"
                onClick={() => setMode("sketch")}
                className="group relative flex min-h-32 rotate-[2deg] flex-col items-center justify-center gap-2 rounded-[3px] bg-[#fff4cf] px-5 py-5 text-lg font-black text-amber-950 shadow-[0_10px_20px_rgba(71,34,10,0.28)] ring-1 ring-amber-900/15 transition hover:-translate-y-1 hover:rotate-1 active:translate-y-0 sm:text-2xl"
              >
                <span className="pointer-events-none absolute left-1/2 top-1.5 h-4 w-14 -translate-x-1/2 rotate-[-2deg] rounded-sm bg-amber-100/80 shadow-sm ring-1 ring-amber-900/10" />
                <PencilLine className="h-7 w-7 text-amber-950/80 transition group-hover:rotate-[-10deg] sm:h-9 sm:w-9" />
                Sketch
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full min-h-0 flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-amber-950">
              <button
                type="button"
                onClick={() => setMode("menu")}
                className="flex items-center gap-1 rounded-full bg-amber-950/10 px-3 py-1.5 text-xs font-bold hover:bg-amber-950/20"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <p className="text-sm font-black uppercase tracking-[0.16em] sm:text-base">
                Leave a sketch
              </p>
            </div>

            <div className="relative min-h-0 flex-1 rounded-[3px] bg-[#fff4cf] p-2 shadow-[0_10px_20px_rgba(71,34,10,0.24)] ring-1 ring-amber-900/15">
              <span className="pointer-events-none absolute left-1/2 top-1 h-3 w-16 -translate-x-1/2 rotate-1 rounded-sm bg-amber-100/80 shadow-sm ring-1 ring-amber-900/10" />
              <CanvasBoard
                visits={visits}
                clicks={clicks}
                mouseMiles={mouseMiles}
                embedded
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
