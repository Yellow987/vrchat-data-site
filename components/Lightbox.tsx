"use client";

import { useCallback, useEffect } from "react";
import type { PhotoRow } from "@/lib/types";

function longDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  photos: PhotoRow[];
  /** index of the open photo, or null when the lightbox is closed. */
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}

export default function Lightbox({ photos, index, onClose, onIndex }: Props) {
  const open = index !== null && index >= 0 && index < photos.length;

  const go = useCallback(
    (dir: number) => {
      if (index === null) return;
      const next = index + dir;
      if (next >= 0 && next < photos.length) onIndex(next);
    },
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    // lock body scroll while the overlay is up
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, onClose]);

  if (!open || index === null) return null;
  const photo = photos[index];

  return (
    <div className="lb-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-close" aria-label="Close" onClick={onClose}>
        ✕
      </button>

      {index > 0 && (
        <button
          className="lb-nav lb-prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          className="lb-nav lb-next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          ›
        </button>
      )}

      <figure className="lb-figure" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="lb-img"
          src={photo.imageUrl}
          alt={photo.caption || `Progress photo from ${photo.date}`}
          referrerPolicy="no-referrer"
        />
        <figcaption className="lb-cap">
          <span className="lb-date">{longDate(photo.date)}</span>
          {photo.caption && <span className="lb-note">{photo.caption}</span>}
          <span className="lb-count">
            {index + 1} / {photos.length}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
