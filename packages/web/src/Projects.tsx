// Left panel: every project this computer knows about, searchable, and a way to start a new one.
// Opening a project switches this same player over to it.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { useT } from './i18n.js';
import type { T } from './i18n.js';
import { callApi } from './api.js';
import { marked, score } from './search.js';
import type { ProjectList, ProjectSummary, TemplateSummary } from '@mografy/core';
import { readLocal, writeLocal } from './storage.js';
import { basename } from './format.js';

type Kind = ProjectSummary['kind'];
const GROUPS: Kind[] = ['recent', 'library', 'example', 'showcase', 'component'];
/** In a workspace its three folders always show, in this order, even when empty. */
const WORKSPACE_GROUPS: Kind[] = ['library', 'showcase', 'example', 'recent', 'component'];
type Scope = Kind | 'template' | 'all';

function ago(iso: string, t: T) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return t.justNow;
  if (s < 3600) return t.minAgo(Math.floor(s / 60));
  if (s < 86400) return t.hAgo(Math.floor(s / 3600));
  return new Date(iso).toLocaleDateString();
}
const slug = basename;

/** A command to copy, shown in an empty folder or under a template. */
function CopyCommand({ command }: { command: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => { void navigator.clipboard?.writeText(command).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {}); };
  return <button type="button" className="ws-command" onClick={copy} title={command}><code>{command}</code><span>{copied ? t.mcpCopied : t.wsCopy}</span></button>;
}

function TemplateRow({ item }: { item: TemplateSummary }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return <li className={`template-row ${open ? 'open' : ''}`}>
    <button type="button" className="project-row" aria-expanded={open} onClick={() => setOpen(v => !v)} title={item.summary}>
      <i aria-hidden="true" />
      <span className="project-name">{item.name}</span>
      <span className="project-meta"> {item.aspect}</span>
    </button>
    {open ? <div className="template-detail">
      {item.summary ? <p>{item.summary}</p> : null}
      <p className="ws-hint">{t.wsTemplateUse}</p>
      <CopyCommand command={`npx mografy add ${item.id} projects/my-film`} />
    </div> : null}
  </li>;
}

export function Projects({ current, refreshKey, welcome = false }: { current: string | undefined; refreshKey: string; welcome?: boolean }) {
  const t = useT();
  const [list, setList] = useState<ProjectList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  // Which group the list shows, remembered per browser; 'all' shows every group.
  const [savedScope, setScope] = useState<Scope>(() => { const s = readLocal('mografy.projects.scope'); return ([...GROUPS, 'template'] as string[]).includes(s ?? '') ? s as Scope : 'all'; });
  useEffect(() => { writeLocal('mografy.projects.scope', savedScope); }, [savedScope]);
  // Folded groups, remembered per browser; built-in components start folded.
  const [folds, setFolds] = useState<Set<Kind | 'template'>>(() => { const saved = readLocal('mografy.projects.folds'); try { return new Set(saved ? JSON.parse(saved) as Kind[] : ['component']); } catch { return new Set(['component']); } });
  const toggleFold = (kind: Kind | 'template') => setFolds(f => { const next = new Set(f); if (next.has(kind)) next.delete(kind); else next.add(kind); writeLocal('mografy.projects.folds', JSON.stringify([...next])); return next; });
  const [cursor, setCursor] = useState(0);
  const search = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => { void callApi<ProjectList>('projects').then(setList, e => setError(String(e.message))); }, []);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  useEffect(() => { window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [refresh]);

  const open = async (dir: string) => {
    if ((dir === current && !welcome) || busy) return;
    setBusy(dir); setError('');
    try { await callApi('projects/open', 'POST', { dir }); refresh(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };
  const create = async (title = name) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy('new'); setError('');
    try { await callApi('projects/new', 'POST', { name: trimmed }); setCreating(false); setName(''); setQuery(''); refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };

  const q = query.trim().toLowerCase();
  const workspace = list?.workspace ?? null;
  // A workspace shows its folders as sections, so there is no scope row: everything is listed.
  const scope: Scope = workspace ? 'all' : savedScope;
  const templates = useMemo(() => list?.templates ?? [], [list]);
  const shown = useMemo(() => {
    const all = list?.projects ?? [];
    const scoped = all.filter(p => scope === 'all' || p.kind === scope);
    const rank = (p: ProjectSummary) => Math.max(score(p.name, q), score(slug(p.dir), q) - .5);
    const filtered = q ? scoped.filter(p => rank(p) > 0).sort((a, b) => rank(b) - rank(a)) : scoped;
    if (q) return [{ kind: null as Kind | null, items: filtered }];
    // A workspace keeps its projects/ and examples/ folders on screen when they are empty.
    const always = (kind: Kind) => workspace !== null && (kind === 'library' || kind === 'example' || kind === 'showcase') && (scope === 'all' || scope === kind);
    return (workspace ? WORKSPACE_GROUPS : GROUPS).map(kind => ({ kind, items: filtered.filter(p => p.kind === kind) })).filter(g => g.items.length || always(g.kind));
  }, [list, q, scope, workspace]);
  const shownTemplates = useMemo(() => !workspace || (scope !== 'all' && scope !== 'template') ? []
    : q ? templates.filter(item => Math.max(score(item.name, q), score(item.id, q) - .5) > 0) : templates, [templates, workspace, scope, q]);
  const counts = useMemo(() => Object.fromEntries(GROUPS.map(k => [k, list?.projects.filter(p => p.kind === k).length ?? 0])) as Record<Kind, number>, [list]);
  const scopes: Scope[] = ['all', ...GROUPS.filter(k => counts[k])];
  const folderOf = (kind: Kind | 'template') => !workspace ? '' : kind === 'library' ? 'projects/' : kind === 'example' ? 'examples/' : kind === 'showcase' ? 'showcase/' : kind === 'template' ? 'templates/' : '';
  const flat = shown.flatMap(g => g.items);
  useEffect(() => { setCursor(0); }, [q]);
  const currentProject = list?.projects.find(p => p.dir === current);
  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(flat.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') { const p = flat[cursor]; if (p) void open(p.dir); else if (q) void create(query.trim()); }
    else if (e.key === 'Escape') { if (q) setQuery(''); else e.currentTarget.blur(); }
  };

  const templateSection = shownTemplates.length || (workspace && !q && (scope === 'all' || scope === 'template')) ? <section className={!q && folds.has('template') ? 'folded' : ''}>
        <button className="project-group" aria-expanded={q ? true : !folds.has('template')} onClick={() => toggleFold('template')}><span className="chev" aria-hidden="true" />{t.wsGroups.template}<code className="ws-folder">templates/</code><span>{shownTemplates.length}</span></button>
        {!q && folds.has('template') ? null : shownTemplates.length ? <ul>{shownTemplates.map(item => <TemplateRow key={item.id} item={item} />)}</ul> : <p className="ws-empty">{t.wsTemplatesEmpty}</p>}
      </section> : null;

  return <nav className="projects" aria-label={t.projects}>
    <header>
      <h2>{t.projects}</h2>
      <button className="tl-icon" aria-label={t.newProject} title={t.newProject} aria-expanded={creating} onClick={() => { setCreating(v => !v); setName(''); }}><PlusIcon size={17} /></button>
    </header>
    <label className="project-search">
      <MagnifyingGlassIcon size={15} aria-hidden="true" />
      <input ref={search} type="search" value={query} placeholder={t.searchProjects} aria-label={t.searchProjects} onChange={e => setQuery(e.currentTarget.value)} onKeyDown={onSearchKey} />
      {q ? <button type="button" className="tl-icon" aria-label={t.clearSearch} onClick={() => setQuery('')}><XIcon size={14} /></button> : null}
    </label>
    {workspace ? null : <div className="project-scope" role="radiogroup" aria-label={t.pjScope}>
      {scopes.map(k => <button key={k} type="button" role="radio" aria-checked={scope === k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{k === 'all' ? t.all : t.pjScopes[k]}</button>)}
    </div>}
    {creating ? <form className="new-project" onSubmit={e => { e.preventDefault(); void create(); }}>
      <input autoFocus type="text" placeholder={t.projectName} value={name} maxLength={80} onChange={e => setName(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Escape') setCreating(false); }} aria-label={t.newProjectName} />
      <div className="row">
        <button type="submit" className="primary" disabled={!name.trim() || busy === 'new'}>{busy === 'new' ? t.creating : t.create}</button>
        <button type="button" onClick={() => setCreating(false)}>{t.cancel}</button>
      </div>
      {list ? <p className="hint">{t.savedIn} {list.library}</p> : null}
    </form> : null}

    {error ? <p className="error-text">{error}</p> : null}

    {currentProject && !q && !welcome ? <div className={`project-current project-item current ${currentProject.kind === 'component' ? 'component-item' : ''}`}>
      <span className="thumb">{currentProject.thumb ? <img src={`/__mografy/projects/thumb?dir=${encodeURIComponent(currentProject.dir)}&v=${currentProject.thumb}`} alt="" decoding="async" /> : <b aria-hidden="true">{[...currentProject.name.trim()][0]?.toUpperCase() ?? '·'}</b>}</span>
      <span className="project-text">
        <span className="project-name">{currentProject.name}</span>
        <span className="project-meta">{t.openNow} · {currentProject.kind === 'component' ? t.readyMade : ago(currentProject.updatedAt, t)}</span>
      </span>
    </div> : null}

    <div className="project-groups">
      {shown.map(group => {
        const kind = group.kind, folded = !q && kind !== null && folds.has(kind);
        // Templates sit with the workspace folders, before the built-in components.
        const before = kind === 'component' ? templateSection : null;
        return <Fragment key={kind ?? 'search'}>{before}<section className={folded ? 'folded' : ''}>
          {kind ? <button className="project-group" aria-expanded={!folded} onClick={() => toggleFold(kind)}><span className="chev" aria-hidden="true" />{workspace ? t.wsGroups[kind] : t.groups[kind]}{folderOf(kind) ? <code className="ws-folder">{folderOf(kind)}</code> : null}<span>{group.items.length}</span></button> : <h3>{t.results(group.items.length)}</h3>}
          {!folded && kind === 'library' && !group.items.length ? <p className="ws-empty">{t.wsProjectsEmpty}</p> : null}
          {!folded && kind === 'example' && !group.items.length ? <p className="ws-empty">{t.wsExamplesEmpty}</p> : null}
          {!folded && kind === 'showcase' && !group.items.length ? <p className="ws-empty">{t.wsShowcaseEmpty}</p> : null}
          {folded || !group.items.length ? null : <ul>
            {group.items.map(p => {
              const index = flat.indexOf(p), isCurrent = p.dir === current && !welcome;
              const meta = busy === p.dir ? t.openingShort : !p.valid ? t.needsFix : p.kind === 'component' ? t.readyMade : p.kind === 'example' || p.kind === 'showcase' ? slug(p.dir) : ago(p.updatedAt, t);
              return <li key={p.dir}>
                <button className={`project-row ${isCurrent ? 'is-current' : ''} ${q && index === cursor ? 'cursor' : ''}`} onClick={() => void open(p.dir)} disabled={busy !== null && busy !== p.dir} aria-current={isCurrent ? 'true' : undefined} title={p.dir}>
                  <i aria-hidden="true" />
                  <span className="project-name">{marked(p.name, q)}</span>
                  <span className="project-meta"> {meta}</span>
                </button>
              </li>;
            })}
          </ul>}
        </section></Fragment>;
      })}
      {shown.some(g => g.kind === 'component') ? null : templateSection}
      {list && !flat.length && (!workspace || q) && !shownTemplates.length ? <div className="projects-empty">
        <p>{q ? t.noMatch(query.trim()) : t.noProjects}</p>
        {q ? <button onClick={() => void create(query.trim())} disabled={busy !== null}>{t.createNamed(query.trim())}</button> : null}
      </div> : null}
    </div>
  </nav>;
}
