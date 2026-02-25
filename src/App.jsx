import { useRef } from 'react'
import DayPlanner from './components/DayPlanner'
import BookShell from './components/BookShell'
import LockScreen from './components/LockScreen.jsx'
import { StorageProvider } from './lib/storage.jsx'

// ─── APP ──────────────────────────────────────────────────────────────────────
// Architecture: render props pattern
//
// LockScreen gates the entire app with PBKDF2-based passphrase auth.
// Once unlocked, DayPlanner owns planner state, BookShell owns the frame.
//
// DayPlanner calls children({ chapters, pointsBank }) passing a chapter map.
// BookShell receives the map and renders whichever chapter is active.
// PoetrySection is registered as a chapter in BookShell's CHAPTER_DEFS.

export default function App() {
  const navigateRef = useRef(null);

  return (
    <StorageProvider>
      <LockScreen>
        <DayPlanner
          onNavigate={(chapter) => {
            if (navigateRef.current) navigateRef.current(chapter);
          }}
        >
          {({ chapters, pointsBank }) => (
            <BookShell
              chapters={chapters}
              pointsBank={pointsBank}
              navigateRef={navigateRef}
              onNavigateToRewards={() => {
                if (navigateRef.current) navigateRef.current("rewards");
              }}
            />
          )}
        </DayPlanner>
      </LockScreen>
    </StorageProvider>
  );
}
