"use client";

import { useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import type { PhotoRow } from "@/lib/types";

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Props {
  photos: PhotoRow[];
}

export default function ProgressGallery({ photos }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [afterIdx, setAfterIdx] = useState(Math.max(0, photos.length - 1));
  const [pos, setPos] = useState(50); // divider position, 0–100
  const dragRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const before = photos[beforeIdx];
  const after = photos[afterIdx];

  const moveTo = (clientX: number) => {
    const el = dragRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  return (
    <>
      {photos.length >= 2 && before && after && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ padding: 0, marginBottom: 14 }}>
            <span>Before → After</span>
            <span className="card-sub">drag the divider to compare</span>
          </div>

          <div className="ba-pickers">
            <label>
              Before
              <select
                value={beforeIdx}
                onChange={(e) => setBeforeIdx(Number(e.target.value))}
              >
                {photos.map((p, i) => (
                  <option key={i} value={i}>
                    {shortDate(p.date)}
                    {p.caption ? ` · ${p.caption}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              After
              <select
                value={afterIdx}
                onChange={(e) => setAfterIdx(Number(e.target.value))}
              >
                {photos.map((p, i) => (
                  <option key={i} value={i}>
                    {shortDate(p.date)}
                    {p.caption ? ` · ${p.caption}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            ref={dragRef}
            className="ba-stage"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              moveTo(e.clientX);
            }}
            onPointerMove={(e) => {
              if (dragging.current) moveTo(e.clientX);
            }}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            {/* before = base layer */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="ba-img"
              src={before.imageUrl}
              alt={`Before — ${before.date}`}
              referrerPolicy="no-referrer"
              draggable={false}
            />
            {/* after = clipped top layer, revealed from the divider rightward */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="ba-img ba-after"
              src={after.imageUrl}
              alt={`After — ${after.date}`}
              referrerPolicy="no-referrer"
              draggable={false}
              style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
            />
            <span className="ba-tag ba-tag-l">{shortDate(before.date)}</span>
            <span className="ba-tag ba-tag-r">{shortDate(after.date)}</span>
            <div className="ba-divider" style={{ left: `${pos}%` }}>
              <span className="ba-handle">⟷</span>
            </div>
          </div>
        </div>
      )}

      {/* thumbnail timeline */}
      <div className="card">
        <div className="card-title" style={{ padding: 0, marginBottom: 14 }}>
          <span>Timeline</span>
          <span className="card-sub">
            {photos.length} photo{photos.length === 1 ? "" : "s"} · newest last
          </span>
        </div>
        <div className="thumb-strip">
          {photos.map((p, i) => (
            <button
              key={i}
              className="thumb"
              onClick={() => setLightbox(i)}
              title={`${shortDate(p.date)}${p.caption ? " · " + p.caption : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.caption || p.date} referrerPolicy="no-referrer" />
              <span className="thumb-date">{shortDate(p.date)}</span>
            </button>
          ))}
        </div>
      </div>

      <Lightbox
        photos={photos}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndex={setLightbox}
      />
    </>
  );
}
