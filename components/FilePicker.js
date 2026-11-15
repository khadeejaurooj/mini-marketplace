'use client';
// A tidy replacement for the browser's raw "Choose File / No file chosen" control.
// The real <input type="file"> is visually hidden inside a <label>, so clicking
// anywhere on the box opens the file picker. Photos can also be dragged in.
// After choosing, the box shows the chosen file name(s).
//
// onFiles(files): called with an array of the chosen image files.
import { useState } from 'react';

export default function FilePicker({ label, hint, multiple = false, onFiles, disabled = false }) {
  const [chosen, setChosen] = useState([]); // names of the last chosen files
  const [dragging, setDragging] = useState(false);

  function handle(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setChosen(files.map((f) => f.name));
    onFiles(files);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      className={`flex items-center gap-4 rounded-2xl border-2 border-dashed px-4 py-3 min-h-[72px] cursor-pointer transition ${
        dragging ? 'border-ink bg-sand' : 'border-line bg-white hover:border-muted'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {/* Simple "upload" arrow icon */}
      <span className="w-11 h-11 shrink-0 rounded-full bg-sand flex items-center justify-center" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted truncate">
          {chosen.length ? `Chosen: ${chosen.join(', ')}` : hint}
        </span>
      </span>
      <span className="btn btn-light text-sm shrink-0 hidden sm:inline-flex">Browse</span>
      {/* sr-only = hidden visually but still usable; value reset so the same file can be picked again */}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => { handle(e.target.files); e.target.value = ''; }}
      />
    </label>
  );
}
