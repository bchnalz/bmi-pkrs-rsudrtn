function AppLaunchSplash({ isExiting = false }) {
  return (
    <div
      className={`launch-splash fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)] ${isExiting ? 'launch-splash-exit' : ''}`}
    >
      <div className="flex flex-col items-center text-center">
        <img
          src="/pkrs-logo.png"
          alt="PKRS RSUD RTN Sidoarjo logo"
          className="launch-logo-intro h-24 w-24 rounded-2xl object-cover shadow-md ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
        />

        <h1 className="launch-title mt-6 text-2xl font-bold md:text-3xl">
          <span className="launch-typewriter">Nutri-Check App</span>
        </h1>
        <p className="launch-subtitle mt-0 text-xs text-[var(--muted-foreground)] md:text-sm">
          by PKRS RSUD RT Notopuro Sidoarjo
        </p>
      </div>
    </div>
  )
}

export default AppLaunchSplash
