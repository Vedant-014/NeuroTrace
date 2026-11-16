/**
 * The recurring visual signature of this product: an animated hand-drawn spiral -
 * literally the same shape a patient draws for screening. Used in the hero,
 * loading states, and as a quiet section accent, instead of generic medical iconography.
 */
export default function Spiral({ className = "w-full h-full", stroke = "currentColor", strokeWidth = 3, animate = true }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M100 100
           m -2 0
           a 2 2 0 1 1 4 0
           a 6 6 0 1 1 -12 0
           a 12 12 0 1 1 24 0
           a 20 20 0 1 1 -40 0
           a 30 30 0 1 1 60 0
           a 42 42 0 1 1 -84 0
           a 55 55 0 1 1 110 0
           a 70 70 0 1 1 -140 0"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={animate ? "spiral-draw" : ""}
      />
    </svg>
  );
}
