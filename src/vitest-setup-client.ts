// Component tests mount just the component under test, not the whole
// app (main.ts never runs) — so anything components rely on from global
// CSS (the chamfer clip-path classes, design tokens, .field, .mono, …)
// has to be imported here explicitly, same as main.ts does for the app.
import './app.css';
