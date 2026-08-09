/* ------------------------------------------------------------------
   CanvasBoard – live-updating drawing canvas + metrics
-------------------------------------------------------------------*/
"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate as mutateGlobal } from "swr";
import { Eraser, Save, Trash2, RotateCcw } from "lucide-react";
import { SIGN_CONFIG } from "@/config/signs";
import { drawPaintStroke, type PaintPoint } from "@/lib/paint";

/* ---------- types & constants ---------- */
type Point = PaintPoint;
type Stroke = { pts: Point[]; color: string; width: number; erase?: boolean; submissionId?: string };

// Add history state type
type CanvasState = {
  savedStrokes: Stroke[];
  pendingStrokes: Stroke[];
  action: 'draw' | 'clear' | 'save';
};

const COLORS = [
  "#ffffff", "#000000", "#ff0000",
  "#00a83e", "#0055ff", "#ffa800", "#9400d3",
];
const fetcher = (url: string) => fetch(url).then(r => r.json());

interface CanvasBoardProps {
  visits: number;
  clicks: number;
  mouseMiles: number;
  embedded?: boolean;
}

/* ================================================================= */
export default function CanvasBoard({ visits, clicks, mouseMiles, embedded = false }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const { data, mutate } = useSWR<{ strokes: Stroke[] }>("/api/drawings", fetcher, { refreshInterval: 3000 });

  const [pending, setPending] = useState<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedModal, setSavedModal] = useState<{ author: string } | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Add history state
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Helper function to save current state to history
  const saveToHistory = (action: 'draw' | 'clear' | 'save') => {
    const currentState: CanvasState = {
      savedStrokes: Array.isArray(data?.strokes) ? [...data!.strokes] : [],
      pendingStrokes: [...pending],
      action
    };

    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(currentState);
      // Limit history to last 50 states to prevent memory issues
      return newHistory.slice(-50);
    });

    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  /* ---------- Hi-DPI square canvas ---------- */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const setup = () => {
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.lineCap = ctx.lineJoin = "round";
      ctxRef.current = ctx;
      redraw();
    };

    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [redraw]);

  useEffect(redraw, [data, pending, redraw]);

  /* ---------- prevent scroll during canvas interaction ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent all touch-based scrolling on the canvas itself
    const preventCanvasScroll = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add touch event listeners directly to canvas
    canvas.addEventListener('touchstart', preventCanvasScroll, { passive: false });
    canvas.addEventListener('touchmove', preventCanvasScroll, { passive: false });
    canvas.addEventListener('touchend', preventCanvasScroll, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventCanvasScroll);
      canvas.removeEventListener('touchmove', preventCanvasScroll);
      canvas.removeEventListener('touchend', preventCanvasScroll);
    };
  }, []);

  /* ---------- pointer helpers ---------- */
  const loc = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const pointer = e.nativeEvent as PointerEvent;
    return {
      x: pointer.offsetX,
      y: pointer.offsetY,
      pressure: pointer.pressure && pointer.pressure > 0 ? pointer.pressure : 0.62,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent any default touch behaviors
    const stroke: Stroke = { pts: [loc(e)], color, width: size, erase: eraser };
    currentRef.current = stroke;
    setPending(lst => [...lst, stroke]);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent any default touch behaviors
    const stroke = currentRef.current;
    if (!stroke) return;
    stroke.pts.push(loc(e));
    redraw();
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent any default touch behaviors
    currentRef.current = null;
  };

  /* ---------- actions ---------- */
  const save = async () => {
    const cleanAuthor = author.trim().replace(/\s+/g, " ");
    if (!pending.length || saving) return;

    if (!cleanAuthor) {
      setSaveError("Add your name before saving.");
      return;
    }

    // The existing API column is `name`; it now stores the drawing author's name.
    const name = cleanAuthor;

    // Save current state before making changes
    saveToHistory('save');
    setSaving(true);
    setSaveError(null);

    const strokesToSave = pending;
    const canvasSize = Math.round(canvasRef.current?.clientWidth || SIGN_CONFIG.canvasWidth);
    const canvasHeight = Math.round(canvasRef.current?.clientHeight || SIGN_CONFIG.canvasHeight);

    try {
      const galleryResponse = await fetch("/api/drawing-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, strokes: strokesToSave, canvasSize, canvasHeight }),
      });

      const galleryBody = await galleryResponse.json().catch(() => null);

      if (!galleryResponse.ok) {
        throw new Error(galleryBody?.error || "Could not upload drawing.");
      }

      const submissionId = galleryBody?.drawing?.id;
      const boardStrokes = submissionId
        ? strokesToSave.map((stroke) => ({ ...stroke, submissionId }))
        : strokesToSave;

      const boardResponse = await fetch("/api/drawings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStrokes: boardStrokes }),
      });

      if (!boardResponse.ok) {
        const body = await boardResponse.json().catch(() => null);
        throw new Error(body?.error || "Could not save drawing to the shared canvas.");
      }

      setPending([]);
      setSavedModal({ author: cleanAuthor });
      setAuthor("");
      setShowSaveDialog(false);
      mutate();
      mutateGlobal("/api/drawing-submissions");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save drawing.");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    // Save current state before clearing
    saveToHistory('clear');

    await fetch("/api/drawings", { method: "DELETE" });
    setPending([]);
    mutate({ strokes: [] }, false);
  };

  const undo = async () => {
    if (pending.length > 0) {
      // If there are pending strokes, remove the last one
      setPending(lst => lst.slice(0, -1));
    } else if (historyIndex >= 0) {
      // If no pending strokes, try to restore from history
      const previousState = history[historyIndex];

      if (previousState) {
        // Restore the saved strokes to the database
        if (previousState.savedStrokes.length > 0) {
          await fetch("/api/drawings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newStrokes: previousState.savedStrokes }),
          });
        } else {
          // If previous state had no saved strokes, clear the database
          await fetch("/api/drawings", { method: "DELETE" });
        }

        // Restore pending strokes
        setPending(previousState.pendingStrokes);

        // Update local data and move history index back
        mutate({ strokes: previousState.savedStrokes }, false);
        setHistoryIndex(prev => prev - 1);
      }
    }
  };

  /* ---------- drawing ---------- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function redraw() {
    const ctx = ctxRef.current, cvs = canvasRef.current;
    if (!ctx || !cvs) return;

    ctx.clearRect(0, 0, cvs.clientWidth || cvs.width, cvs.clientHeight || cvs.height);
    const base = Array.isArray(data?.strokes) ? data!.strokes : [];

    [...base, ...pending].forEach((stroke) => {
      drawPaintStroke(ctx, stroke);
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  /* ---------- UI bits ---------- */
  const Tools = (
    <div className="flex flex-col gap-2 h-8">
      <div className="flex items-center gap-2 ">
        <button title="Eraser" onClick={() => setEraser(e => !e)}
          className={`p-2 ml-1.5 rounded-full ${eraser ? "bg-gray-600" : "bg-gray-800"} hover:bg-gray-700`}>
          <Eraser size={16} className="text-white" />
        </button>
        <button title="Undo" onClick={undo} className="p-2 ml-0.5 bg-yellow-500 hover:bg-yellow-600 rounded-full text-white"><RotateCcw size={16} /></button>
        <button
          title="Save"
          onClick={() => {
            if (!pending.length || saving) return;
            setSaveError(null);
            setShowSaveDialog(true);
          }}
          disabled={saving || !pending.length}
          className="p-2 ml-0.5 bg-blue-500 hover:bg-blue-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
        </button>
        <button title="Clear" onClick={clearAll} className="p-2 ml-0.5 bg-red-500    hover:bg-red-600    rounded-full text-white"><Trash2 size={16} /></button>
      </div>
    </div>
  );

  const Palette = (
    <div className="flex justify-center gap-2 sm:mb-4">
      {COLORS.map(c => (
        <button
          key={c}
          onClick={() => { setColor(c); setEraser(false); }}
          style={{ backgroundColor: c, borderColor: "white" }}
          className={`h-6 w-6 rounded-full border-2 ${!eraser && c === color ? "ring-2 ring:white" : ""}`}
        />
      ))}
    </div>
  );

  const Slider = (
    <div className="relative w-full max-w-[16rem] mx-auto flex items-center sm:mb-2">
      {/* range track */}
      <input
        type="range"
        min={2}
        max={40}
        value={size}
        onChange={e => setSize(+e.target.value)}
        className="flex-1 accent-blue-500 h-1"
      />

      {/* fixed 48×48 wrapper keeps the center locked */}
      <div className="absolute sm:-top-26  sm:right-2 -right-12 w-8 h-8 flex items-center justify-center border-2 rounded-full">
        <div
          className="rounded-full transition-all"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            maxWidth: '90%',
            maxHeight: '90%',
          }}
        />
      </div>
    </div>
  );

  /* ================================================================= */
  /*                              render                               */
  /* ================================================================= */
  return (
    <div className={embedded ? "h-full w-full" : "w-full mb-3"} style={{ touchAction: embedded ? 'none' : 'pan-y' }}>
      {/* Use props in a minimal way to satisfy linter */}
      <div style={{ display: 'none' }}>
        {visits && null}
        {clicks && null}
        {mouseMiles && null}
      </div>
      <div className={embedded ? "h-full w-full" : "flex justify-center w-full"}>
        {/* ------------- card + sidebar wrapper ------------- */}
        <div className={embedded ? "relative h-full w-full" : "relative"} style={{ touchAction: 'none' }}> {/* relative only hugs the card */}
        {/* === Drawing card === */}
        <div
          className={
            embedded
              ? "h-full w-full mx-auto rounded-lg flex flex-col justify-start gap-2 mb-0"
              : "w-full p-4 mx-auto bg-white/10 backdrop-blur-lg shadow-lg border border-white/20 rounded-xl flex flex-col gap-4 mb-0"
          }
          style={{
            maxWidth: embedded ? '100%' : `${SIGN_CONFIG.canvasWidth + 32}px`,
            touchAction: 'none',
            overflowX: 'hidden',
            overflowY: 'hidden'
          }}>
          <canvas
            ref={canvasRef}
            style={{
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              overscrollBehavior: 'none',
              position: 'relative',
              aspectRatio: `${SIGN_CONFIG.canvasWidth} / ${SIGN_CONFIG.canvasHeight}`,
              width: embedded ? "auto" : undefined,
              height: embedded ? "100%" : undefined,
              maxWidth: "100%",
              minHeight: 0,
            } as React.CSSProperties}
            className={embedded ? "min-h-0 flex-1 self-center bg-[#fffdf4] rounded-md border-2 border-amber-900/35 shadow-inner" : "w-full bg-[#fffdf4] rounded-md border-2 border-white shadow-inner"}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            onTouchStart={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
            onTouchEnd={(e) => e.preventDefault()}
          />
          <div
            id="ios-controls"
            className={embedded ? "flex flex-col items-center gap-2" : "sm:hidden flex flex-col items-center gap-4"}
            style={{ touchAction: 'manipulation' }}
          >
            {Palette}
            {Slider}

            <div className="flex justify-center">{Tools}</div>
          </div>
        </div>

        {/* === Sidebar === */}
        <div
          id="sidebar"
          className={embedded ? "hidden" : "hidden sm:flex flex-col gap-4 w-58 absolute left-full ml-6 top-0"}>
          <div className="p-2 bg-white/20 rounded">{Tools}</div>
          <div className="p-2 bg-white/20 rounded">
            {Palette}
            {Slider}
          </div>
        </div>
        </div>
      </div>

      {showSaveDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doodle-save-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            if (!saving) {
              setShowSaveDialog(false);
              setSaveError(null);
            }
          }}
        >
          <form
            className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <h2 id="doodle-save-title" className="text-lg font-semibold">
              Sign your doodle
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="drawing-author" className="mb-1 block text-sm font-medium text-gray-800">
                  Author
                </label>
                <input
                  id="drawing-author"
                  type="text"
                  value={author}
                  autoFocus
                  onChange={(event) => {
                    setAuthor(event.target.value);
                    setSaveError(null);
                  }}
                  maxLength={40}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-300/50"
                />
              </div>
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveError(null);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !author.trim()}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {savedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doodle-saved-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSavedModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="doodle-saved-title" className="text-lg font-semibold">
              Saved to the doodle wall
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              Signed by <span className="font-medium">{savedModal.author}</span>.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSavedModal(null)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}