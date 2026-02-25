# Commonplace Book

A personal productivity system featuring an AI-powered day planner with task management, intelligent scheduling, and gamification.

## Features

### Day Planner
- **Morning Check-in**: Answer 3 questions (sleep quality, hours available, energy level) to generate a personalized daily plan
- **Smart Scheduling**: Priority-based algorithm that scores tasks by urgency, criticality, energy fit, and overdue status
- **Adaptive Variants**: Tasks can have multiple variants (e.g., "Quick breakfast" vs "Full cooked breakfast") — the system picks the best fit based on your energy and available time
- **Time Pressure Mode**: Automatically switches to shorter task variants when time is tight
- **Natural Language Task Entry**: Add tasks in plain English — AI parses them into structured data
  - Batch processing: paste multiple tasks at once, one per line
  - Auto-infers category, energy requirement, frequency, and deadline
- **Task Learning**: Logs actual completion times and energy expenditure to improve future estimates
- **Full Task Editor**: Edit all task properties with intuitive controls:
  - Date picker for deadlines
  - Energy scale (1-10)
  - Day-of-week toggles
  - Variant management (add lighter/shorter alternatives)
  - Subtask tracking

### Gamification
- **Points System**:
  - Base points: `energy_required × duration_minutes ÷ 10`
  - Low-energy multiplier: ×1.5–3× bonus when energy ≤4 (worse you feel, more credit you get)
  - Perfect Day Bonus: 200pts when 100% of scheduled tasks completed
  - Feedback Points: 15pts per task when you log actual time/energy
- **Rewards Shop**: Define custom rewards with point costs, redeem when you've earned enough
- **Points History**: Full transaction log of earnings and redemptions

### Persistence
- All data stored in browser localStorage
- Persists across sessions on the same device
- Export/import capability via YAML view

## Installation & Setup

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

3. **Build for production**:
   ```bash
   npm run build
   ```
   Output in `dist/` directory

### Deploy to GitHub Pages

1. **Initial setup** (one time):
   - Create a GitHub repo called `commonplace-book`
   - Push this code to the repo
   - Go to repo Settings → Pages → Source: GitHub Actions

2. **Update base path** in `vite.config.js`:
   ```js
   base: '/commonplace-book/', // Use your repo name
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```
   Creates a `gh-pages` branch with built files.

4. **Access** at: `https://yourusername.github.io/commonplace-book/`

### Alternative: GitHub Actions Auto-Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Now every push to `main` auto-deploys.

## Project Structure

```
commonplace-book/
├── src/
│   ├── components/
│   │   └── DayPlanner.jsx      # Main day planner component
│   ├── lib/
│   │   └── storage.js          # localStorage wrapper (mimics artifact API)
│   ├── App.jsx                 # Root component
│   └── main.jsx                # React entry point
├── public/                     # Static assets
├── index.html                  # HTML entry point
├── package.json
├── vite.config.js
└── README.md
```

## Usage

### Morning Routine
1. Open the app
2. Navigate to "Morning" tab
3. Answer the 3 questions
4. Click "Generate Today's Plan"
5. Review your personalized task list

### Adding Tasks
**Via Natural Language**:
1. Go to "+ Add" tab
2. Type tasks, one per line:
   ```
   Q1 report for CFMS due 26 Mar, maybe 1hr
   weekly team standup Tuesdays, 30 min
   take vitamins every morning, 2 mins
   gym 3x per week, high energy, 1 hour
   ```
3. Click "Parse Tasks →"
4. Review parsed tasks, toggle checkboxes to approve
5. Click "Add X tasks"

**Via Task Editor**:
1. Go to "Tasks" tab
2. Click any existing task to edit
3. Modify fields with UI controls
4. Add variants for flexible scheduling
5. Save changes

### Tracking Progress
1. On "Plan" tab, check off completed tasks
2. Earn points as you go
3. At end of day, click "Log actual times"
4. Enter real duration/energy for completed tasks
5. Earn feedback points + improve future estimates

### Redeeming Rewards
1. Go to "Rewards" tab
2. Browse reward catalog
3. Click any affordable reward to redeem
4. Points deducted, enjoy your reward!

## API Integration

The day planner uses Claude API for natural language task parsing. The API key is handled automatically in the artifact environment. For standalone deployment:

1. The app calls `https://api.anthropic.com/v1/messages` directly
2. No API key is needed when running in Claude artifacts
3. For production use, you'd need to proxy through a backend or use environment variables

## Data Privacy

- All data stored locally in your browser
- No data sent to external servers (except AI parsing requests)
- Clear localStorage to reset all data
- Export tasks as YAML for backup

## Extending the System

The architecture is designed for easy extension:

### Add a New Component
1. Create `src/components/NewComponent.jsx`
2. Import in `src/App.jsx`
3. Add navigation tab if needed

### Add a New Feature to Day Planner
- Task data schema is defined in sample tasks
- Algorithm components are modular functions
- UI is componentized (TaskEditor is a separate component)

### Modify Point Economy
Edit constants at top of `DayPlanner.jsx`:
```js
const BASE_POINTS_MIN = 1;
const FEEDBACK_POINTS = 15;
const PERFECT_DAY_BONUS = 200;
const LOW_ENERGY_SCALE = { 1: 3.0, 2: 2.5, 3: 2.0, 4: 1.5 };
```

## Troubleshooting

**Tasks not persisting?**
- Check browser localStorage is enabled
- Try different browser if in private/incognito mode

**Parsing fails?**
- Ensure one task per line
- Add more detail (category, duration estimate)
- Check console for API errors

**Build errors?**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js v18+ installed

## License

Personal use only. Not licensed for redistribution.
