export function HomeHeroWave() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-px text-[#f0fdf8] dark:text-[#071a10]">
      <svg
        viewBox="0 0 1440 120"
        fill="currentColor"
        preserveAspectRatio="none"
        className="block h-16 w-full sm:h-24"
        aria-hidden
      >
        <path d="M0,64 C360,120 720,0 1080,48 C1260,72 1380,96 1440,80 L1440,120 L0,120 Z" />
      </svg>
    </div>
  );
}
