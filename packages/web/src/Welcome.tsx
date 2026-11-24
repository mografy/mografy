// Start screen of a workspace before any project is open (`npx mografy dev` with no film yet): one quiet line.
// Opening anything from the sidebar leaves it.
import { useT } from './i18n.js';

export function Welcome() {
  const t = useT();
  return <section className="welcome" aria-label={t.welcomeHint}>
    <p className="welcome-hint">{t.welcomeHint}</p>
  </section>;
}
