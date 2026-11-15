'use client';
// Image gallery: big main image + thumbnails, swipe on phones,
// tap the main image to open a full-screen enlarged view.
//
// colourImage: the image_url of the selected colour option (from the database).
// It is shown FIRST, so clicking a swatch swaps the main image to that colour.
// images: the product's other gallery images (product_images table).
import { useEffect, useRef, useState } from 'react';

export default function Gallery({ images, colourImage, alt }) {
  // Full list of slides: the colour's own image first, then the gallery.
  const slides = colourImage ? [{ id: 'colour', url: colourImage }, ...images] : images;
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const touchStartX = useRef(null);

  // When the buyer picks another colour, jump back to that colour's image.
  useEffect(() => setIndex(0), [colourImage]);

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
      <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button className="block w-full cursor-zoom-in" onClick={() => setEnlarged(true)} aria-label="Enlarge image">
          <img src={current.url} alt={alt} className="w-full aspect-[4/3] object-cover rounded-2xl bg-sand" />
        </button>
        {/* Arrow buttons for desktop; phones swipe instead */}
        {slides.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous image" className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow items-center justify-center">‹</button>
            <button onClick={() => go(1)} aria-label="Next image" className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow items-center justify-center">›</button>
          </>
        )}
        <span className="absolute bottom-3 left-3 bg-white/90 text-xs rounded-full px-2.5 py-1">{index + 1} / {slides.length}</span>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {slides.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setIndex(i)}
            aria-label={`Show image ${i + 1}`}
            className={`shrink-0 w-20 h-15 rounded-lg overflow-hidden border-2 ${i === index ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}
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
