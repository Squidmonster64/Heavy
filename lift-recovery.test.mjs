import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('./lift-recovery.css', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const manifest = readFileSync(new URL('./manifest.webmanifest', import.meta.url), 'utf8');

test('Lift Log recovery uses Bloody Dave’s dark natural tokens', () => {
  assert.match(css, /--recovery-bd-bg: #152018/);
  assert.match(css, /--recovery-bd-surface: #1d2a20/);
  assert.match(css, /--recovery-orange: #ef7c35/);
  assert.match(css, /--recovery-sand: #d7bd7c/);
  assert.match(styles, /color-scheme: dark/);
  assert.match(html, /theme-color" content="#152018"/);
  assert.match(manifest, /"theme_color": "#152018"/);
});

test('compact chrome: Control return, no suite product nav, no giant hero, no left rail', () => {
  assert.match(js, /FAMILY_CONTROL_HREF = 'https:\/\/control\.bloodydaves\.com'/);
  assert.match(js, /class="family-control"/);
  assert.match(js, /class="app-name">Lift Log/);
  assert.equal(js.includes('recipes.bloodydaves.com'), false);
  assert.equal(js.includes('fragments.bloodydaves.com'), false);
  assert.equal(js.includes('timer.bloodydaves.com'), false);
  assert.equal(js.includes('list.bloodydaves.com'), false);
  assert.equal(js.includes('aria-label="Bloody Dave\'s Suite"'), false);
  assert.match(css, /font-size: 18px/);
  assert.doesNotMatch(styles, /\.topbar h1 \{[^}]*font-size: 3[0-9]px/);
  assert.match(css, /\.lift-rail,\s*aside\.suite-rail,\s*\.permanent-left-rail \{ display: none; \}/);
});

test('logging controls stay touch-safe at 40–48px and numbers lead decoration', () => {
  assert.match(js, /class="log-set-btn complete-btn/);
  assert.match(js, /\$\{set\.isCompleted \? '✓' : 'Log'\}/);
  assert.match(js, /class="routine-metrics"/);
  assert.match(css, /\.log-set-btn \{[\s\S]*min-height: 44px;[\s\S]*max-height: 48px;/);
  assert.match(css, /\.workout-input \{[\s\S]*min-height: 44px;/);
  assert.match(styles, /\.btn \{[^}]*min-height: 44px;[^}]*max-height: 48px;/);
  assert.match(js, /Start last ·/);
  assert.match(styles, /\.workout-set-grid \{[^}]*grid-template-columns:[^}]*48px 30px;/);
  assert.match(styles, /\.remove-set-btn \{[^}]*position: static;/);
  assert.match(js, /if \(!confirm\(`Remove set \$\{index \+ 1\} from \$\{exercise\.exerciseName\}\?`\)\) return;/);
});

test('viewport gates keep a single column with no horizontal overflow', () => {
  assert.match(css, /Viewport gates: 390×844, 768×1024, 1024×768, 820×1180, 1180×820, 1440×900/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /\.workout-set-grid > \* \{[\s\S]*min-width: 0;/);
  assert.match(css, /input\[type='number'\]/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1024px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /@media \(min-width: 820px\)/);
  assert.match(css, /@media \(min-width: 1180px\)/);
  assert.match(css, /@media \(min-width: 1440px\)/);
});

test('iOS import keeps the file input alive and accepts Dropbox JSON downloads', () => {
  assert.match(js, /input\.accept = '\.json,application\/json,application\/octet-stream,text\/plain'/);
  assert.match(js, /document\.body\.append\(input\);[\s\S]*input\.click\(\);/);
  assert.match(js, /Import complete: \$\{result\.routineCount\} routine/);
  assert.match(js, /return \{ routineCount: importedRoutineIds\.size, sessionCount: importedSessionCount \};/);
});
