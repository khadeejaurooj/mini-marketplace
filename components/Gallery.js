'use client';
// Image gallery: big main image + thumbnails, swipe on phones,
// tap the main image to open a full-screen enlarged view.
//
// The gallery shows ONLY the images that belong to the selected colour:
//   1. the colour's main picture  (colour.image_url)
//   2. its other views            (product_images where colour_option_id = colour.id)
//   3. shared images              (product_images where colour_option_id is empty, e.g. size chart)
// So picking another colour swaps the whole set of real images.
import { useEffect, useRef, useState } from 'react';

// Pure helper: which images to show for this colour, in order.
function imagesForColour(images, colour) {
  const own = images.filter((img) => colour && img.colour_option_id === colour.id);
  const shared = images.filter((img) => !img.colour_option_id);
  const main = colour?.image_url ? [{ id: 'main-' + colour.id, url: colour.image_url }] : [];
  return [...main, ...own, ...shared];
}

export default function Gallery({ images, colour, alt }) {
  const slides = imagesForColour(images, colour);
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const touchStartX = useRef(null);

  // When the buyer picks another colour, start again at that colour's main image.
  useEffect(() => setIndex(0), [colour?.id]);

  if (!slides.length) return <div className="aspect-[4/3] bg-sand rounded-2xl" />;
  const current = slides[Math.min(index, slides.length - 1)];
  const go = (step) => setIndex((index + step + slides.length) % slides.length);

  // Swipe: remember where the finger started, compare where it ended.
  const onTouchStart = (e) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    const distance = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(distance) > 40) go(distance < 0 ? 1 : -1); // small moves = taps, not swipes
  };

  return (
    // min-w-0 lets this grid column shrink on small phones.
    <div className="min-w-0">
      <div className="relative group rounded-3xl overflow-hidden bg-sand shadow-[0_20px_50px_-20px_rgba(35,32,28,0.35)]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button className="block w-full cursor-zoom-in" onClick={() => setEnlarged(true)} aria-label="Enlarge image">
          <img src={current.url} alt={alt} className="w-full aspect-[4/3] object-cover" />
        </button>
        {/* Arrow buttons for desktop; phones swipe instead */}
        {slides.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous image" className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 shadow-md items-center justify-center text-xl opacity-0 group-hover:opacity-100 transition">‹</button>
            <button onClick={() => go(1)} aria-label="Next image" className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/95 shadow-md items-center justify-center text-xl opacity-0 group-hover:opacity-100 transition">›</button>
          </>
        )}
        <span className="absolute top-4 right-4 bg-white/95 text-xs font-semibold rounded-full px-3 py-1 shadow-sm">{index + 1} / {slides.length}</span>
        <span className="absolute top-4 left-4 bg-ink/80 text-white text-xs rounded-full px-3 py-1 hidden md:inline">Click to zoom</span>
      </div>

      {/* Thumbnails: one even row; the active one is outlined, the rest faded. */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {slides.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIndex(i)}
            aria-label={`Show image ${i + 1}`}
            className={`shrink-0 w-[22%] sm:w-[15.5%] aspect-[4/3] rounded-xl overflow-hidden ring-offset-2 transition ${
              i === index ? 'ring-2 ring-ink' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Enlarged view (lightbox). Tap anywhere to close. */}
      {enlarged && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setEnlarged(false)}>
          <img src={current.url} alt={alt} className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-3 right-3 btn btn-light w-11 px-0" aria-label="Close">✕</button>
        </div>
      )}
    </div>
  );
}
