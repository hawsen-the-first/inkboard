import { useCallback, useEffect, useRef, useState } from 'react';
import './CanvasDrawing.css';

interface Point { x: number; y: number; }

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  eraser: boolean;
}

export interface CanvasData {
  version: 2;
  strokes: Stroke[];
}

interface Transform { x: number; y: number; scale: number; }

interface CanvasDrawingProps {
  initialData: string | null;
  onSave: (imageData: string) => void;
  onCancel: () => void;
}

const COLORS = ['#111827', '#1d4ed8', '#dc2626', '#16a34a', '#d97706', '#7c3aed'];
const DOT_SPACING = 28;
const DOT_RADIUS = 1.5;
const DOT_COLOR = 'rgba(100, 100, 140, 0.4)';
const BG_COLOR = '#f9f9fc';
const MIN_SCALE = 0.15;
const MAX_SCALE = 8;

function worldToScreen(p: Point, t: Transform): Point {
  return { x: p.x * t.scale + t.x, y: p.y * t.scale + t.y };
}

function screenToWorld(sx: number, sy: number, t: Transform): Point {
  return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
}

function drawDots(ctx: CanvasRenderingContext2D, t: Transform, w: number, h: number) {
  const worldLeft = -t.x / t.scale;
  const worldTop = -t.y / t.scale;
  const worldRight = (w - t.x) / t.scale;
  const worldBottom = (h - t.y) / t.scale;
  const startX = Math.floor(worldLeft / DOT_SPACING) * DOT_SPACING;
  const startY = Math.floor(worldTop / DOT_SPACING) * DOT_SPACING;
  ctx.fillStyle = DOT_COLOR;
  for (let wx = startX; wx <= worldRight + DOT_SPACING; wx += DOT_SPACING) {
    for (let wy = startY; wy <= worldBottom + DOT_SPACING; wy += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(wx * t.scale + t.x, wy * t.scale + t.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, t: Transform) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = stroke.eraser ? BG_COLOR : stroke.color;
  ctx.lineWidth = stroke.width * t.scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const p0 = worldToScreen(stroke.points[0], t);
  if (stroke.points.length === 1) {
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, (stroke.width * t.scale) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.eraser ? BG_COLOR : stroke.color;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p = worldToScreen(stroke.points[i], t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export const CanvasDrawing = ({ initialData, onSave, onCancel }: CanvasDrawingProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const lastPanCenterRef = useRef<Point | null>(null);
  const rafRef = useRef<number | null>(null);
  const isFirstMountRef = useRef(true);

  const [strokeColor, setStrokeColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraseMode, setEraseMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toolRef = useRef({ color: COLORS[0], width: 4, eraser: false });
  useEffect(() => {
    toolRef.current = { color: strokeColor, width: strokeWidth, eraser: eraseMode };
  }, [strokeColor, strokeWidth, eraseMode]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const t = transformRef.current;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    drawDots(ctx, t, w, h);

    for (const stroke of strokesRef.current) renderStroke(ctx, stroke, t);
    if (currentStrokeRef.current) renderStroke(ctx, currentStrokeRef.current, t);

    ctx.restore();
  }, []);

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      render();
    });
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        if (isFirstMountRef.current) {
          isFirstMountRef.current = false;
          transformRef.current = { x: width / 2, y: height / 2, scale: 1 };
        }
        scheduleRender();
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [scheduleRender]);

  useEffect(() => {
    strokesRef.current = [];
    isFirstMountRef.current = true;
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData) as CanvasData;
        if (parsed.version === 2 && Array.isArray(parsed.strokes)) {
          strokesRef.current = parsed.strokes;
        }
      } catch {
        // start fresh
      }
    }
    scheduleRender();
  }, [initialData, scheduleRender]);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: PointerEvent): Point => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      activePointersRef.current.set(e.pointerId, pos);

      if (activePointersRef.current.size === 1) {
        const tool = toolRef.current;
        currentStrokeRef.current = {
          points: [screenToWorld(pos.x, pos.y, transformRef.current)],
          color: tool.eraser ? BG_COLOR : tool.color,
          width: tool.eraser ? tool.width * 3 : tool.width,
          eraser: tool.eraser,
        };
      } else if (activePointersRef.current.size === 2) {
        if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
          strokesRef.current.push(currentStrokeRef.current);
        }
        currentStrokeRef.current = null;
        const [p1, p2] = [...activePointersRef.current.values()];
        lastPinchDistRef.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        lastPanCenterRef.current = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
      scheduleRender();
    };

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!activePointersRef.current.has(e.pointerId)) return;
      const pos = getPos(e);
      activePointersRef.current.set(e.pointerId, pos);
      const count = activePointersRef.current.size;

      if (count === 1 && currentStrokeRef.current) {
        currentStrokeRef.current.points.push(screenToWorld(pos.x, pos.y, transformRef.current));
      } else if (count === 2) {
        const [p1, p2] = [...activePointersRef.current.values()];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (lastPinchDistRef.current !== null && lastPanCenterRef.current !== null) {
          const scaleDelta = dist / lastPinchDistRef.current;
          const panDx = midX - lastPanCenterRef.current.x;
          const panDy = midY - lastPanCenterRef.current.y;
          const t = transformRef.current;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * scaleDelta));
          const ratio = newScale / t.scale;
          transformRef.current = {
            x: midX + (t.x - midX) * ratio + panDx,
            y: midY + (t.y - midY) * ratio + panDy,
            scale: newScale,
          };
        }
        lastPinchDistRef.current = dist;
        lastPanCenterRef.current = { x: midX, y: midY };
      }
      scheduleRender();
    };

    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      if (activePointersRef.current.size === 1 && currentStrokeRef.current) {
        strokesRef.current.push(currentStrokeRef.current);
        currentStrokeRef.current = null;
      }
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) {
        lastPinchDistRef.current = null;
        lastPanCenterRef.current = null;
      }
      scheduleRender();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const t = transformRef.current;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * factor));
      const ratio = newScale / t.scale;
      transformRef.current = { x: px + (t.x - px) * ratio, y: py + (t.y - py) * ratio, scale: newScale };
      scheduleRender();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [scheduleRender]);

  const undo = () => {
    if (strokesRef.current.length > 0) {
      strokesRef.current = strokesRef.current.slice(0, -1);
      scheduleRender();
    }
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    scheduleRender();
  };

  const resetView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    transformRef.current = { x: canvas.width / dpr / 2, y: canvas.height / dpr / 2, scale: 1 };
    scheduleRender();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void surfaceRef.current?.requestFullscreen();
    }
  };

  const handleSave = () => {
    onSave(JSON.stringify({ version: 2, strokes: strokesRef.current } satisfies CanvasData));
  };

  return (
    <div ref={surfaceRef} className="canvas-drawing">
      <div className="canvas-drawing__toolbar">
        <div className="canvas-drawing__colors">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`canvas-drawing__color ${strokeColor === color && !eraseMode ? 'canvas-drawing__color--active' : ''}`}
              style={{ background: color }}
              onClick={() => {
                setStrokeColor(color);
                setEraseMode(false);
              }}
              aria-label={`Use ${color} ink`}
            />
          ))}
        </div>

        <label className="canvas-drawing__range">
          Width
          <input type="range" min="2" max="14" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} />
        </label>

        <button type="button" className={!eraseMode ? 'canvas-drawing__tool--active' : ''} onClick={() => setEraseMode(false)}>
          ✏️ Pen
        </button>
        <button type="button" className={eraseMode ? 'canvas-drawing__tool--active' : ''} onClick={() => setEraseMode(true)}>
          ◻ Eraser
        </button>
        <button type="button" onClick={undo}>↩ Undo</button>
        <button type="button" onClick={clearCanvas}>🗑 Clear</button>
        <button type="button" onClick={resetView} title="Reset zoom and pan">⊙ Reset</button>
        <button type="button" onClick={toggleFullscreen}>{isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}</button>
      </div>

      <div className="canvas-drawing__surface">
        <canvas ref={canvasRef} className="canvas-drawing__canvas" />
        <div className="canvas-drawing__hint">✏️ Draw · 👌 2 fingers to pan &amp; zoom</div>
      </div>

      <div className="canvas-drawing__footer">
        <div className="canvas-drawing__footer-actions">
          <button type="button" className="canvas-drawing__ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="canvas-drawing__save" onClick={handleSave}>Save sketch</button>
        </div>
      </div>
    </div>
  );
};
