'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Advisor } from '@/types';
import { EXPERTISE_CATEGORIES, EXPERTISE_OPTIONS, VERTICAL_OPTIONS, STAGE_OPTIONS, SUBCATEGORY_TO_CATEGORY } from '@/types';
import DarkRequestModal from '@/components/DarkRequestModal';

// ─── Hero Cloud type (built dynamically from live advisors) ──────────────────
type HeroAdvisor = { name: string; role: string; photo: string; initials: string };

// 8 static slots in the hero cloud
const HAP_SLOTS = [
  { cls: 'hap hap-lg', style: { top:'0%',    left:'0%',  '--rot':'-2.5deg', zIndex:2,  '--ph':'0', '--fx':'1',  '--fy':'1'  } },
  { cls: 'hap hap-lg', style: { top:'3%',    left:'31%', '--rot':'1deg',    zIndex:3,  '--ph':'3', '--fx':'-1', '--fy':'1'  } },
  { cls: 'hap hap-md', style: { top:'4%',    left:'63%', '--rot':'-1.5deg', zIndex:2,  '--ph':'6', '--fx':'1',  '--fy':'-1' } },
  { cls: 'hap hap-md', style: { top:'43%',   left:'0%',  '--rot':'1.5deg',  zIndex:2,  '--ph':'5', '--fx':'1',  '--fy':'1'  } },
  { cls: 'hap hap-lg', style: { top:'40%',   left:'23%', '--rot':'-1deg',   zIndex:4,  '--ph':'2', '--fx':'-1', '--fy':'1'  } },
  { cls: 'hap hap-md', style: { top:'42%',   left:'57%', '--rot':'2deg',    zIndex:2,  '--ph':'8', '--fx':'1',  '--fy':'-1' } },
  { cls: 'hap hap-md', style: { top:'67%',   left:'22%', '--rot':'-1.5deg', zIndex:2,  '--ph':'9', '--fx':'-1', '--fy':'-1' } },
  { cls: 'hap hap-sm', style: { top:'71%',   left:'62%', '--rot':'1.5deg',  zIndex:1,  '--ph':'4', '--fx':'-1', '--fy':'1'  } },
];

// ─── Hero Cloud Component ─────────────────────────────────────────────────────
function HeroCloud({ heroAdvisors, onBookAdvisor }: { heroAdvisors: HeroAdvisor[]; onBookAdvisor: (name: string) => void }) {
  const hapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slotCurrent = useRef<number[]>([]);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advisorsRef = useRef<HeroAdvisor[]>(heroAdvisors);

  // Keep ref in sync with prop
  useEffect(() => { advisorsRef.current = heroAdvisors; }, [heroAdvisors]);

  useEffect(() => {
    if (!heroAdvisors.length) return;
    const advisors = heroAdvisors;
    const shuffled = advisors.map((_, i) => i).sort(() => Math.random() - 0.5);

    // Initial bind
    hapRefs.current.forEach((el, i) => {
      if (!el) return;
      const advisorIdx = shuffled[i] ?? i;
      slotCurrent.current[i] = advisorIdx;
      bindSlot(el, advisors[advisorIdx], onBookAdvisor);
    });

    // Start cycling
    if (advisors.length > hapRefs.current.length) {
      cycleTimer.current = setTimeout(() => cycleOneSlot(onBookAdvisor), 2000);
    }

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [onBookAdvisor]);

  function bindSlot(el: HTMLDivElement, advisor: HeroAdvisor, onBook: (name: string) => void) {
    const img  = el.querySelector('img') as HTMLImageElement;
    const name = el.querySelector('.hap-name') as HTMLElement;
    const role = el.querySelector('.hap-role') as HTMLElement;
    const btn  = el.querySelector('.hap-btn') as HTMLButtonElement | null;
    if (img)  { img.src = advisor.photo; img.alt = advisor.name; }
    if (name) name.textContent = advisor.name;
    if (role) role.textContent = advisor.role;
    const book = () => onBook(advisor.name);
    el.onclick = book;
    if (btn) btn.onclick = (e) => { e.stopPropagation(); book(); };
  }

  function sparkCard(el: HTMLDivElement) {
    const old = el.querySelector('.hap-shimmer');
    if (old) old.remove();
    const shim = document.createElement('div');
    shim.className = 'hap-shimmer';
    el.appendChild(shim);
    el.classList.remove('blooming');
    void el.offsetWidth;
    el.classList.add('blooming');
    setTimeout(() => { shim.remove(); el.classList.remove('blooming'); }, 1100);
  }

  function cycleOneSlot(onBook: (name: string) => void) {
    const advisors = advisorsRef.current;
    if (!advisors.length) return;
    const shown = new Set(slotCurrent.current);
    const bench = advisors.map((_, i) => i).filter(i => !shown.has(i));
    if (!bench.length) { cycleTimer.current = setTimeout(() => cycleOneSlot(onBook), 800); return; }

    const slots = hapRefs.current.filter(Boolean) as HTMLDivElement[];
    const candidates = slots.map((_, i) => i).filter(i => !slots[i].matches(':hover'));
    if (!candidates.length) { cycleTimer.current = setTimeout(() => cycleOneSlot(onBook), 600); return; }

    const slotIdx = candidates[Math.floor(Math.random() * candidates.length)];
    const newAdvisor = bench[Math.floor(Math.random() * bench.length)];
    const el = slots[slotIdx];

    el.classList.add('cycling');
    cycleTimer.current = setTimeout(() => {
      slotCurrent.current[slotIdx] = newAdvisor;
      bindSlot(el, advisors[newAdvisor], onBook);
      el.classList.remove('cycling');
      sparkCard(el);
      cycleTimer.current = setTimeout(() => cycleOneSlot(onBook), 1800 + Math.random() * 1200);
    }, 480);
  }

  return (
    <div className="hero-right">
      {HAP_SLOTS.map((slot, i) => {
        const adv = heroAdvisors[i % Math.max(heroAdvisors.length, 1)];
        return (
          <div
            key={i}
            ref={el => { hapRefs.current[i] = el; }}
            className={slot.cls}
            style={slot.style as React.CSSProperties}
          >
            {adv?.photo ? (
              <img src={adv.photo} alt={adv?.name ?? ''} loading="eager" fetchPriority="high" decoding="async" />
            ) : (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1E293B,#0F172A)', fontSize:'32px', color:'rgba(248,250,252,.3)', fontFamily:'var(--font-d)' }}>
                {adv?.initials ?? '?'}
              </div>
            )}
            <div className="hap-over">
              <p className="hap-name">{adv?.name ?? ''}</p>
              <p className="hap-role">{adv?.role ?? ''}</p>
            </div>
            <button className="hap-btn">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Book
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Filter Dropdown (simple — for verticals & stages) ───────────────────────
function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onChange: (val: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const count = selected.size;
  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="fdd-wrap" ref={ref}>
      <button
        className={`fdd-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        {label}
        {count > 0 && <span className="fdd-badge">{count}</span>}
        <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="fdd-panel open">
          {options.length > 10 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="fdd-search"
            />
          )}
          <div className="fdd-options">
            {filtered.map(opt => {
              const checked = selected.has(opt);
              return (
                <label key={opt} className={`fdd-opt${checked ? ' checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(opt, e.target.checked)}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ padding: '12px 10px', fontSize: 13, color: 'var(--ink-faint)' }}>No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Expertise Cascading Filter (category → subcategory) ─────────────────────
function ExpertiseFilter({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (val: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const count = selected.size;
  const lowerSearch = search.toLowerCase();

  // If searching, show flat filtered results
  const isSearching = search.length > 0;
  const searchResults = isSearching
    ? EXPERTISE_OPTIONS.filter(o => o.toLowerCase().includes(lowerSearch))
    : [];

  function toggleCategory(cat: typeof EXPERTISE_CATEGORIES[0]) {
    const allSelected = cat.subcategories.every(s => selected.has(s));
    cat.subcategories.forEach(s => onChange(s, !allSelected));
  }

  return (
    <div className="fdd-wrap" ref={ref}>
      <button
        className={`fdd-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        Expertise
        {count > 0 && <span className="fdd-badge">{count}</span>}
        <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="fdd-panel fdd-panel-expertise open">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search expertise..."
            className="fdd-search"
          />
          <div className="fdd-options">
            {isSearching ? (
              /* ── Flat search results ── */
              searchResults.length > 0 ? searchResults.map(opt => {
                const checked = selected.has(opt);
                const catName = SUBCATEGORY_TO_CATEGORY[opt];
                return (
                  <label key={opt} className={`fdd-opt${checked ? ' checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={e => onChange(opt, e.target.checked)} />
                    <span>
                      {opt}
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 6 }}>{catName}</span>
                    </span>
                  </label>
                );
              }) : (
                <p style={{ padding: '12px 10px', fontSize: 13, color: 'var(--ink-faint)' }}>No matches</p>
              )
            ) : (
              /* ── Grouped categories ── */
              EXPERTISE_CATEGORIES.map(cat => {
                const isExpanded = expandedCat === cat.category;
                const selectedCount = cat.subcategories.filter(s => selected.has(s)).length;
                const allSelected = selectedCount === cat.subcategories.length;
                return (
                  <div key={cat.category} className="fdd-cat-group">
                    <div className="fdd-cat-header">
                      <button
                        type="button"
                        className="fdd-cat-toggle"
                        onClick={() => setExpandedCat(isExpanded ? null : cat.category)}
                      >
                        <svg viewBox="0 0 24 24" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                        <span className="fdd-cat-name">{cat.category}</span>
                        {selectedCount > 0 && <span className="fdd-badge">{selectedCount}</span>}
                      </button>
                      <button
                        type="button"
                        className={`fdd-cat-all${allSelected ? ' active' : ''}`}
                        onClick={() => toggleCategory(cat)}
                        title={allSelected ? 'Deselect all' : 'Select all'}
                      >
                        {allSelected ? 'All' : 'All'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="fdd-cat-subs">
                        {cat.subcategories.map(sub => {
                          const checked = selected.has(sub);
                          return (
                            <label key={sub} className={`fdd-opt${checked ? ' checked' : ''}`}>
                              <input type="checkbox" checked={checked} onChange={e => onChange(sub, e.target.checked)} />
                              <span>{sub}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Advisor Card ─────────────────────────────────────────────────────────────
function AdvisorCard({ advisor, onBook }: { advisor: Advisor; onBook: (advisor: Advisor) => void }) {
  const tags = advisor.expertise.slice(0, 4);
  const badge = (advisor.verticals ?? []).slice(0, 2).join(' · ') || 'GTM';
  const stages = (advisor.stages ?? []).join(' · ');
  const linkedin = advisor.linkedin ?? '';
  const handle = linkedin.split('/in/')[1] ?? '';
  const unavailable = !advisor.available;

  return (
    <div
      className="card reveal"
      data-expertise={(advisor.expertise ?? []).join(',').toLowerCase()}
      data-verticals={(advisor.verticals ?? []).join(',')}
      data-stages={(advisor.stages ?? []).join(',')}
      style={unavailable ? { opacity: 0.72, filter: 'grayscale(30%)' } : undefined}
    >
      <div className="card-photo">
        {advisor.photo_url ? (
          <img src={advisor.photo_url} alt={advisor.name} loading="lazy" decoding="async" />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1E293B,#0F172A)' }}>
            <span style={{ fontFamily:'var(--font-d)', fontSize:'48px', color:'rgba(248,250,252,.3)' }}>
              {advisor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
        <span className="card-industry-badge">{badge}</span>
        {unavailable && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(15,23,42,0.75)', padding:'6px 10px', textAlign:'center' }}>
            <span style={{ fontSize:'11px', fontWeight:700, color:'#F59E0B', letterSpacing:'.06em', textTransform:'uppercase' }}>⏸ Not taking requests</span>
          </div>
        )}
      </div>
      <div className="card-body">
        <h3 className="card-name">{advisor.name}</h3>
        <p className="card-role">{advisor.bio}</p>
        <div className="card-tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        {stages && (
          <p className="card-meta"><strong>Best for:</strong> {stages}</p>
        )}
        {handle && (
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="card-linkedin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
              <rect x="2" y="9" width="4" height="12"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
            linkedin.com/in/{handle}
          </a>
        )}
      </div>
      <div className="card-footer">
        {unavailable ? (
          <button className="btn-book" disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: '#64748B' }}>
            Not taking requests
          </button>
        ) : (
          <button className="btn-book" onClick={() => onBook(advisor)}>
            Request a meeting
            <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [heroBookName, setHeroBookName] = useState<string | null>(null);

  // Filter state
  const [expertiseFilter, setExpertiseFilter] = useState<Set<string>>(new Set());
  const [verticalsFilter, setVerticalsFilter] = useState<Set<string>>(new Set());
  const [stagesFilter, setStagesFilter] = useState<Set<string>>(new Set());
  const [availableOnly, setAvailableOnly] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Scroll-reveal + nav scroll
  useEffect(() => {
    const nav = document.getElementById('main-nav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });

    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, [advisors]); // re-run when advisors load to pick up new .reveal elements

  // Fetch advisors — shuffle so order is random each load
  useEffect(() => {
    fetch('/api/advisors')
      .then(r => r.json())
      .then((data: Advisor[]) => {
        // Fisher-Yates shuffle
        for (let i = data.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data[i], data[j]] = [data[j], data[i]];
        }
        setAdvisors(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtering + sorting (advisors with photos first, then alphabetical)
  const filteredAdvisors = advisors
    .filter(a => {
      if (availableOnly && !a.available) return false;
      if (nameQuery.trim() && !a.name.toLowerCase().includes(nameQuery.trim().toLowerCase())) return false;
      const exp = (a.expertise ?? []).join(',').toLowerCase();
      const vert = (a.verticals ?? []).join(',').toLowerCase();
      const stg = (a.stages ?? []).join(',').toLowerCase();
      if (expertiseFilter.size > 0 && ![...expertiseFilter].some(v => exp.includes(v.toLowerCase()))) return false;
      if (verticalsFilter.size > 0 && ![...verticalsFilter].some(v => vert.includes(v.toLowerCase()))) return false;
      if (stagesFilter.size > 0 && ![...stagesFilter].some(v => stg.includes(v.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      // Advisors with photos first
      const aHasPhoto = a.photo_url ? 1 : 0;
      const bHasPhoto = b.photo_url ? 1 : 0;
      if (aHasPhoto !== bHasPhoto) return bHasPhoto - aHasPhoto;
      return 0; // preserve shuffle order within each group
    });

  const totalActiveFilters = expertiseFilter.size + verticalsFilter.size + stagesFilter.size;

  function clearAllFilters() {
    setExpertiseFilter(new Set());
    setVerticalsFilter(new Set());
    setStagesFilter(new Set());
    setNameQuery('');
  }

  function toggleFilter(group: 'expertise' | 'verticals' | 'stages', val: string, checked: boolean) {
    const setMap = { expertise: setExpertiseFilter, verticals: setVerticalsFilter, stages: setStagesFilter };
    setMap[group](prev => {
      const next = new Set(prev);
      if (checked) next.add(val); else next.delete(val);
      return next;
    });
  }

  function removeChip(group: 'expertise' | 'verticals' | 'stages', val: string) {
    toggleFilter(group, val, false);
  }

  // Active chips
  const chips: { group: 'expertise' | 'verticals' | 'stages'; val: string }[] = [
    ...[...expertiseFilter].map(v => ({ group: 'expertise' as const, val: v })),
    ...[...verticalsFilter].map(v => ({ group: 'verticals' as const, val: v })),
    ...[...stagesFilter].map(v => ({ group: 'stages' as const, val: v })),
  ];

  // Hero book handler (opens modal with matching advisor or null)
  const handleHeroBook = useCallback((name: string) => {
    const found = advisors.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setSelectedAdvisor(found);
    } else {
      // If not loaded yet, set name to open a fallback modal
      setHeroBookName(name);
    }
  }, [advisors]);

  return (
    <>
      {/* ── NAV ── */}
      <nav className="nav" id="main-nav">
        <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="nav-logo-mark">
            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <span className="nav-logo-text">Advisors <span>Office Hours</span></span>
        </div>
        <div className="nav-right">
          <a href="#mission" className="nav-link">Our Mission</a>
          <a href="#advisors" className="nav-link">Advisors</a>
          <a href="#advisors" className="nav-cta">Meet your advisor</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-main">
          {/* Left: text */}
          <div className="hero-left">
            <div className="hero-badge">
              <span style={{ fontSize: 16 }}>🇮🇱</span>
              Supporting the Israeli Ecosystem
            </div>
            <h1 className="hero-headline">
              Meet the advisors<br />helping Israeli<br />startups <em>grow.</em>
            </h1>
            <p className="hero-sub">
              {advisors.length || 12} senior GTM and revenue marketing leaders give one hour of their time, free of charge. Why? Because we want to help Israeli startups grow.
            </p>
            <div className="hero-actions">
              <a href="#advisors" className="btn-hero">
                Browse &amp; Request
                <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <span className="hero-trust">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                $0 cost. Pro-bono, by choice.
              </span>
            </div>
          </div>

          {/* Right: advisor cloud (only advisors with photos) */}
          <HeroCloud
            heroAdvisors={advisors.filter(a => a.photo_url).map(a => ({
              name: a.name,
              role: (a.expertise ?? []).slice(0, 2).join(' · ') || 'GTM Expert',
              photo: a.photo_url ?? '',
              initials: a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            }))}
            onBookAdvisor={handleHeroBook}
          />
        </div>

        {/* Stats strip */}
        <div className="hero-stats">
          <div className="hero-stats-inner">
            <div className="stat">
              <div className="stat-n">{advisors.length || 12}</div>
              <div className="stat-l">Senior advisors</div>
            </div>
            <div className="stat">
              <div className="stat-n">1 hr</div>
              <div className="stat-l">Focused session</div>
            </div>
            <div className="stat">
              <div className="stat-n">{EXPERTISE_OPTIONS.length}</div>
              <div className="stat-l">GTM specializations</div>
            </div>
            <div className="stat">
              <div className="stat-n">$0</div>
              <div className="stat-l">Pro-bono</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="mission" id="mission">
        <div className="wrap">
          <div className="mission-grid">
            <div className="reveal">
              <p className="mission-label">Why We&apos;re Doing This</p>
              <h2 className="mission-headline">Now is the time to build your marketing foundation. We&apos;re here to help.</h2>
              <p className="mission-body">
                We&apos;re a group of senior Israeli marketing and business leaders - ex-CMOs, VPs, and GTM leads from Israel&apos;s most successful tech companies. We&apos;ve each been in the room when a startup found its footing. We know how much a single sharp conversation can change a trajectory.
              </p>
              <p className="mission-body">
                This is our pro-bono contribution to the ecosystem.
              </p>
              <p className="mission-body">
                This initiative was born on the eve of Israel&apos;s 78th Independence Day, during one of the most challenging periods the Israeli tech ecosystem has faced. We believe that in difficult times, the strongest thing we can do is show up for each other. These are the moments that define who we are as a community.
              </p>
              <div className="mission-quote">
                <p>&quot;People who do not have a fantasy, do not do fantastic things.&quot;</p>
                <cite>(Shimon Peres)</cite>
              </div>
            </div>
            <div className="reveal reveal-d2">
              <div className="mission-visual">
                <img
                  src="https://v3b.fal.media/files/b/0a9615ab/UX-4ol7givDWYJXxNhadR.jpg"
                  alt="Tel Aviv skyline"
                  loading="lazy"
                />
                <div className="mission-visual-badge">
                  <div className="mvb-icon">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div className="mvb-text">
                    <p><span>{advisors.length || 12}</span> advisors committed</p>
                    <p>Sessions available now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GAIN ── */}
      <section className="gain">
        <div className="wrap">
          <div className="reveal">
            <p className="gain-eyebrow">What You Gain</p>
            <p className="gain-kicker">
              This isn&apos;t a networking chat;&nbsp;it&apos;s a tactical intervention.
            </p>
          </div>
          <div className="gain-grid reveal reveal-d1">
            <div className="gain-outcomes">
              <div className="gain-outcome">
                <span className="gain-outcome-num">01</span>
                <div>
                  <p className="gain-outcome-title">Surgical breakdown</p>
                  <p className="gain-outcome-body">
                    A precise diagnosis of your current bottleneck — no vague advice, no generic frameworks. Move from ambiguity to clarity in a single session.
                  </p>
                </div>
              </div>
              <div className="gain-outcome">
                <span className="gain-outcome-num">02</span>
                <div>
                  <p className="gain-outcome-title">Operational roadmap</p>
                  <p className="gain-outcome-body">
                    A high-impact plan to move from defense to offense — concrete, prioritized, and executable from day one.
                  </p>
                </div>
              </div>
              <div className="gain-outcome">
                <span className="gain-outcome-num">03</span>
                <div>
                  <p className="gain-outcome-title">Mental clarity &amp; momentum</p>
                  <p className="gain-outcome-body">
                    The mental clarity and concrete steps needed to turn 45 minutes of strategy into immediate market momentum.
                  </p>
                </div>
              </div>
            </div>

            <div className="gain-panel">
              <p className="gain-panel-label">Whether you are navigating</p>
              <div className="gain-tags">
                <span className="gain-tag">Fundraising fog</span>
                <span className="gain-tag">Global positioning</span>
                <span className="gain-tag">Agentic AI for lean execution</span>
              </div>
              <div className="gain-stat-row">
                <span className="gain-stat-num">45</span>
                <div className="gain-stat-copy">
                  <p className="gain-stat-unit">minutes of strategy</p>
                  <p className="gain-stat-result">→ immediate market momentum</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how">
        <div className="wrap how-inner">
          <p className="section-label reveal">Process</p>
          <h2 className="section-title reveal">Three steps to your session</h2>
          <div className="steps">
            <div className="step reveal">
              <div className="step-num">01</div>
              <div className="step-ico">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <h3 className="step-title">Browse &amp; Filter</h3>
              <p className="step-desc">Filter advisors by what you actually need: expertise area, your industry, and funding stage. Find the exact person for your challenge.</p>
            </div>
            <div className="step reveal reveal-d2">
              <div className="step-num">02</div>
              <div className="step-ico">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <h3 className="step-title">Submit Your Request</h3>
              <p className="step-desc">Tell us about your company, stage, and what you&apos;re struggling with. The more context you share, the more valuable the session will be.</p>
            </div>
            <div className="step reveal reveal-d4">
              <div className="step-num">03</div>
              <div className="step-ico">
                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.15 3.43 2 2 0 0 1 3.12 1.25h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
              </div>
              <h3 className="step-title">Advisor Reviews &amp; Decides</h3>
              <p className="step-desc">The advisor receives your request by email and decides who to take on. If they accept, they&apos;ll reach out directly to schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ADVISORS ── */}
      <section className="advisors" id="advisors">
        <div className="wrap">
          <div className="advisors-head">
            <div>
              <div className="count-badge">
                <svg viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {loading ? '...' : filteredAdvisors.length} {filteredAdvisors.length === 1 ? 'advisor' : 'advisors'} available
              </div>
              <p className="section-label" style={{ marginBottom: 6 }}>The Team</p>
              <h2 className="section-title" style={{ marginBottom: 0 }}>Meet your advisor</h2>
            </div>
          </div>

          {/* Filters */}
          <button
            className={`filter-toggle${filtersCollapsed ? '' : ' open'}`}
            onClick={() => setFiltersCollapsed(v => !v)}
          >
            <span>Filters{totalActiveFilters > 0 ? ` (${totalActiveFilters})` : ''}</span>
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <div className="filters-wrap reveal">
            <div className={`filters-body${filtersCollapsed ? ' collapsed' : ''}`}>
              {/* Name search */}
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  type="text"
                  value={nameQuery}
                  onChange={e => setNameQuery(e.target.value)}
                  placeholder="Search by name..."
                  style={{
                    width: '100%', padding: '10px 14px 10px 42px',
                    borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14,
                    background: 'rgba(255,255,255,.07)', color: 'var(--ink)',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-b)',
                  }}
                />
                {nameQuery && (
                  <button onClick={() => setNameQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
              <div className="filter-dropdowns">
                <ExpertiseFilter
                  selected={expertiseFilter}
                  onChange={(v, c) => toggleFilter('expertise', v, c)}
                />
                <FilterDropdown
                  label="Verticals"
                  options={VERTICAL_OPTIONS}
                  selected={verticalsFilter}
                  onChange={(v, c) => toggleFilter('verticals', v, c)}
                />
                <FilterDropdown
                  label="Stage"
                  options={STAGE_OPTIONS}
                  selected={stagesFilter}
                  onChange={(v, c) => toggleFilter('stages', v, c)}
                />

                {/* Available toggle */}
                <label className="avail-toggle">
                  <span className="avail-label">Available only</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={availableOnly}
                    className={`avail-switch${availableOnly ? ' on' : ''}`}
                    onClick={() => setAvailableOnly(v => !v)}
                  >
                    <span className="avail-knob" />
                  </button>
                </label>

                {/* Active chips */}
                {chips.length > 0 && (
                  <div className="fdd-active">
                    {chips.map(({ group, val }) => (
                      <span key={`${group}-${val}`} className="fdd-chip" onClick={() => removeChip(group, val)}>
                        {val}
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </span>
                    ))}
                    <button className="fdd-clear" onClick={clearAllFilters}>Clear all</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="advisors-grid">
            {loading && (
              <div className="loading-spinner">
                <div className="spinner" />
                <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Loading advisors...</p>
              </div>
            )}

            {!loading && filteredAdvisors.length === 0 && advisors.length > 0 && (
              <div className="advisors-empty">
                <p>No advisors match those filters. Try removing one constraint.</p>
                <button className="advisors-empty-clear" onClick={clearAllFilters}>Clear all filters</button>
              </div>
            )}

            {!loading && advisors.length === 0 && (
              <div className="advisors-empty">
                <p>No advisors available right now. Check back soon.</p>
              </div>
            )}

            {!loading && filteredAdvisors.map(advisor => (
              <AdvisorCard key={advisor.id} advisor={advisor} onBook={setSelectedAdvisor} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-inner">
            <div className="footer-logo">
              <div className="footer-logo-mark">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <span className="footer-logo-text">Advisors <span>Office Hours</span></span>
            </div>
            <p className="footer-note">
              Made with <span>♥</span> by Israeli go-to-market startup marketing leaders, for the next wave of Israeli innovation.
            </p>
            <p className="footer-built">
              Built by Pe&apos;era Feldman &amp; Etgar Shpivak
            </p>
          </div>
        </div>
      </footer>

      {/* ── MODAL ── */}
      {(selectedAdvisor || heroBookName) && (
        <DarkRequestModal
          advisorName={selectedAdvisor?.name ?? heroBookName ?? ''}
          advisorId={selectedAdvisor?.id ?? ''}
          advisorPhoto={selectedAdvisor?.photo_url ?? null}
          onClose={() => { setSelectedAdvisor(null); setHeroBookName(null); }}
        />
      )}
    </>
  );
}
