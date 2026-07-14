(() => {
  'use strict';

  const CONFIG = {
    accentColor: '#3B82F6',
    rotateMs: 2200,
    defaultLang: 'nl'
  };

  const copy = {
    nl: {
      nav: [
        { id: 'capaciteiten', label: 'Capaciteiten' },
        { id: 'diensten', label: 'Diensten' },
        { id: 'werkwijze', label: 'Werkwijze' },
        { id: 'over-ons', label: 'Over ons' },
        { id: 'waarom', label: 'Waarom' },
        { id: 'faq', label: 'FAQ' },
        { id: 'contact', label: 'Contact' }
      ],
      words: ['AI', 'Software', 'Agents', 'Automatisering', 'Advies', 'Processen', 'Oplossingen', 'Architectuur', 'Data'],
      title: 'Everware — Maatwerk software, AI & autonome agents',
      metaDesc: 'Everware — Nederlands maatwerk-softwarebureau. Software, AI-oplossingen en autonome agents op maat, met persoonlijke aandacht.',
      ogDesc: 'Van eerste gesprek tot autonome agents. Wij bouwen op maat — met persoonlijke aandacht, stabiliteit en onderhoudbaarheid.',
      heroEyebrow: '~/everware — Software op maat',
      heroTitleWord: 'Maatwerk',
      heroDesc: 'Van eerste gesprek tot autonome agents. Wij bouwen op maat — met persoonlijke aandacht.',
      heroCta1: 'Plan een gesprek',
      heroCta2: 'Bekijk werkwijze →',
      heroIndex: [
        { n: '01', label: 'Procesoptimalisatie' },
        { n: '02', label: 'Ontwerp & architectuur' },
        { n: '03', label: 'Maatwerk software' },
        { n: '04', label: 'AI oplossingen' },
        { n: '05', label: 'Autonome agents' },
        { n: '0A', label: 'Advies' }
      ],
      status: ['Persoonlijke aandacht', 'Stabiliteit', 'Onderhoudbaarheid', 'Betrouwbaarheid'],
      whyEyebrow: '05 / Waarom Everware',
      whyH2: 'Standaardsoftware forceert jouw proces. Wij verbeteren jouw proces.',
      whyLead: 'De meeste tools zijn gebouwd voor de gemiddelde klant — aan jou is niets gemiddeld! Wij beginnen bij jouw proces en bouwen daaromheen.',
      whyColATitle: 'Van de plank',
      whyColBTitle: 'Everware maatwerk',
      whyColA: [
        'Jij past je proces aan de software aan',
        'Betaal voor functies die je nooit gebruikt',
        'Een helpdesk die je niet kent',
        'Vendor lock-in en verborgen limieten',
        'Zwarte doos — je ziet niet wat er gebeurt'
      ],
      whyColB: [
        'Software past zich aan jouw proces aan en helpt actief in verbeteren, versnellen en automatiseren.',
        'Alleen wat je nodig hebt, niets meer',
        'Eén vast team dat je bij naam kent',
        'Jij bent eigenaar van code én data',
        'Transparant — je kijkt continu mee'
      ],
      capEyebrow: '01 / Capaciteiten',
      capH2: 'We bouwen wat nog niet bestaat.',
      capLead: 'Geen standaardpakketten, geen concessies. Eén team dat de volledige stack beheerst — van fundament tot autonome agent — en dat bij je blijft.',
      capTags: ['Persoonlijke aandacht', 'Stabiliteit', 'Onderhoudbaarheid', 'Betrouwbaarheid'],
      capRows: [
        { label: 'Backend', lines: ['Python · PHP · Node', 'Java or Kotlin · Go · C++ · Rust'] },
        { label: 'Frontend', lines: ['React or Next · Vue or Nuxt', 'PWA · Web Components · WASM', 'React Native or Expo · iOS · Android'] },
        { label: 'AI & ML', lines: ["LLM's · RAG · Generative AI", 'fine-tuning · eigen modellen'] },
        { label: 'Agents', lines: ['workflows · tool-use · orchestratie'] },
        { label: 'Cloud & infra', lines: ['Railway · Fly.io · Vercel · Vultr · DigitalOcean · GCP · AWS · CI/CD'] },
        { label: 'Data', lines: ['pipelines · integraties · dashboards', 'MySQL · PostgreSQL · Supabase'] }
      ],
      svEyebrow: '02 / Diensten',
      svH2: 'Wat we doen.',
      svCards: [
        { level: 'Level 01', title: 'Procesoptimalisatie', desc: 'We brengen je processen in kaart en halen de ruis eruit — voordat we iets bouwen.', meta: 'Analyse · Workflows · Automatisering' },
        { level: 'Level 02', title: 'Ontwerp & architectuur', desc: 'Een fundament dat meegroeit — doordacht, ontworpen op stabiliteit, niet op haast.', meta: 'Systeemontwerp · Roadmap · UX' },
        { level: 'Level 03', title: 'Maatwerk software', desc: 'Applicaties, platformen en interne tools — volledig op maat gebouwd rond jouw processen.', meta: 'Native, Web & mobiel · Interne tools · Integraties' },
        { level: 'Level 04', title: 'AI oplossingen', desc: "Maatwerk AI die past bij jouw data en processen — geen demo's, maar iets dat productie haalt.", meta: 'LLM-toepassingen · RAG · Eigen modellen' },
        { level: 'Level 05', title: 'Autonome agents', desc: 'Agents die werk voor jou uit handen nemen — betrouwbaar, controleerbaar en met de mens aan het roer.', meta: 'Workflows · Tool-use · Orchestratie' },
        { level: 'Level 0A', title: 'Advies', desc: 'Meedenken over de juiste keuzes — onafhankelijk en objectief.', meta: 'Second opinion · Strategie · Begeleiding' }
      ],
      wpEyebrow: '03 / Werkwijze',
      wpH2: 'Persoonlijk — van eerste gesprek tot jarenlang onderhoud.',
      wpStepWord: 'stap',
      wpSteps: [
        { n: '01', title: 'Kennismaking', desc: 'Een korte call. Wie zijn jullie en wat is jullie visie? We voelen of we een match zijn.' },
        { n: '02', title: 'Brainstormen', desc: 'Een langer overleg. Welke problemen of bottlenecks ervaren jullie — en wat vermoed je te willen automatiseren?' },
        { n: '03', title: 'Op de koffie', desc: 'Een rondleiding van het huis. Neem ons mee in jullie bedrijf — hier inventariseren we het volledige huidige proces.' },
        { n: '04', title: 'Ontwerp & architectuur', desc: 'We optimaliseren dat proces en ontwerpen de software die deze optimalisatie ondersteunt.' },
        { n: '05', title: 'Bouw', desc: 'Maatwerk, test-driven & AI-driven ontwikkeling — in korte, zichtbare iteraties. Built for the long haul.' },
        { n: '06', title: 'Onderhoud & doorontwikkeling', desc: 'We blijven betrokken. Onderhoudbaarheid en bruikbaarheid staan centraal — ook na oplevering.' }
      ],
      abEyebrow: '04 / Over ons',
      abH2: 'Klein team, volledige toewijding.',
      abParas: [
        'Everware is een Nederlands maatwerk-softwarebureau. Wij bouwen software, AI-oplossingen en autonome agents die aansluiten op jouw processen en tools — geen standaardpakketten, geen concessies.',
        'We werken met een klein team waarbij persoonlijke aandacht voorop staat. Van het eerste gesprek tot jarenlang onderhoud. We bouwen met als doel stabiliteit en onderhoudbaarheid, zodat wat we maken jarenlang meegaat.'
      ],
      abRows: [
        { label: 'Werkgebied', lines: ['Nederland · remote-first · op locatie'] },
        { label: 'Focus', lines: ['maatwerk software · AI · agents', 'procesautomatisering'] },
        { label: 'Aanpak', lines: ['persoonlijk · langdurig betrokken'] }
      ],
      abTelLabel: 'Telefoon',
      abEmailLabel: 'E-mail',
      faqEyebrow: '06 / Veelgestelde vragen',
      faqH2: 'Veelgestelde vragen.',
      faqItems: [
        { q: 'Wat doet Everware precies?', a: 'We bouwen maatwerk software, AI-oplossingen en autonome agents. Van het optimaliseren van je processen tot het ontwerpen, bouwen en onderhouden van de software eromheen — alles onder één dak.' },
        { q: 'Werken jullie met vaste pakketten?', a: 'Nee en ja. Alles wat we maken is op maat gebouwd rond jouw processen. We beginnen bij het probleem, niet bij een kant-en-klaar product. In veel gevallen kunnen we echter wel aansluiten op bestaande software, indien gewenst.' },
        { q: 'Voor wie werken jullie?', a: 'Voor organisaties die tegen de grenzen van standaardsoftware aanlopen en iets nodig hebben dat echt aansluit op hun manier van werken.' },
        { q: 'Welke technologieën gebruiken jullie?', a: "De volledige stack — van Python, PHP, Node, Java, Go, C++ en Rust tot React en Vue, met LLM's, RAG en keuze in elk AI model. We kiezen wat past bij jouw situatie." },
        { q: 'Blijven jullie betrokken na oplevering?', a: 'Ja. Onderhoud en doorontwikkeling horen erbij. We blijven betrokken zodat je software betrouwbaar blijft en met je meegroeit.' },
        { q: 'Wat kost een traject?', a: 'Dat hangt af van wat je wilt bouwen. Na een vrijblijvend kennismakingsgesprek geven we een helder beeld van scope en investering.' }
      ],
      ctH2: 'Klaar voor maatwerk?',
      ctLead: 'Laten we vrijblijvend kennismaken. Bellen of mailen kost niets!',
      ctNaam: 'Naam', ctNaamPh: 'Jouw naam',
      ctEmail: 'E-mail', ctEmailPh: 'jij@bedrijf.nl',
      ctBedrijf: 'Bedrijf', ctBedrijfOpt: '— optioneel', ctBedrijfPh: 'Bedrijfsnaam',
      ctIdea: 'Wat heb je in gedachten?', ctIdeaPh: 'Neem ons mee!',
      ctSubmit: 'Verstuur bericht →',
      ctOrPre: 'of mail', ctOrMid: 'of bel',
      ctAvg: 'Door te versturen ga je akkoord dat we contact met je opnemen over je aanvraag. Geen nieuwsbrief, geen spam.',
      ctSentTag: '// verzonden',
      ctSentTitle: 'Bedankt voor je bericht.',
      ctSentBody: 'We nemen binnen één werkdag persoonlijk contact met je op.',
      ctAgain: 'Nog een bericht sturen',
      ftTagline: 'Maatwerk software, AI & autonome agents — built to last.',
      ftContactHd: 'Contact', ftNavHd: 'Navigatie',
      ftCopyLeft: '© 2026 Everware · Nederland',
      ftCopyRight: 'Custom software, AI & agents'
    },
    en: {
      nav: [
        { id: 'capaciteiten', label: 'Capabilities' },
        { id: 'diensten', label: 'Services' },
        { id: 'werkwijze', label: 'Process' },
        { id: 'over-ons', label: 'About' },
        { id: 'waarom', label: 'Why' },
        { id: 'faq', label: 'FAQ' },
        { id: 'contact', label: 'Contact' }
      ],
      words: ['AI', 'Software', 'Agents', 'Automation', 'Advice', 'Processes', 'Solutions', 'Architecture', 'Data'],
      title: 'Everware — Custom software, AI & autonomous agents',
      metaDesc: 'Everware — Dutch custom software agency. Bespoke software, AI solutions and autonomous agents, with personal attention.',
      ogDesc: 'From first conversation to autonomous agents. We build bespoke — with personal attention, stability and maintainability.',
      heroEyebrow: '~/everware — Custom software',
      heroTitleWord: 'Custom',
      heroDesc: 'From first conversation to autonomous agents. We build bespoke — with personal attention.',
      heroCta1: 'Book a call',
      heroCta2: 'View our process →',
      heroIndex: [
        { n: '01', label: 'Process optimization' },
        { n: '02', label: 'Design & architecture' },
        { n: '03', label: 'Custom software' },
        { n: '04', label: 'AI solutions' },
        { n: '05', label: 'Autonomous agents' },
        { n: '0A', label: 'Advisory' }
      ],
      status: ['Personal attention', 'Stability', 'Maintainability', 'Reliability'],
      whyEyebrow: '05 / Why Everware',
      whyH2: 'Off-the-shelf software forces your process. We improve your process.',
      whyLead: 'Most tools are built for the average customer — nothing about you is average! We start with your process and build around it.',
      whyColATitle: 'Off the shelf',
      whyColBTitle: 'Everware custom',
      whyColA: [
        'You bend your process to fit the software',
        'Pay for features you never use',
        "A helpdesk that doesn't know you",
        'Vendor lock-in and hidden limits',
        "A black box — you can't see what happens"
      ],
      whyColB: [
        'Software adapts to your process and actively helps you improve, accelerate and automate.',
        'Only what you need, nothing more',
        'One fixed team that knows you by name',
        'You own the code and the data',
        'Transparent — you follow along continuously'
      ],
      capEyebrow: '01 / Capabilities',
      capH2: "We build what doesn't exist yet.",
      capLead: 'No standard packages, no compromises. One team that masters the full stack — from foundation to autonomous agent — and stays with you.',
      capTags: ['Personal attention', 'Stability', 'Maintainability', 'Reliability'],
      capRows: [
        { label: 'Backend', lines: ['Python · PHP · Node', 'Java or Kotlin · Go · C++ · Rust'] },
        { label: 'Frontend', lines: ['React or Next · Vue or Nuxt', 'PWA · Web Components · WASM', 'React Native or Expo · iOS · Android'] },
        { label: 'AI & ML', lines: ["LLM's · RAG · Generative AI", 'fine-tuning · custom models'] },
        { label: 'Agents', lines: ['workflows · tool-use · orchestration'] },
        { label: 'Cloud & infra', lines: ['Railway · Fly.io · Vercel · Vultr · DigitalOcean · GCP · AWS · CI/CD'] },
        { label: 'Data', lines: ['pipelines · integrations · dashboards', 'MySQL · PostgreSQL · Supabase'] }
      ],
      svEyebrow: '02 / Services',
      svH2: 'What we do.',
      svCards: [
        { level: 'Level 01', title: 'Process optimization', desc: 'We map your processes and strip out the noise — before we build anything.', meta: 'Analysis · Workflows · Automation' },
        { level: 'Level 02', title: 'Design & architecture', desc: 'A foundation that grows with you — considered, designed for stability, not for haste.', meta: 'System design · Roadmap · UX' },
        { level: 'Level 03', title: 'Custom software', desc: 'Applications, platforms and internal tools — fully built around your processes.', meta: 'Native, web & mobile · Internal tools · Integrations' },
        { level: 'Level 04', title: 'AI solutions', desc: 'Custom AI that fits your data and processes — no demos, but something that reaches production.', meta: 'LLM applications · RAG · Custom models' },
        { level: 'Level 05', title: 'Autonomous agents', desc: 'Agents that take work off your hands — reliable, controllable, with a human at the helm.', meta: 'Workflows · Tool-use · Orchestration' },
        { level: 'Level 0A', title: 'Advisory', desc: 'Thinking along about the right choices — independent and objective.', meta: 'Second opinion · Strategy · Guidance' }
      ],
      wpEyebrow: '03 / Process',
      wpH2: 'Personal — from first conversation to years of maintenance.',
      wpStepWord: 'step',
      wpSteps: [
        { n: '01', title: 'Introduction', desc: "A short call. Who are you and what's your vision? We sense whether we're a match." },
        { n: '02', title: 'Brainstorm', desc: 'A longer session. Which problems or bottlenecks do you face — and what do you suspect you want to automate?' },
        { n: '03', title: 'Over coffee', desc: 'A tour of the house. Take us through your business — here we inventory the full current process.' },
        { n: '04', title: 'Design & architecture', desc: 'We optimize that process and design the software that supports the optimization.' },
        { n: '05', title: 'Build', desc: 'Custom, test-driven & AI-driven development — in short, visible iterations. Built for the long haul.' },
        { n: '06', title: 'Maintenance & evolution', desc: 'We stay involved. Maintainability and usability remain central — even after delivery.' }
      ],
      abEyebrow: '04 / About',
      abH2: 'Small team, full commitment.',
      abParas: [
        'Everware is a Dutch custom software agency. We build software, AI solutions and autonomous agents that fit your processes and tools — no standard packages, no compromises.',
        'We work with a small team where personal attention comes first. From the first conversation to years of maintenance. We build with stability and maintainability in mind, so what we make lasts for years.'
      ],
      abRows: [
        { label: 'Service area', lines: ['Netherlands · remote-first · on-site'] },
        { label: 'Focus', lines: ['custom software · AI · agents', 'process automation'] },
        { label: 'Approach', lines: ['personal · long-term involved'] }
      ],
      abTelLabel: 'Phone',
      abEmailLabel: 'Email',
      faqEyebrow: '06 / Frequently asked',
      faqH2: 'Frequently asked questions.',
      faqItems: [
        { q: 'What exactly does Everware do?', a: 'We build custom software, AI solutions and autonomous agents. From optimizing your processes to designing, building and maintaining the software around them — all under one roof.' },
        { q: 'Do you work with fixed packages?', a: 'No and yes. Everything we make is built to measure around your processes. We start with the problem, not a ready-made product. In many cases we can, however, connect to existing software if desired.' },
        { q: 'Who do you work for?', a: 'For organizations that hit the limits of standard software and need something that truly fits the way they work.' },
        { q: 'Which technologies do you use?', a: 'The full stack — from Python, PHP, Node, Java, Go, C++ and Rust to React and Vue, with LLMs, RAG and a choice of any AI model. We pick what fits your situation.' },
        { q: 'Do you stay involved after delivery?', a: 'Yes. Maintenance and further development are part of it. We stay involved so your software stays reliable and grows with you.' },
        { q: 'What does a project cost?', a: 'That depends on what you want to build. After a no-obligation introductory call we give a clear picture of scope and investment.' }
      ],
      ctH2: 'Ready for custom software?',
      ctLead: "Let's have a no-obligation chat. Calling or emailing costs nothing!",
      ctNaam: 'Name', ctNaamPh: 'Your name',
      ctEmail: 'Email', ctEmailPh: 'you@company.com',
      ctBedrijf: 'Company', ctBedrijfOpt: '— optional', ctBedrijfPh: 'Company name',
      ctIdea: 'What do you have in mind?', ctIdeaPh: 'Take us along!',
      ctSubmit: 'Send message →',
      ctOrPre: 'or email', ctOrMid: 'or call',
      ctAvg: 'By sending this you agree we may contact you about your request. No newsletter, no spam.',
      ctSentTag: '// sent',
      ctSentTitle: 'Thanks for your message.',
      ctSentBody: "We'll get back to you personally within one business day.",
      ctAgain: 'Send another message',
      ftTagline: 'Custom software, AI & autonomous agents — built to last.',
      ftContactHd: 'Contact', ftNavHd: 'Navigation',
      ftCopyLeft: '© 2026 Everware · Netherlands',
      ftCopyRight: 'Custom software, AI & agents'
    }
  };

  const state = { lang: CONFIG.defaultLang, i: 0, typed: '', phase: 'typing', activeId: '' };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const headerEl = document.getElementById('ew-header');
  const heroEl = document.getElementById('ew-hero');
  const webEl = document.getElementById('ew-web');
  const typedEl = document.getElementById('ew-typed');
  const titleEl = document.getElementById('ew-title');
  const groupEl = document.getElementById('ew-group');
  const navLinks = Array.from(document.querySelectorAll('.ew-navlink'));
  const nlBtn = document.getElementById('ew-lang-nl');
  const enBtn = document.getElementById('ew-lang-en');
  const formEl = document.getElementById('ew-form');
  const sentEl = document.getElementById('ew-sent');
  const againBtn = document.getElementById('ew-again');

  function accentRGB() {
    let hex = CONFIG.accentColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- i18n ----
  function get(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function applyLang(lang) {
    state.lang = lang;
    document.documentElement.lang = lang;
    const t = copy[lang];
    document.title = t.title;
    document.querySelector('meta[name="description"]').setAttribute('content', t.metaDesc);
    document.querySelector('meta[property="og:title"]').setAttribute('content', t.title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', t.ogDesc);
    document.querySelectorAll('[data-t]').forEach(el => {
      const v = get(t, el.getAttribute('data-t'));
      if (typeof v === 'string') el.textContent = v;
    });
    document.querySelectorAll('[data-t-ph]').forEach(el => {
      const v = get(t, el.getAttribute('data-t-ph'));
      if (typeof v === 'string') el.placeholder = v;
    });
    document.querySelectorAll('[data-letters]').forEach(el => {
      el.textContent = '';
      for (const ch of t.wpStepWord) {
        const s = document.createElement('span');
        s.textContent = ch;
        el.appendChild(s);
      }
    });
    const on = { color: CONFIG.accentColor, opacity: '1', fontWeight: '600' };
    const off = { color: 'inherit', opacity: '.5', fontWeight: '400' };
    Object.assign(nlBtn.style, lang === 'nl' ? on : off);
    Object.assign(enBtn.style, lang === 'en' ? on : off);
    state.i = 0;
    state.typed = '';
    state.phase = 'typing';
    renderTyped();
    startTyping();
    updateHeader();
  }

  // ---- typing rotator ----
  let typeTimer;

  function renderTyped() {
    typedEl.textContent = state.typed;
    flipAll();
  }

  function startTyping() {
    clearTimeout(typeTimer);
    // Wait two full cursor-blink cycles (2.2s) before the first keystroke.
    typeTimer = setTimeout(tick, 2200);
  }

  function tick() {
    const words = copy[state.lang].words;
    const full = words[state.i] || '';
    let delay;
    if (state.phase === 'deleting') {
      if (state.typed.length === 0) {
        state.phase = 'typing';
        state.i = (state.i + 1) % words.length;
        delay = 260;
      } else {
        state.typed = state.typed.slice(0, -1);
        delay = 42 + Math.random() * 34;
      }
    } else {
      if (state.typed.length >= full.length) {
        state.phase = 'deleting';
        delay = CONFIG.rotateMs;
      } else {
        state.typed = full.slice(0, state.typed.length + 1);
        delay = 110 + Math.random() * 95;
      }
    }
    renderTyped();
    typeTimer = setTimeout(tick, delay);
  }

  // ---- FLIP animation: title/group glide when the hero line reflows ----
  const flipPos = {};

  function flipAll() {
    flipEl(groupEl, 'group');
    flipEl(titleEl, 'title');
  }

  function flipEl(el, key) {
    if (!el) return;
    const now = { top: el.offsetTop, left: el.offsetLeft };
    const last = flipPos[key];
    flipPos[key] = now;
    if (!last) return;
    const dx = last.left - now.left;
    const dy = last.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.75,.2,1)';
      el.style.transform = 'translate(0, 0)';
    });
  }

  // ---- header theme + active nav ----
  function updateHeader() {
    const probeY = headerEl.getBoundingClientRect().bottom * 0.5 || 30;
    let theme = 'dark';
    document.querySelectorAll('[data-theme]').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) theme = s.getAttribute('data-theme') || 'dark';
    });
    const aProbe = (headerEl.getBoundingClientRect().bottom || 60) + 40;
    let active = '';
    document.querySelectorAll('section[id]').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= aProbe && r.bottom > aProbe) active = s.id;
    });
    headerEl.style.background = theme === 'light' ? '#f6f5f2' : '#050505';
    headerEl.style.color = theme === 'light' ? '#0a0a0a' : '#fff';
    if (active !== state.activeId) {
      state.activeId = active;
      navLinks.forEach(a => {
        const isActive = a.dataset.nav === active;
        a.style.color = isActive ? CONFIG.accentColor : 'inherit';
        a.style.opacity = isActive ? '1' : '.62';
      });
    }
  }

  // ---- drifting/breathing glows ----
  function startGlows() {
    const glows = Array.from(document.querySelectorAll('[data-glow]'));
    if (!glows.length || reduceMotion) return;
    glows.forEach((g, i) => {
      g.style.willChange = 'transform';
      g._cfg = {
        breatheOnly: g.hasAttribute('data-breathe-only'),
        base: g.getAttribute('data-base') || 'none',
        phase: i * 1.7,
        bSpeed: 0.95 + i * 0.12,
        bAmp: 0.22 + (i % 2) * 0.06,
        driftX: 34 + (i % 3) * 14,
        driftY: 28 + (i % 2) * 16,
        dSpeed: 0.28 + i * 0.05,
        parallax: g.hasAttribute('data-parallax') ? parseFloat(g.getAttribute('data-parallax')) : 0.34 + (i % 2) * 0.10
      };
    });
    const glowTick = (now) => {
      const t = now / 1000;
      const vh = window.innerHeight || 800;
      for (const g of glows) {
        const c = g._cfg;
        if (c.breatheOnly) {
          const s = 1 + Math.sin(t * c.bSpeed + c.phase) * c.bAmp;
          const b = c.base === 'none' ? '' : c.base + ' ';
          g.style.transform = `${b}scale(${s.toFixed(4)})`;
          continue;
        }
        const r = g.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
        const scrollDX = p * vh * c.parallax * 0.5;
        const scrollDY = p * vh * c.parallax;
        const dx = Math.sin(t * c.dSpeed + c.phase) * c.driftX + scrollDX;
        const dy = Math.cos(t * c.dSpeed * 0.8 + c.phase) * c.driftY + scrollDY;
        const scale = 1 + Math.sin(t * c.bSpeed + c.phase) * c.bAmp;
        const base = c.base === 'none' ? '' : c.base + ' ';
        g.style.transform = `${base}translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`;
      }
      requestAnimationFrame(glowTick);
    };
    requestAnimationFrame(glowTick);
  }

  // ---- hero pointer web canvas ----
  function startWeb() {
    if (!webEl || !heroEl || reduceMotion) return;
    const ctx = webEl.getContext('2d');
    const dots = new Map();
    const pointer = { x: 0, y: 0, active: false };
    let lastMove = performance.now();
    let lastT = performance.now();
    let growth = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      webEl.width = Math.round(heroEl.clientWidth * dpr);
      webEl.height = Math.round(heroEl.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(heroEl);

    window.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (inside) {
        if (Math.hypot(x - pointer.x, y - pointer.y) > 2.5) lastMove = performance.now();
        pointer.x = x; pointer.y = y; pointer.active = true;
      } else pointer.active = false;
    }, { passive: true });
    window.addEventListener('mouseout', () => { pointer.active = false; }, { passive: true });

    const webTick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const w = heroEl.clientWidth, h = heroEl.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = accentRGB();
      const moving = (now - lastMove) < 90;
      const target = pointer.active ? (moving ? 0.06 : 1) : 0;
      const k = target > growth ? 0.85 : (pointer.active ? 0.9 : 2.2);
      growth += (target - growth) * Math.min(1, dt * k);
      const R = 66 + growth * 270;
      const GS = 28, OFF = 14;
      if (pointer.active) {
        const { x, y } = pointer;
        const i0 = Math.floor((x - R - OFF) / GS), i1 = Math.ceil((x + R - OFF) / GS);
        const j0 = Math.floor((y - R - OFF) / GS), j1 = Math.ceil((y + R - OFF) / GS);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const dx = OFF + GS * i, dy = OFF + GS * j;
          if (dx < 0 || dy < 0 || dx > w || dy > h) continue;
          const dist = Math.hypot(dx - x, dy - y);
          if (dist > R) continue;
          const key = i + ',' + j;
          let d = dots.get(key);
          if (!d) { d = { x: dx, y: dy, s: 0, ex: x, ey: y, p: 0 }; dots.set(key, d); }
          const p = 1 - dist / R;
          d.s = Math.max(d.s, Math.min(1, d.s + dt * 3.2 * p, p));
          d.ex = x; d.ey = y; d.p = p; d._live = true;
        }
      }
      ctx.lineWidth = 1;
      for (const [key, d] of dots) {
        const isLive = d._live;
        d._live = false;
        if (!isLive) d.s -= dt * 0.85;
        if (d.s <= 0.012) { dots.delete(key); continue; }
        const prox = 0.4 + 0.6 * (d.p || 0.4);
        const a = d.s * prox * (isLive ? (0.055 + 0.15 * growth) : 0.03);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath(); ctx.moveTo(d.ex, d.ey); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.75, a * 1.6)})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, isLive ? 1.8 : 1.3, 0, 6.2832); ctx.fill();
      }
      if (pointer.active) {
        const ca = 0.22 + 0.5 * growth;
        ctx.fillStyle = `rgba(${r},${g},${b},${ca})`;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 2.4, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${ca * 0.4})`;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 7 + growth * 6, 0, 6.2832); ctx.stroke();
      }
      requestAnimationFrame(webTick);
    };
    requestAnimationFrame(webTick);
  }

  // ---- contact form ----
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    formEl.style.display = 'none';
    sentEl.style.display = 'block';
  });
  againBtn.addEventListener('click', () => {
    sentEl.style.display = 'none';
    formEl.style.display = 'grid';
  });

  // ---- init ----
  document.addEventListener('scroll', updateHeader, true);
  window.addEventListener('resize', updateHeader, { passive: true });

  // Language is fixed per page: / is Dutch, /en/ is English (static, crawlable).
  // The NL/EN toggle navigates between them; applyLang only re-affirms the
  // current page's strings and drives the language-dependent JS (typing words).
  applyLang(document.documentElement.lang === 'en' ? 'en' : CONFIG.defaultLang);
  startGlows();
  startWeb();
})();
