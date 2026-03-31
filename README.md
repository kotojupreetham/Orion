# Orion
The Decision Engine for Changemakers

## File Order (for classification and workflow)

### 1. Core config
- `config/firebase-config.js`  (Auth / Firestore / AI key / env override)

### 2. Main app
- `index.html`         (landing app shell)
- `app/js/app.js`          (workspace, chat, Firestore, UI state)
- `app/style.css`          (global app style)
- `app/js/gsap-animations.js` (animation engine)

### 3. Onboarding and assessment
- `onboarding/onboarding.html`    (personality / level assessment UI)
- `onboarding/onboarding.js`      (AI question engine, scoring, profile setup)
- `onboarding/onboarding.css`     (onboarding panel styles)

### 4. Simulation engine
- `simulation/simulation.html`    (simulation UI panel)
- `simulation/simulation.js`      (AI scenario generator, decision engine)
- `simulation/simulation.css`     (simulation panel style)

### 5. Test / helpers
- `docs/TEST_CASES.md`      (classification test scenarios)
- `docs/.env.example`       (env variable template)
- `docs/.gitignore`         (ignore secrets and node artifacts)

## Notes
- Use `app/js/app.js` and `onboarding/onboarding.js` for primary user flow and AI integration.
- `simulation/simulation.js` is secondary and supports advanced decision scenarios.
