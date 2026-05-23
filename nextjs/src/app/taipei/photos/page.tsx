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

// ─── Comments panel ──────────────────────────────────────────────────────────
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

  useEffect(() => { if (composing) textareaRef.current?.focus(); }, [composing]);

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
function PhotoTile({ src, commentCount, canMoveUp, canMoveDown, onOpen, onOpenComments, onMoveUp, onMoveDown }: {
  src: string;
  commentCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOpen: () => void;
  onOpenComments: (e: React.MouseEvent) => void;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
}) {
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  return (
    <div
      className="break-inside-avoid mb-2 rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25 transition-all duration-200 cursor-pointer relative group"
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

        {/* Up/down arrows — top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          {canMoveUp && (
            <button
              onClick={onMoveUp}
              className="bg-black/60 hover:bg-black/90 text-white rounded-full p-1 transition-colors"
              title="Move up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {canMoveDown && (
            <button
              onClick={onMoveDown}
              className="bg-black/60 hover:bg-black/90 text-white rounded-full p-1 transition-colors"
              title="Move down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Comments + download — top right */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
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

        {commentCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {commentCount}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Photos grid ──────────────────────────────────────────────────────────────
function PhotosGrid({ dayNum }: { dayNum: number }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    setLoaded(false);
    fetch(`/api/taipei/photos?day=${dayNum}`)
      .then((r) => r.json())
      .then((p: string[]) => {
        setPhotos(p);
        setLoaded(true);
        Promise.all(p.map((src: string) =>
          fetch(`/api/taipei/photo-comments?path=${encodeURIComponent(src)}`).then((r) => r.json()).then((cs: PhotoComment[]) => [src, cs.length] as [string, number])
        )).then((pairs) => setCommentCounts(Object.fromEntries(pairs)));
      });
  }, [dayNum]);

  const saveOrder = useCallback(async (newOrder: string[]) => {
    await fetch("/api/taipei/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNum, order: newOrder }),
    });
  }, [dayNum]);

  function move(idx: number, delta: -1 | 1, e: React.MouseEvent) {
    e.stopPropagation();
    const to = idx + delta;
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[idx], next[to]] = [next[to], next[idx]];
    setPhotos(next);
    saveOrder(next);
  }

  function onDragStart(idx: number) { dragIndexRef.current = idx; }
  function onDragEnter(idx: number) { setDragOver(idx); }
  function onDragEnd() {
    const from = dragIndexRef.current;
    const to = dragOver;
    if (from !== null && to !== null && from !== to) {
      const next = [...photos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setPhotos(next);
      saveOrder(next);
    }
    dragIndexRef.current = null;
    setDragOver(null);
  }

  if (!loaded) return null;
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-white/15">
        <p className="text-white/30 text-sm">No photos yet for this day</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 md:columns-4 gap-2">
        {photos.map((src, idx) => (
          <div
            key={src}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={onDragEnd}
            className={`transition-opacity ${dragOver === idx && dragIndexRef.current !== idx ? "opacity-40" : "opacity-100"}`}
          >
            <PhotoTile
              src={src}
              commentCount={commentCounts[src] ?? 0}
              canMoveUp={idx > 0}
              canMoveDown={idx < photos.length - 1}
              onOpen={() => setLightbox(src)}
              onOpenComments={(e) => { e.stopPropagation(); setCommentsFor(src); }}
              onMoveUp={(e) => move(idx, -1, e)}
              onMoveDown={(e) => move(idx, 1, e)}
            />
          </div>
        ))}
      </div>

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
