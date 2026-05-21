"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import type { TaipeiDay } from "../types";
import { useMode } from "../ModeContext";

function dayImg(dayNum: number, mode: "real" | "fake"): string {
  const variants: Record<number, { real: string; fake: string }> = {
    2: { real: "/days/day2real.png", fake: "/days/day2fake.png" },
    6: { real: "/days/day6real.png", fake: "/days/day6fake.png" },
  };
  if (variants[dayNum]) return variants[dayNum][mode];
  return `/days/day${dayNum}.png`;
}

interface PhotoComment { id: string; body: string; createdAt: string; }
interface PhotoHeading { id: string; dayNum: number; afterIndex: number; label: string; }

// ─── Comments panel (separate modal) ────────────────────────────────────────
function CommentsPanel({ src, count, onClose }: { src: string; count: number; onClose: () => void }) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/taipei/photo-comments?path=${encodeURIComponent(src)}`)
      .then((r) => r.json())
      .then((d) => { setComments(d); setLoaded(true); });
  }, [src]);

  useEffect(() => {
    if (composing) textareaRef.current?.focus();
  }, [composing]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/taipei/photo-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoPath: src, body: draft.trim() }),
    });
    const newComment = await res.json();
    setComments((prev) => [...prev, newComment]);
    setDraft("");
    setSubmitting(false);
    setComposing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1b26] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <span className="text-white/60 text-sm font-semibold">
            {loaded ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "Comments"}
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loaded && comments.length === 0 && <p className="text-white/25 text-sm">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex items-baseline gap-2">
              <p className="text-white/70 text-sm leading-relaxed flex-1">{c.body}</p>
              <span className="text-white/20 text-xs shrink-0">{new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-white/10 shrink-0">
          {composing ? (
            <form onSubmit={submit} className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setComposing(false); setDraft(""); }
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); }
                }}
                placeholder="Write a comment…"
                rows={2}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-400/60 resize-none"
              />
              <div className="flex flex-col gap-1 self-end">
                <button type="submit" disabled={submitting || !draft.trim()} className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">Post</button>
                <button type="button" onClick={() => { setComposing(false); setDraft(""); }} className="text-white/30 hover:text-white/60 text-xs text-center transition-colors">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setComposing(true)} className="text-white/40 hover:text-white/70 text-sm transition-colors">+ Add a comment</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Full-screen image lightbox ──────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
        <Image src={src} alt="" fill className="object-contain" sizes="100vw" />
      </div>
      <button onClick={onClose} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Photo tile ───────────────────────────────────────────────────────────────
function PhotoTile({ src, commentCount, onOpen, onOpenComments, onAddHeadingBefore }: {
  src: string;
  commentCount: number;
  onOpen: () => void;
  onOpenComments: (e: React.MouseEvent) => void;
  onAddHeadingBefore: (label: string) => void;
}) {
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [addingHeading, setAddingHeading] = useState(false);
  const [headingDraft, setHeadingDraft] = useState("");
  const headingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingHeading) headingInputRef.current?.focus(); }, [addingHeading]);

  function submitHeading() {
    if (headingDraft.trim()) onAddHeadingBefore(headingDraft.trim());
    setHeadingDraft("");
    setAddingHeading(false);
  }

  return (
    <div
      className="break-inside-avoid mb-2 rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25 transition-all duration-200 cursor-pointer group relative"
      onClick={onOpen}
    >
      <div
        className="relative w-full"
        style={naturalRatio ? { paddingBottom: `${(1 / naturalRatio) * 100}%` } : { paddingBottom: "75%" }}
      >
        <Image
          src={src} alt="" fill
          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, 25vw"
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.naturalWidth && img.naturalHeight) setNaturalRatio(img.naturalWidth / img.naturalHeight);
          }}
        />

        {/* Hover overlay buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); setAddingHeading(true); }}
            className="bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors"
            title="Add heading before this photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </button>
          <button
            onClick={onOpenComments}
            className="relative bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors"
            title="Comments"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <a
            href={src} download
            onClick={(e) => e.stopPropagation()}
            className="bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors"
            title="Download"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
          </a>
        </div>

        {/* Persistent comment count badge */}
        {commentCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {commentCount}
          </div>
        )}

        {/* Heading input overlay */}
        {addingHeading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2 px-3 w-full max-w-[90%]">
              <input
                ref={headingInputRef}
                value={headingDraft}
                onChange={(e) => setHeadingDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitHeading();
                  if (e.key === "Escape") { setAddingHeading(false); setHeadingDraft(""); }
                }}
                onBlur={() => { submitHeading(); }}
                placeholder="Heading before this photo…"
                className="flex-1 bg-white/10 border border-sky-400/60 rounded-lg px-3 py-1.5 text-white text-sm outline-none text-center placeholder-white/40"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Heading divider ──────────────────────────────────────────────────────────
function HeadingDivider({ heading, afterIndex, dayNum, onAdd, onUpdate, onDelete }: {
  heading: PhotoHeading | undefined;
  afterIndex: number;
  dayNum: number;
  onAdd: (h: PhotoHeading) => void;
  onUpdate: (h: PhotoHeading) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(heading?.label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(heading?.label ?? ""); }, [heading]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function save() {
    setEditing(false);
    if (!draft.trim()) { if (heading) remove(); return; }
    if (heading) {
      const res = await fetch("/api/taipei/photo-headings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: heading.id, label: draft.trim() }) });
      onUpdate(await res.json());
    } else {
      const res = await fetch("/api/taipei/photo-headings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayNum, afterIndex, label: draft.trim() }) });
      onAdd(await res.json());
    }
  }

  async function remove() {
    if (!heading) return;
    setEditing(false);
    await fetch("/api/taipei/photo-headings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: heading.id }) });
    onDelete(heading.id);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-3 my-1">
        <div className="flex-1 h-px bg-white/10" />
        <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(heading?.label ?? ""); } }}
          placeholder="Section heading…"
          className="bg-white/10 border border-sky-400/60 rounded px-3 py-1 text-white text-sm outline-none w-48 text-center"
        />
        {heading && <button onClick={remove} className="text-white/30 hover:text-red-400 text-xs transition-colors">remove</button>}
        <div className="flex-1 h-px bg-white/10" />
      </div>
    );
  }

  if (heading) {
    return (
      <div className="flex items-center gap-4 py-3 my-1 group cursor-pointer" onClick={() => { setDraft(heading.label); setEditing(true); }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="flex-1 h-px bg-white/15" />
        <span className="text-white/70 text-sm font-semibold tracking-wide shrink-0 group-hover:text-white transition-colors">
          {heading.label}{hovered && <span className="ml-2 text-white/30 text-xs font-normal">edit</span>}
        </span>
        <div className="flex-1 h-px bg-white/15" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 my-0.5 cursor-pointer"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => { setDraft(""); setEditing(true); }}>
      <div className={`flex-1 h-px transition-colors ${hovered ? "bg-white/20" : "bg-transparent"}`} />
      <span className={`text-xs transition-all shrink-0 ${hovered ? "text-white/40" : "text-transparent select-none"}`}>+ add heading</span>
      <div className={`flex-1 h-px transition-colors ${hovered ? "bg-white/20" : "bg-transparent"}`} />
    </div>
  );
}


// ─── Photos grid ──────────────────────────────────────────────────────────────
function PhotosGrid({ dayNum }: { dayNum: number }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [headings, setHeadings] = useState<PhotoHeading[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    Promise.all([
      fetch(`/api/taipei/photos?day=${dayNum}`).then((r) => r.json()),
      fetch(`/api/taipei/photo-headings?day=${dayNum}`).then((r) => r.json()),
    ]).then(([p, h]: [string[], PhotoHeading[]]) => {
      setPhotos(p);
      setHeadings(h);
      setLoaded(true);
      // Fetch comment counts for all photos
      Promise.all(p.map((src: string) =>
        fetch(`/api/taipei/photo-comments?path=${encodeURIComponent(src)}`).then((r) => r.json()).then((cs: PhotoComment[]) => [src, cs.length] as [string, number])
      )).then((pairs) => {
        setCommentCounts(Object.fromEntries(pairs));
      });
    });
  }, [dayNum]);

  const headingAt = useCallback((idx: number) => headings.find((h) => h.afterIndex === idx), [headings]);

  function handleAdd(h: PhotoHeading) { setHeadings((prev) => [...prev, h].sort((a, b) => a.afterIndex - b.afterIndex)); }
  function handleUpdate(h: PhotoHeading) { setHeadings((prev) => prev.map((x) => (x.id === h.id ? h : x))); }
  function handleDelete(id: string) { setHeadings((prev) => prev.filter((x) => x.id !== id)); }

  if (!loaded) return null;
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-white/15">
        <p className="text-white/30 text-sm">No photos yet for this day</p>
      </div>
    );
  }

  const dividerProps = { dayNum, onAdd: handleAdd, onUpdate: handleUpdate, onDelete: handleDelete };

  // Build sections split by headings
  type Section = { startAfter: number; photos: string[] };
  const sections: Section[] = [];
  let sec: Section = { startAfter: 0, photos: [] };
  for (let i = 0; i < photos.length; i++) {
    sec.photos.push(photos[i]);
    if (headingAt(i + 1) && i < photos.length - 1) {
      sections.push(sec);
      sec = { startAfter: i + 1, photos: [] };
    }
  }
  sections.push(sec);

  return (
    <>
      <HeadingDivider heading={headingAt(0)} afterIndex={0} {...dividerProps} />

      {sections.map((section, si) => (
        <div key={section.startAfter}>
          <div className="columns-2 sm:columns-3 md:columns-4 gap-2 mb-2">
            {section.photos.map((src, localIdx) => {
              const globalIdx = section.startAfter + localIdx;
              return (
                <PhotoTile
                  key={src}
                  src={src}
                  commentCount={commentCounts[src] ?? 0}
                  onOpen={() => setLightbox(src)}
                  onOpenComments={(e) => { e.stopPropagation(); setCommentsFor(src); }}
                  onAddHeadingBefore={async (label) => {
                    const res = await fetch("/api/taipei/photo-headings", {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ dayNum, afterIndex: globalIdx, label }),
                    });
                    handleAdd(await res.json());
                  }}
                />
              );
            })}
          </div>

          {si < sections.length - 1 && (
            <HeadingDivider
              heading={headingAt(section.startAfter + section.photos.length)}
              afterIndex={section.startAfter + section.photos.length}
              {...dividerProps}
            />
          )}
        </div>
      ))}

      <HeadingDivider heading={headingAt(photos.length)} afterIndex={photos.length} {...dividerProps} />

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {commentsFor && (
        <CommentsPanel
          src={commentsFor}
          count={commentCounts[commentsFor] ?? 0}
          onClose={() => setCommentsFor(null)}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PhotosPage() {
  const { mode } = useMode();
  const [days, setDays] = useState<TaipeiDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/taipei/days?mode=${mode}`)
      .then((r) => r.json())
      .then((data) => { setDays(data); setLoading(false); });
  }, [mode]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-white/50 text-lg">Loading…</div></div>;
  }

  const current = days[activeDay];

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide px-2">
        {days.map((day, i) => {
          const active = i === activeDay;
          const src = dayImg(day.dayNum, mode);
          return (
            <button key={day.id} onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all border ${active ? "border-sky-400 shadow-lg shadow-sky-500/30 bg-sky-500/20" : "border-white/10 hover:border-white/30 bg-white/5"}`}>
              <div className={`relative w-14 h-14 rounded-lg overflow-hidden transition-all ${active ? "" : "opacity-60 hover:opacity-90"}`}>
                <Image src={src} alt={day.label} fill className="object-cover" />
              </div>
              <div className="text-center leading-tight">
                <div className={`text-xs font-semibold ${active ? "text-sky-300" : "text-white/60"}`}>{day.label}</div>
                <div className="text-[10px] text-white/35">{day.date.split(",")[1]?.trim().split(" ").slice(0, 2).join(" ") || ""}</div>
              </div>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="flex items-center gap-3 flex-wrap mb-6 px-2">
          <span className="bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">{current.label}</span>
          <span className="text-white/50 text-sm">{current.date}</span>
        </div>
      )}

      {current && <PhotosGrid dayNum={current.dayNum} />}
    </div>
  );
}
