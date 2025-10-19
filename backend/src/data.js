const { randomUUID } = require('crypto');
const { createPasswordRecord } = require('./security');
const storage = require('./storage');

const now = () => new Date().toISOString();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateSecurePassword() {
  return `Auto${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

const studentPassword = createPasswordRecord('Student123!');
const mentorPassword = createPasswordRecord('Mentor123!');
const adminPassword = createPasswordRecord('Admin123!');

const refreshTokens = new Map();
const revokedRefreshTokens = new Set();

const users = [
  {
    id: 'user-student-1',
    email: 'ada@student.learnzo.io',
    name: 'Ada Student',
    role: 'student',
    locale: 'nl-NL',
    avatar: 'https://placehold.co/128x128',
    createdAt: now(),
    subscription: {
      plan: 'pro-monthly',
      status: 'active',
      start: '2025-01-01T00:00:00.000Z',
      renewal: '2025-02-01T00:00:00.000Z',
      trialEndsAt: null
    },
    auth: {
      password: studentPassword,
      mfaEnabled: false,
      lastLoginAt: null,
      lastPasswordChangeAt: now()
    }
  },
  {
    id: 'user-mentor-1',
    email: 'mina.mentor@learnzo.io',
    name: 'Mina Mentor',
    role: 'mentor',
    locale: 'nl-NL',
    avatar: 'https://placehold.co/128x128',
    createdAt: now(),
    subscription: null,
    auth: {
      password: mentorPassword,
      mfaEnabled: true,
      lastLoginAt: null,
      lastPasswordChangeAt: now()
    }
  },
  {
    id: 'user-admin-1',
    email: 'alex.admin@learnzo.io',
    name: 'Alex Admin',
    role: 'admin',
    locale: 'nl-NL',
    avatar: 'https://placehold.co/128x128',
    createdAt: now(),
    subscription: null,
    auth: {
      password: adminPassword,
      mfaEnabled: true,
      lastLoginAt: null,
      lastPasswordChangeAt: now()
    }
  }
];

const modulesFrontend = [
  {
    id: 'module-web-basics',
    title: 'Web Basics',
    overview: 'HTML, CSS en de basis van toegankelijkheid.',
    whyItMatters:
      'Zonder semantiek en toegankelijkheid worden websites onbruikbaar voor veel gebruikers. Deze module bouwt een mindset op waarin elke UI-keuze wordt gekoppeld aan inclusie en performance.',
    realWorldScenarios: [
      'Herstructureer een marketingpagina zodat screenreaders en keyboardgebruikers dezelfde flow ervaren.',
      'Maak een responsieve layout die op low-end devices snel en stabiel laadt.'
    ],
    evidenceOfMastery: [
      'Je kunt uitleggen waarom een bepaald HTML-element semantisch klopt.',
      'Je levert een mini-audit op van contrast en focus states.'
    ],
    learningGoals: [
      'HTML structuur begrijpen',
      'Toegankelijke formulieren bouwen',
      'Responsieve layouts maken'
    ],
    estimatedMinutes: 240,
    prerequisites: []
  },
  {
    id: 'module-js-core',
    title: 'JavaScript Core',
    overview: 'Fundamenten van JavaScript en browser APIs.',
    whyItMatters:
      'JavaScript is het brein van moderne webproducten. Deze module verbindt syntaxis aan intentie, zodat studenten begrijpen wanneer en waarom ze bepaalde patronen inzetten.',
    realWorldScenarios: [
      'Debug een regressie in een async dataflow en leg uit waarom de bug ontstond.',
      'Herschrijf imperative code naar declaratieve array-methoden met duidelijke intentie.'
    ],
    evidenceOfMastery: [
      'Je kunt aan een peer uitleggen hoe closures state isoleren.',
      'Je gebruikt array-methoden om product metrics te berekenen zonder side-effects.'
    ],
    learningGoals: [
      'Control flow toepassen',
      'Werken met arrays en objecten',
      'Asynchrone code begrijpen'
    ],
    estimatedMinutes: 360,
    prerequisites: ['module-web-basics']
  }
];

const courses = [];

courses.push({
  id: 'course-web-foundations',
  pathId: 'path-frontend',
  slug: 'web-foundations',
  title: 'Web Foundations',
  description:
    'Leg het fundament voor elke digitale ervaring met focus op toegankelijkheid, semantiek en performance thinking.',
  whyItMatters:
    'Een sterke basis voorkomt technische schuld. Door te begrijpen waarom HTML-structuur, CSS-architectuur en toegankelijkheid ertoe doen, bouwen studenten producten die duurzaam zijn.',
  durationWeeks: 4,
  modules: ['module-web-basics'],
  outcomes: [
    'Semantische layouts afleveren die WCAG AA halen',
    'Een responsieve pagina optimaliseren tot LCP < 2.5s',
    'Reflecteren op toegankelijkheidsbeslissingen in documentatie'
  ],
  reflectionPrompts: [
    'Welke ontwerpkeuzes heb je gemaakt om inclusie te waarborgen?',
    'Hoe zou je jouw pagina uitleggen aan iemand zonder technische achtergrond?'
  ],
  assessment:
    'Ontwerp een volledige landingspagina, toets met keyboard-only navigatie en lever een toegankelijkheidslogboek op.'
});

courses.push({
  id: 'course-javascript-essentials',
  pathId: 'path-frontend',
  slug: 'javascript-essentials',
  title: 'JavaScript Essentials',
  description:
    'Verbind JavaScript concepten aan gebruikerswaarde door bewuste keuzes te maken in dataflows, state management en async gedrag.',
  whyItMatters:
    'Weten hoe en waarom code werkt zorgt voor leesbare, onderhoudbare features en snellere debugging.',
  durationWeeks: 6,
  modules: ['module-js-core'],
  outcomes: [
    'Asynchrone workflows modelleren met duidelijke intentie',
    'Code reviews schrijven die focussen op het “waarom” in plaats van enkel het “hoe”',
    'Data-transformaties onderbouwen met domeinkennis'
  ],
  reflectionPrompts: [
    'Welke aannames liggen onder je oplossing en zijn die valide?',
    'Welke metrics zou je gebruiken om succes van je oplossing te meten?'
  ],
  assessment:
    'Bouw een data dashboard met fetch + array-methoden en schrijf een retro over technische trade-offs.'
});

const languageTrackDefinitions = [];

languageTrackDefinitions.push({
  language: 'Python',
  slug: 'python',
  level: 'intermediate',
  durationWeeks: 16,
  description:
    'Guide Python developers from fundamentals to production ML and automation with WHY-first storytelling and reflective practice.',
  audience:
    'Analytical builders who want to connect experimentation with reliable services for data-driven teams.',
  outcomes: [
    'Translate stakeholder problems into reproducible notebooks and APIs',
    'Ship data pipelines with observability and ethical guardrails',
    'Defend ML trade-offs with clear documentation and retrospectives'
  ],
  bestFitCareers: [
    'Data science/ML',
    'backend APIs',
    'automation',
    'DevOps',
    'Machine Learning Engineer',
    'Data-engineer',
    'DevOps engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['python', 'ml', 'data', 'backend'],
  coreThemes: ['experimentation naar productie', 'ethische automatisering', 'modelimpact uitleggen'],
  signatureUseCases: [
    'Vertaal een businessvraag naar een notebook en leg in een logboek vast waarom je gekozen features werken.',
    'Refactor een script naar een service met tracing zodat on-call collega’s blind spots voorkomen.',
    'Analyseer een model op bias en communiceer mitigerende acties naar stakeholders.'
  ],
  whyThisPath:
    'Python verbindt exploratie met productie. Deze route benadrukt WHY-first reflecties zodat teams jouw modellen en services vertrouwen.'
});

languageTrackDefinitions.push({
  language: 'TypeScript',
  slug: 'typescript',
  level: 'intermediate',
  durationWeeks: 14,
  description:
    'Master type-safe product development that scales from design systems to API orchestration.',
  audience:
    'Frontend en full-stack engineers die bugs willen voorkomen door intentie expliciet te maken.',
  outcomes: [
    'Ontwerp design system componenten met expliciete contracten',
    'Bewijs hoe type-informatie regressies voorkomt in Node-services',
    'Verbind DX met bedrijfsdoelen in engineering reviews'
  ],
  bestFitCareers: [
    'Frontend (React/Next)',
    'full-stack',
    'Node.js backend',
    'Full-Stack Software Engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['typescript', 'react', 'node'],
  coreThemes: ['intentie documenteren', 'typegedreven ontwerp', 'teamafspraken afdwingen'],
  signatureUseCases: [
    'Introduceer strict typing in een bestaande React codebase en leg uit welke bugs zijn voorkomen.',
    'Ontwerp een contract tussen frontend en backend en toon hoe types alignment versnellen.',
    'Schrijf een DX memo waarin je uitlegt waarom tooling investeringen burn-down reduceren.'
  ],
  whyThisPath:
    'TypeScript maakt het “waarom” van architectuur tastbaar. Je leert elke typekeuze koppelen aan betrouwbaarheid en snelheid.'
});

languageTrackDefinitions.push({
  language: 'JavaScript',
  slug: 'javascript',
  level: 'beginner',
  durationWeeks: 12,
  description:
    'Build a confident JavaScript practice that links UI behaviour, tooling, and runtime performance to customer value.',
  audience:
    'Beginnende developers die webproducten willen bouwen met bewuste keuzes in tooling en architectuur.',
  outcomes: [
    'Leg asynchrone patronen uit aan stakeholders',
    'Selecteer de juiste bundling en performance strategie per feature',
    'Onderbouw designbeslissingen met meetbare KPI’s'
  ],
  bestFitCareers: [
    'Frontend',
    'full-stack',
    'Node.js tooling',
    'Full-Stack Software Engineer'
  ],
  focusTags: ['javascript', 'frontend', 'tooling'],
  coreThemes: ['user impact meten', 'performance als producteigenschap', 'teamafspraken delen'],
  signatureUseCases: [
    'Herleid een regressie in de event loop en schrijf een incident review gericht op leereffect.',
    'Introduceer bundling-splitsing en toon hoe het LCP verbetert voor klanten.',
    'Faciliteer een workshop waarin collega’s WHY-first code reviews oefenen.'
  ],
  whyThisPath:
    'JavaScript is overal. Deze route laat zien hoe je niet alleen features bouwt maar ook uitlegt waarom elke keuze gebruikerswaarde oplevert.'
});

languageTrackDefinitions.push({
  language: 'Java',
  slug: 'java',
  level: 'intermediate',
  durationWeeks: 16,
  description:
    'Deliver enterprise-ready Java services met duidelijke verantwoording richting compliance en productteams.',
  audience:
    'Engineers die microservices en enterprise integraties willen moderniseren.',
  outcomes: [
    'Vertaal business rules naar onderhoudbare domain services',
    'Pas observability toe om SLA’s te beschermen',
    'Leg performance trade-offs uit aan architectuur boards'
  ],
  bestFitCareers: [
    'Backend enterprise',
    'Android (legacy)',
    'big data',
    'Backend Software Engineer'
  ],
  focusTags: ['java', 'spring', 'enterprise'],
  coreThemes: ['domain-driven design', 'compliance auditability', 'schaalbare architectuur'],
  signatureUseCases: [
    'Map legacy business rules naar een bounded context en schrijf een decision record.',
    'Implementeer observability op een Spring service en leg SLO-resultaten uit aan product.',
    'Optimaliseer een JVM service voor throughput en documenteer risico’s.'
  ],
  whyThisPath:
    'Java blijft cruciaal in enterprise. Je oefent hoe je technische beslissingen koppelt aan risico, compliance en klantwaarde.'
});

languageTrackDefinitions.push({
  language: 'C#',
  slug: 'csharp',
  level: 'intermediate',
  durationWeeks: 15,
  description:
    'Combineer .NET engineering met business storytelling zodat stakeholders begrijpen waarom jouw services vertrouwen verdienen.',
  audience:
    'Developers die enterprise apps, API’s en game backends willen bouwen met duurzame patronen.',
  outcomes: [
    'Ontwikkel onderhoudbare services met dependency injection',
    'Leg architectuurkeuzes uit richting product en security',
    'Koppel telemetrie aan service level doelstellingen'
  ],
  bestFitCareers: [
    'Backend (.NET)',
    'enterprise apps',
    'game dev (Unity)',
    'Backend Software Engineer'
  ],
  focusTags: ['csharp', 'dotnet', 'unity'],
  coreThemes: ['architectuur met impact', 'service kwaliteit meten', 'cross-team alignment'],
  signatureUseCases: [
    'Refactor een monoliet naar modulaire diensten en beschrijf het waarom per stap.',
    'Implementeer observability in een .NET API en deel een service review.',
    'Vertaal game loop eisen naar schaalbare backend patterns.'
  ],
  whyThisPath:
    '.NET projecten vragen om uitlegbaarheid. Deze route koppelt elke feature aan bedrijfs- en player-impact.'
});

languageTrackDefinitions.push({
  language: 'Go',
  slug: 'go',
  level: 'intermediate',
  durationWeeks: 14,
  description:
    'Leer Go inzetten voor cloud services met focus op betrouwbaarheid, observability en platform alignment.',
  audience:
    'Engineers die schaalbare infrastructuur, tooling of platformteams willen ondersteunen.',
  outcomes: [
    'Leg concurrency patronen uit in termen van betrouwbaarheid',
    'Ontwerp CLI tooling die developer workflows versnelt',
    'Koppel SLO’s aan Go services met meetbare dashboards'
  ],
  bestFitCareers: [
    'Cloud services',
    'DevOps tooling',
    'distributed systems',
    'DevOps engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['go', 'cloud', 'platform'],
  coreThemes: ['betrouwbare infrastructuur', 'operationele eenvoud', 'developer ervaring'],
  signatureUseCases: [
    'Bouw een concurrent workersysteem en leg throttling beslissingen uit.',
    'Ontwerp een CLI die platform workflows documenteert en meet impact.',
    'Integreer tracing in een Go service en bespreek on-call lessons learned.'
  ],
  whyThisPath:
    'Go shineert wanneer betrouwbaarheid telt. Deze route benadrukt waarom eenvoud en observability directe businesswaarde leveren.'
});

languageTrackDefinitions.push({
  language: 'Rust',
  slug: 'rust',
  level: 'advanced',
  durationWeeks: 16,
  description:
    'Gebruik Rust voor systemen waar veiligheid, performance en vertrouwen centraal staan.',
  audience:
    'Engineers die systemen bouwen voor infra, embedded of security tooling.',
  outcomes: [
    'Leg ownership en borrowing uit richting niet-Rust teams',
    'Ontwikkel veilige componenten voor embedded of crypto workloads',
    'Documenteer threat models en mitigaties in technical reviews'
  ],
  bestFitCareers: [
    'Systems',
    'performance-critical services',
    'embedded',
    'crypto infra',
    'Cybersecurity Engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['rust', 'systems', 'security'],
  coreThemes: ['memory safety uitleggen', 'performance met rationale', 'secure defaults'],
  signatureUseCases: [
    'Schrijf een component met zero-copy en leg de impact op latency uit.',
    'Implementeer veilige FFI grenzen en documenteer risico’s.',
    'Maak een threat model voor een service en koppel aan Rust features.'
  ],
  whyThisPath:
    'Rust vraagt bewuste keuzes. Je leert waarom safety features vertrouwen winnen bij security en infra teams.'
});

languageTrackDefinitions.push({
  language: 'Kotlin',
  slug: 'kotlin',
  level: 'intermediate',
  durationWeeks: 14,
  description:
    'Combineer Kotlin voor Android en backend zodat je consistente ervaringen levert met gedeelde WHY-first patronen.',
  audience:
    'Mobile en backend engineers die product parity en schaalbaarheid willen garanderen.',
  outcomes: [
    'Leg multiplatform keuzes uit aan product teams',
    'Ontwerp coroutine flows met focus op UX en resilience',
    'Documenteer API contracten die mobile en backend uitlijnen'
  ],
  bestFitCareers: [
    'Android',
    'backend (Ktor/Spring)',
    'multiplatform',
    'Full-Stack Software Engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['kotlin', 'android', 'ktor'],
  coreThemes: ['multiplatform alignment', 'asynchrone patronen', 'team storytelling'],
  signatureUseCases: [
    'Introduceer shared modules in een Android app en motiveer ROI.',
    'Ontwerp een coroutine flow met retry strategieën en documenteer UX impact.',
    'Schrijf een API decision record dat mobile en backend teams verbindt.'
  ],
  whyThisPath:
    'Kotlin verbindt teams. We benadrukken waarom elke architectuurkeuze gebruikerservaring en velocity beïnvloedt.'
});

languageTrackDefinitions.push({
  language: 'Swift',
  slug: 'swift',
  level: 'intermediate',
  durationWeeks: 12,
  description:
    'Ship Swift apps that articuleren waarom UX keuzes, tooling en platform guidelines directe waarde leveren.',
  audience:
    'iOS/macOS engineers die product-betekenis willen koppelen aan technische implementatie.',
  outcomes: [
    'Vertaal Human Interface Guidelines naar meetbare productprincipes',
    'Introduceer SwiftUI architectuur met duidelijke trade-offs',
    'Leg performance optimalisaties uit aan product en QA teams'
  ],
  bestFitCareers: [
    'iOS/macOS apps',
    'Apple ecosystem',
    'Full-Stack Software Engineer'
  ],
  focusTags: ['swift', 'ios', 'swiftui'],
  coreThemes: ['design intent vastleggen', 'productkwaliteit bewaken', 'ecosysteem integratie'],
  signatureUseCases: [
    'Ontwerp een onboarding flow en onderbouw UX-keuzes met data.',
    'Refactor UIKit naar SwiftUI en beschrijf impact op velocity.',
    'Optimaliseer rendering en lever een notitie voor stakeholders.'
  ],
  whyThisPath:
    'Swift projecten vragen bewuste UX storytelling. Deze route leert je hoe je technische keuzes koppelt aan productbeleving.'
});

languageTrackDefinitions.push({
  language: 'C++',
  slug: 'cpp',
  level: 'advanced',
  durationWeeks: 18,
  description:
    'Ontwikkel high-performance C++ systemen met nadruk op veiligheid, determinisme en stakeholders vertrouwen.',
  audience:
    'Engineers in games, trading of embedded die prestaties én uitlegbaarheid moeten combineren.',
  outcomes: [
    'Leg geheugen- en latency keuzes uit aan productteams',
    'Ontwikkel profilers en tooling die bugs sneller signaleren',
    'Vertaal performantie metrics naar business impact'
  ],
  bestFitCareers: [
    'High-perf systems',
    'games/engines',
    'trading/quant',
    'embedded',
    'Cybersecurity Engineer'
  ],
  focusTags: ['cpp', 'performance', 'systems'],
  coreThemes: ['determinisme uitleggen', 'performance storytelling', 'risicobeperking'],
  signatureUseCases: [
    'Optimaliseer een engine subsysteem en communiceer FPS-winst.',
    'Voer een security review uit op memory management en documenteer mitigaties.',
    'Schrijf een postmortem voor een race condition met lessons learned.'
  ],
  whyThisPath:
    'C++ vraagt discipline. Deze route koppelt elke optimalisatie aan business metrics en risicobeheersing.'
});

languageTrackDefinitions.push({
  language: 'C',
  slug: 'c',
  level: 'advanced',
  durationWeeks: 18,
  description:
    'Beheer low-level systemen met focus op reliability, beveiliging en hardware-aware storytelling.',
  audience:
    'Engineers die firmware, drivers of security tooling onderhouden.',
  outcomes: [
    'Documenteer geheugenbeheer beslissingen voor audits',
    'Ontwerp realtime componenten die latencies verklaren',
    'Communiceer security mitigaties richting leiderschap'
  ],
  bestFitCareers: [
    'OS/embedded',
    'drivers',
    'firmware',
    'RT systems',
    'Cybersecurity Engineer'
  ],
  focusTags: ['c', 'embedded', 'security'],
  coreThemes: ['hardware constraints uitleggen', 'veiligheid borgen', 'realtime garanties'],
  signatureUseCases: [
    'Implementeer een driver en motiveer timing keuzes richting QA.',
    'Voer een secure coding review uit en leg mitigaties vast.',
    'Simuleer realtime failures en bespreek fallbacks met stakeholders.'
  ],
  whyThisPath:
    'C vormt de basis van veel infrastructuur. We leren je waarom elke pointerbeslissing effect heeft op veiligheid en uptime.'
});

languageTrackDefinitions.push({
  language: 'PHP',
  slug: 'php',
  level: 'beginner',
  durationWeeks: 10,
  description:
    'Bouw onderhoudbare PHP applicaties met focus op contentplatformen, commerce en snelle iteratie.',
  audience:
    'Teams die CMS, e-commerce of membership experiences willen lanceren met duidelijke waardecommunicatie.',
  outcomes: [
    'Leg lifecycle hooks uit richting marketing en contentteams',
    'Ontwerp betalingsflows met duidelijke risk controls',
    'Documenteer performance keuzes voor groeiplannen'
  ],
  bestFitCareers: [
    'Web backend (Laravel)',
    'CMS/e-commerce',
    'Full-Stack Software Engineer'
  ],
  focusTags: ['php', 'laravel', 'commerce'],
  coreThemes: ['snel itereren met structuur', 'commerce betrouwbaarheid', 'stakeholder communicatie'],
  signatureUseCases: [
    'Ontwerp een content release workflow en leg technische eisen uit.',
    'Implementeer een checkout en bespreek fraude mitigaties.',
    'Maak een performance plan voor campagnes met verwachte load.'
  ],
  whyThisPath:
    'PHP-producten draaien vaak revenue. Deze route toont hoe je features koppelt aan conversie en betrouwbaarheid.'
});

languageTrackDefinitions.push({
  language: 'Ruby',
  slug: 'ruby',
  level: 'beginner',
  durationWeeks: 12,
  description:
    'Gebruik Ruby on Rails voor snelle innovatie met een scherp oog voor storytelling en tech debt management.',
  audience:
    'Startups en product teams die waarde willen shippen zonder het waarom uit het oog te verliezen.',
  outcomes: [
    'Leg conventies uit die velocity verhogen',
    'Introduceer service objects met duidelijke business rationale',
    'Documenteer experiment resultaten en vervolgstappen'
  ],
  bestFitCareers: [
    'Web backend (Rails)',
    'startups/prototyping',
    'Full-Stack Software Engineer'
  ],
  focusTags: ['ruby', 'rails', 'product'],
  coreThemes: ['conventies benutten', 'snelle feedback lussen', 'waarde communiceren'],
  signatureUseCases: [
    'Bouw een feature-flagged experiment en leg leerdoelen vast.',
    'Refactor een ActiveRecord callback en motiveer leesbaarheid.',
    'Schrijf een product retro waarin codebeslissingen en metrics samenkomen.'
  ],
  whyThisPath:
    'Rails draait om snelheid met discipline. Je leert hoe je experimenten verantwoord levert en uitlegt aan stakeholders.'
});

languageTrackDefinitions.push({
  language: 'Scala',
  slug: 'scala',
  level: 'advanced',
  durationWeeks: 16,
  description:
    'Ontwikkel Scala systemen voor data engineering en functionele backends met nadruk op uitlegbaarheid.',
  audience:
    'Data engineers en backend teams die betrouwbaarheid en expressiviteit combineren.',
  outcomes: [
    'Leg functionele patronen uit in termen van testbaarheid',
    'Ontwerp Spark pipelines met duidelijke governance',
    'Documenteer data lineage voor stakeholders'
  ],
  bestFitCareers: [
    'Data engineering (Spark)',
    'backend FP on JVM',
    'Data-engineer',
    'Backend Software Engineer'
  ],
  focusTags: ['scala', 'spark', 'fp'],
  coreThemes: ['functioneel denken', 'data governance', 'betrouwbare pipelines'],
  signatureUseCases: [
    'Implementeer een Spark job en leg optimalisaties uit.',
    'Ontwerp een type-safe API en documenteer contracten.',
    'Bouw een lineage dashboard en vertel het verhaal aan data stakeholders.'
  ],
  whyThisPath:
    'Scala vraagt precisie. Je oefent hoe je abstracties vertaalt naar concrete waarde voor data en platform teams.'
});

languageTrackDefinitions.push({
  language: 'R',
  slug: 'r',
  level: 'intermediate',
  durationWeeks: 12,
  description:
    'Gebruik R voor analytische storytelling, statistiek en reproducible research met duidelijke verantwoording.',
  audience:
    'Analisten en onderzoekers die inzichten geloofwaardig willen presenteren.',
  outcomes: [
    'Leg statistische keuzes uit aan niet-technische stakeholders',
    'Bouw reproducible rapportages met versiebeheer',
    'Definieer kwaliteitschecks voor data en modellen'
  ],
  bestFitCareers: [
    'Statistics',
    'research analytics',
    'bioinformatics',
    'Data-engineer',
    'Machine Learning Engineer'
  ],
  focusTags: ['r', 'statistics', 'analytics'],
  coreThemes: ['transparante analyses', 'reproducibility', 'ethiek in data'],
  signatureUseCases: [
    'Ontwerp een experiment en leg de statistische power uit.',
    'Automatiseer rapportage met RMarkdown en motiveer governance.',
    'Communiceer onzekerheid naar leiderschap met heldere visuals.'
  ],
  whyThisPath:
    'R draait om vertrouwen in inzichten. Je leert waarom transparantie en reproduceerbaarheid business-impact vergroten.'
});

languageTrackDefinitions.push({
  language: 'SQL',
  slug: 'sql',
  level: 'beginner',
  durationWeeks: 8,
  description:
    'Maak data assets betrouwbaar met SQL die context, governance en business storytelling centraal zet.',
  audience:
    'Analisten en engineers die betere beslissingen willen mogelijk maken met betrouwbare data.',
  outcomes: [
    'Vertaal productvragen naar meetbare query’s',
    'Documenteer data definities en quality checks',
    'Onderbouw dashboards met duidelijke aannames'
  ],
  bestFitCareers: [
    'Data engineering',
    'analytics',
    'BI',
    'warehousing',
    'Data-engineer',
    'Machine Learning Engineer'
  ],
  focusTags: ['sql', 'data', 'analytics'],
  coreThemes: ['betrouwbare metrics', 'governance', 'communiceren met stakeholders'],
  signatureUseCases: [
    'Bouw een metric definities document en koppel aan query’s.',
    'Implementeer data quality checks en leg impact uit.',
    'Presenteer een dashboard review met vervolgexperimenten.'
  ],
  whyThisPath:
    'SQL vormt de basis van beslissingen. We laten zien waarom heldere definities en checks vertrouwen verdienen.'
});

languageTrackDefinitions.push({
  language: 'Dart',
  slug: 'dart',
  level: 'intermediate',
  durationWeeks: 12,
  description:
    'Ontwerp Flutter experiences die consistente UX en backend logica verbinden voor multi-platform teams.',
  audience:
    'Developers die cross-platform apps willen leveren met duidelijke rationale richting design en product.',
  outcomes: [
    'Leg architectuurkeuzes uit tussen widgets en state management',
    'Synchroniseer mobiele experiences met backend contracten',
    'Documenteer release-health en experiment resultaten'
  ],
  bestFitCareers: [
    'Cross-platform apps (Flutter)',
    'Full-Stack Software Engineer'
  ],
  focusTags: ['dart', 'flutter', 'mobile'],
  coreThemes: ['consistente UX', 'state management rationale', 'team alignment'],
  signatureUseCases: [
    'Introduceer een state management pattern en motiveer design impact.',
    'Bouw een multiplatform release plan en communiceer risico’s.',
    'Analyseer telemetry om UX beslissingen bij te sturen.'
  ],
  whyThisPath:
    'Flutter vraagt consistente keuzes. Deze route legt vast waarom architectuur beslissingen directe impact hebben op UX en velocity.'
});

languageTrackDefinitions.push({
  language: 'Elixir',
  slug: 'elixir',
  level: 'advanced',
  durationWeeks: 14,
  description:
    'Lever realtime systemen met Elixir die betrouwbaarheid, schaal en humane DX combineren.',
  audience:
    'Teams die Phoenix apps, realtime features of distributed backends bouwen.',
  outcomes: [
    'Leg BEAM concurrency uit richting product en ops',
    'Ontwerp fault-tolerante systemen met duidelijke fallback strategieën',
    'Documenteer klantimpact van realtime features'
  ],
  bestFitCareers: [
    'Realtime web (Phoenix)',
    'distributed backends',
    'Backend Software Engineer'
  ],
  focusTags: ['elixir', 'phoenix', 'realtime'],
  coreThemes: ['resilience', 'collaboratieve DX', 'waardegerichte features'],
  signatureUseCases: [
    'Bouw een live dashboard en documenteer message flows.',
    'Implementeer leer-gebaseerde retries en motiveer klantimpact.',
    'Schrijf een on-call playbook dat stakeholders vertrouwen geeft.'
  ],
  whyThisPath:
    'Elixir excelleert in realtime. We koppelen elk pattern aan klantwaarde en operationele rust.'
});

languageTrackDefinitions.push({
  language: 'Haskell',
  slug: 'haskell',
  level: 'advanced',
  durationWeeks: 16,
  description:
    'Gebruik Haskell voor betrouwbare backends, compilers of research tooling met uitlegbaarheid.',
  audience:
    'Functionele programmeurs die garanties en correctheid willen aantonen.',
  outcomes: [
    'Leg pure functions en types uit aan gemengde teams',
    'Ontwerp pipelines die correctheid meten',
    'Documenteer onderzoeksexperimenten met reproduceerbaarheid'
  ],
  bestFitCareers: [
    'FP backends',
    'compilers/tools',
    'research/fintech',
    'Backend Software Engineer'
  ],
  focusTags: ['haskell', 'fp', 'correctness'],
  coreThemes: ['correctheid aantonen', 'types als documentatie', 'verantwoord experimenteren'],
  signatureUseCases: [
    'Implementeer een type-safe API en leg contracten vast.',
    'Bouw een proof van concept compiler feature en motiveer impact.',
    'Schrijf een reproducible onderzoekslogboek met metrics.'
  ],
  whyThisPath:
    'Haskell draait om zekerheid. We leren hoe je abstracties vertaalt naar concrete beloftes aan business en research teams.'
});

languageTrackDefinitions.push({
  language: 'Julia',
  slug: 'julia',
  level: 'advanced',
  durationWeeks: 14,
  description:
    'Pas Julia toe voor high-performance numerics en ML research met duidelijke validatie en communicatie.',
  audience:
    'Scientists en ML engineers die snelle iteratie en uitlegbaarheid willen combineren.',
  outcomes: [
    'Ontwerp numerieke experimenten met traceerbare aannames',
    'Vertaal prototype code naar productie pipelines',
    'Communiceer modelresultaten en onzekerheid effectief'
  ],
  bestFitCareers: [
    'Scientific computing',
    'numerics/ML research',
    'Machine Learning Engineer',
    'Data-engineer'
  ],
  focusTags: ['julia', 'scientific', 'ml'],
  coreThemes: ['high-performance berekeningen', 'experimentele validatie', 'open communicatie'],
  signatureUseCases: [
    'Versnel een numerieke pipeline en leg performancewinst uit.',
    'Integreer Julia met Python/SQL en motiveer architectuurkeuze.',
    'Presenteer een research update inclusief risico’s en vervolgstappen.'
  ],
  whyThisPath:
    'Julia laat je rekenen op snelheid. We verbinden elke optimalisatie aan geloofwaardige, uitlegbare resultaten.'
});

function createLanguageTrack(definition) {
  const pathId = `path-${definition.slug}`;
  const foundationModuleId = `module-${definition.slug}-foundations`;
  const systemsModuleId = `module-${definition.slug}-systems`;
  const projectsModuleId = `module-${definition.slug}-projects`;
  const primaryCareer = definition.bestFitCareers[0];
  const secondaryCareer = definition.bestFitCareers[1] || primaryCareer;
  const tertiaryCareer = definition.bestFitCareers[2] || secondaryCareer;
  const focusTags = Array.from(new Set([definition.language.toLowerCase(), ...(definition.focusTags || [])]));

  const modules = [
    {
      id: foundationModuleId,
      title: `${definition.language} Foundations`,
      overview: `Bouw een gedeelde taal voor ${definition.language} zodat teams aligned blijven op ${definition.coreThemes[0]}.`,
      whyItMatters: `We koppelen syntaxis aan impact: ${definition.language} maakt ${definition.coreThemes.join(', ')} mogelijk wanneer je keuzes kunt uitleggen.`,
      realWorldScenarios: [
        definition.signatureUseCases[0],
        definition.signatureUseCases[1]
      ],
      evidenceOfMastery: [
        `Je kunt uitleggen waarom een ${definition.language}-feature ${primaryCareer} vooruit helpt.`,
        'Je levert een geschreven decision log dat aannames en impact vastlegt.'
      ],
      learningGoals: [
        `${definition.language} syntaxis koppelen aan klant- en teamimpact`,
        'Failure modes voorspellen en mitigaties toelichten',
        'Het WHY-first canvas invullen voor elke oplevering'
      ],
      estimatedMinutes: 300,
      prerequisites: []
    },
    {
      id: systemsModuleId,
      title: `${definition.language} Systems Thinking`,
      overview: `Verbind ${definition.language}-code aan reliability, security en teamafspraken zodat ${secondaryCareer} doelen behaald worden.`,
      whyItMatters: 'Systemen falen wanneer intentie ontbreekt. Door het waarom uit te schrijven ondersteun je collega’s, audits en gebruikers.',
      realWorldScenarios: [
        definition.signatureUseCases[1],
        definition.signatureUseCases[2]
      ],
      evidenceOfMastery: [
        'Je koppelt metrics aan systemische beslissingen en deelt ze in een review.',
        `Je communiceert risico’s en mitigaties richting ${tertiaryCareer} stakeholders.`
      ],
      learningGoals: [
        'Operational excellence verbinden aan technische keuzes',
        'Observability inzetten om hypotheses te valideren',
        'Security en privacy implicaties toelichten'
      ],
      estimatedMinutes: 330,
      prerequisites: [foundationModuleId]
    },
    {
      id: projectsModuleId,
      title: `${definition.language} Projects & Reflection`,
      overview: 'Lever een capstone dat het waarom van architectuur, metrics en samenwerking vastlegt.',
      whyItMatters: 'Reflectie borgt leerwinst. Stakeholders vertrouwen je beslissingen wanneer je de context helder deelt.',
      realWorldScenarios: [
        definition.signatureUseCases[0],
        definition.signatureUseCases[2]
      ],
      evidenceOfMastery: [
        'Je levert een project readme met impact, trade-offs en next steps.',
        'Je faciliteert een demo waarin het team het waarom achter keuzes begrijpt.'
      ],
      learningGoals: [
        'Stakeholder updates schrijven met meetbare resultaten',
        'Peer feedback verwerken in iteraties',
        'Een growth plan formuleren op basis van retro inzichten'
      ],
      estimatedMinutes: 360,
      prerequisites: [systemsModuleId]
    }
  ];

  const courseRecords = [
    {
      id: `course-${definition.slug}-foundations`,
      pathId,
      slug: `${definition.slug}-foundations`,
      title: `${definition.language} WHY-first Foundations`,
      description: `Leg fundamenten vast met ${definition.language} door elke keuze terug te herleiden naar bedrijfsimpact.`,
      whyItMatters: `Teams vertrouwen op engineers die het waarom kunnen uitleggen. Deze course verbindt ${definition.language}-constructies aan doelen voor ${primaryCareer}.`,
      durationWeeks: 4,
      modules: [foundationModuleId],
      outcomes: [
        'Storytelling toepassen in technical docs',
        `${definition.language} idiomen linken aan stakeholder behoeften`,
        'Feedback cycli ontwerpen die leergedrag versnellen'
      ],
      reflectionPrompts: [
        'Welke aannames heb je expliciet gemaakt en hoe toets je ze?',
        `Hoe zou je ${definition.language}-keuzes uitleggen aan een business stakeholder?`
      ],
      assessment: 'Maak een WHY-first beslisdocument dat codekeuzes, risico’s en succesmetrics verbindt.'
    },
    {
      id: `course-${definition.slug}-systems`,
      pathId,
      slug: `${definition.slug}-systems`,
      title: `${definition.language} Systems & Reliability`,
      description: 'Ontwerp services en workflows die voorspelbaar, meetbaar en veilig zijn.',
      whyItMatters: 'Betrouwbaarheid is een team effort. Door systemen te ontwerpen met expliciete WHY-context voorkom je verrassingen en incidenten.',
      durationWeeks: 5,
      modules: [systemsModuleId],
      outcomes: [
        'Service level doelen definiëren en monitoren',
        'Risico’s documenteren met mitigaties',
        'Security en privacy eisen verwerken in ontwerp'
      ],
      reflectionPrompts: [
        'Welke failure modes verwacht je en hoe communiceer je die?',
        'Welke stakeholders moeten jouw systeemdocumentatie begrijpen?'
      ],
      assessment: 'Lever een system design review met metrics, threat modeling en observability plan.'
    },
    {
      id: `course-${definition.slug}-projects`,
      pathId,
      slug: `${definition.slug}-projects`,
      title: `${definition.language} Capstone & Evidence`,
      description: 'Voer een project uit, presenteer bewijs van impact en plan je volgende groeistap.',
      whyItMatters: 'Een capstone bewijst vakmanschap wanneer je het waarom kunt overbrengen. Je leert reflecties en artifacts te delen.',
      durationWeeks: 5,
      modules: [projectsModuleId],
      outcomes: [
        'Impact log schrijven met duidelijke metrics',
        'Peer en mentor feedback verwerken',
        'Een growth plan formuleren voor de volgende 90 dagen'
      ],
      reflectionPrompts: [
        'Welke klant- of teamimpact kun je aantonen?',
        'Wat heb je geleerd over jezelf als maker en collega?'
      ],
      assessment: 'Presenteer een demo, postmortem en growth plan dat het waarom van je beslissingen onderbouwt.'
    }
  ];

  const lessonPrefix = `lesson-${definition.slug}`;
  const lessonsForTrack = {
    [`${lessonPrefix}-foundations`]: {
      id: `${lessonPrefix}-foundations`,
      slug: `${definition.slug}-foundations`,
      title: `${definition.language} WHY-first Kick-off`,
      type: 'video',
      content: `# Why ${definition.language}\nOntdek hoe ${definition.language} beslissingen business impact versnellen en welke vragen stakeholders stellen.`,
      transcript: 'Video transcript beschikbaar in de leeromgeving.',
      moduleId: foundationModuleId,
      assets: [],
      why: `We koppelen ${definition.language}-primitieven aan ${primaryCareer} en ${secondaryCareer} doelen zodat je keuzes kunt verdedigen.`,
      reflectionPrompt: `Welke ${definition.language}-gewoonte ondersteunt jouw doelrol (${primaryCareer}) het meest en waarom?`,
      successCriteria: [
        `Je koppelt een feature aan een ${primaryCareer} metric.`,
        'Je noteert minstens één risico en mitigatie in je leerlog.'
      ],
      recommendedResources: [`cheatsheet/${definition.slug}-fundamentals`, `microvideo/${definition.slug}-why`],
      assignments: [],
      quizId: `quiz-${definition.slug}-foundations`
    },
    [`${lessonPrefix}-systems`]: {
      id: `${lessonPrefix}-systems`,
      slug: `${definition.slug}-systems`,
      title: `${definition.language} Reliability Clinic`,
      type: 'tekst',
      content: `# Systems thinking\nLeer welke observability signalen bewijzen dat jouw ${definition.language}-service klaar is voor productie.`,
      transcript: 'Tekstversie met screenreader optimalisaties.',
      moduleId: systemsModuleId,
      assets: [],
      why: `Systemen moeten uitlegbaar zijn. We verbinden ${definition.language}-patronen aan risico management voor ${secondaryCareer}.`,
      reflectionPrompt: 'Welke metric bewaak je als eerste wanneer je systeem live gaat en waarom?',
      successCriteria: [
        'Je benoemt minimaal drie signalen die aantonen dat je systeem gezond is.',
        'Je plant een communicatie-update naar ops/product.'
      ],
      recommendedResources: [`anatomy/${definition.language.toLowerCase()}/systems-overview`, `cheatsheet/${definition.slug}-observability`],
      assignments: [],
      quizId: `quiz-${definition.slug}-systems`
    },
    [`${lessonPrefix}-projects`]: {
      id: `${lessonPrefix}-projects`,
      slug: `${definition.slug}-capstone`,
      title: `${definition.language} Capstone Retro`,
      type: 'interactive',
      content: `# Project reflection\nGebruik het WHY-first canvas om impact, trade-offs en vervolgexperimenten vast te leggen.`,
      transcript: 'Interactieve les met beschrijving van elke stap voor screenreaders.',
      moduleId: projectsModuleId,
      assets: [],
      why: `Reflecties maken je groei zichtbaar en helpen ${tertiaryCareer} stakeholders vertrouwen te houden.`,
      reflectionPrompt: 'Welke beslissing leverde de grootste impact op en hoe onderbouw je dat met data?',
      successCriteria: [
        'Je deelt een demo met impact metrics en leerpunten.',
        'Je formuleert een concrete next step voor jezelf en je team.'
      ],
      recommendedResources: [`microvideo/${definition.slug}-reflection`, `cheatsheet/${definition.slug}-retrospective`],
      assignments: [],
      quizId: `quiz-${definition.slug}-capstone`
    }
  };

  const path = {
    id: pathId,
    slug: `${definition.slug}-career-path`,
    title: `${definition.language} Career Path`,
    description: definition.description,
    audience: definition.audience,
    outcomes: definition.outcomes,
    durationWeeks: definition.durationWeeks,
    level: definition.level,
    heroMedia: 'https://placehold.co/1200x600',
    tags: focusTags,
    language: definition.language,
    bestFitCareers: definition.bestFitCareers,
    modules,
    courses: courseRecords,
    whyThisPath: definition.whyThisPath
  };

  return { path, courses: courseRecords, lessons: lessonsForTrack };
}

const generatedPaths = [];
const generatedLessons = {};

for (const definition of languageTrackDefinitions) {
  const track = createLanguageTrack(definition);
  courses.push(...track.courses);
  generatedPaths.push(track.path);
  Object.assign(generatedLessons, track.lessons);
}

const paths = [
  {
    id: 'path-frontend',
    slug: 'frontend-developer',
    title: 'Frontend Developer Leerpad',
    description:
      'Word job-ready als frontend developer met moderne tooling, projecten en mentorondersteuning.',
    audience:
      'Beginnende programmeurs die willen specialiseren in web development.',
    outcomes: [
      'Volwaardige responsive websites bouwen',
      'Samenwerken in Git workflows',
      'React componenten architectuur toepassen'
    ],
    durationWeeks: 14,
    level: 'beginner',
    heroMedia: 'https://placehold.co/1200x600',
    tags: ['frontend', 'javascript', 'react'],
    language: 'JavaScript',
    bestFitCareers: ['Frontend', 'Full-Stack Software Engineer'],
    modules: modulesFrontend,
    courses: courses.filter((course) => course.pathId === 'path-frontend'),
    whyThisPath:
      'Het frontend-pad legt een directe koppeling tussen UI-beslissingen en bedrijfsimpact, zodat studenten begrijpen welke keuzes leiden tot betere gebruikerservaringen en KPI’s.'
  },
  ...generatedPaths
];

const baseLessons = {
  'les-html-structuur': {
    id: 'les-html-structuur',
    slug: 'html-structuur',
    title: 'HTML Structuur Fundamentals',
    type: 'video',
    content:
      '# HTML structureren\nLeer hoe je semantische HTML gebruikt voor betere toegankelijkheid.',
    transcript: 'Volledige transcriptie van de les.',
    moduleId: 'module-web-basics',
    assets: ['https://cdn.learnzo.io/assets/html-structuur.pdf'],
    why:
      'Als je begrijpt waarom semantiek telt, kun je interfaces bouwen die zoekmachines, screenreaders en dev-teams makkelijker begrijpen.',
    reflectionPrompt:
      'Welke semantische elementen heb je vandaag bewust gekozen en waarom versterken ze de boodschap van de pagina?',
    successCriteria: [
      'Je kunt uitleggen waarom een <section> of <article> gebruikt is.',
      'Je benoemt minstens één toegankelijkheidswinst per component.'
    ],
    recommendedResources: ['cheatsheet/semantische-html', 'microvideo/skip-links'],
    assignments: ['assign-simple-landing'],
    quizId: 'quiz-html-structuur'
  },
  'les-js-arrays': {
    id: 'les-js-arrays',
    slug: 'javascript-arrays',
    title: 'Werken met JavaScript Arrays',
    type: 'tekst',
    content:
      '# Arrays manipuleren\nGebruik map, filter en reduce om data te transformeren.',
    transcript: 'Tekstversie voor screenreaders.',
    moduleId: 'module-js-core',
    assets: [],
    why:
      'Array-methoden zijn het hart van datagedreven productbeslissingen; je leert begrijpen hoe elke transformatie de gebruiker raakt.',
    reflectionPrompt:
      'Welke KPI verbeter je met jouw data-transformatie en hoe weet je dat?',
    successCriteria: [
      'Je kunt het verschil uitleggen tussen map/filter/reduce met praktijkvoorbeelden.',
      'Je schrijft pseudocode die het doel van de functie in minder dan 5 stappen beschrijft.'
    ],
    recommendedResources: ['cheatsheet/javascript-arrays', 'microvideo/array-map'],
    assignments: ['assign-array-utilities'],
    quizId: 'quiz-js-arrays'
  }
};

const lessons = { ...baseLessons, ...generatedLessons };

const assignments = {
  'assign-simple-landing': {
    id: 'assign-simple-landing',
    title: 'Bouw een semantische landingspagina',
    instructions:
      'Maak een HTML pagina met een hero, features sectie en een contactformulier.',
    starterCode: '<!-- Begin hier -->',
    tests: ['Controleer h1 bestaan', 'Check formulier labels'],
    hints: [
      'Gebruik <main> voor de hoofdinhoud',
      'Koppel labels aan inputs met for/id'
    ],
    why:
      'Je bouwt ervaring op met het verbinden van designbeslissingen aan toegankelijkheid en business messaging.',
    reflectionPrompt:
      'Hoe draagt de structuur van je pagina bij aan vertrouwen bij de bezoeker?',
    language: 'html',
    timeLimit: 900000
  },
  'assign-array-utilities': {
    id: 'assign-array-utilities',
    title: 'Array helper functies',
    instructions:
      'Implementeer functies om dataset te filteren en te transformeren.',
    starterCode: 'export function getActiveUsers(users) {\n  return [];\n}',
    tests: ['Voegt alleen actieve gebruikers toe', 'Behoudt oorspronkelijke array'],
    hints: ['Gebruik Array.filter', 'Gebruik spread operator voor kopieën'],
    why:
      'Het doel is niet alleen dat de code werkt, maar dat je de data-intentie kunt uitleggen aan stakeholders.',
    reflectionPrompt:
      'Welke beslissingen heb je genomen om data-integriteit te waarborgen?',
    language: 'javascript',
    timeLimit: 900000
  }
};

const quizzes = {
  'quiz-html-structuur': {
    id: 'quiz-html-structuur',
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        prompt: 'Welke tag gebruik je voor hoofdinhoud?',
        options: ['<div>', '<main>', '<section>', '<article>'],
        answer: 1,
        explanation: '<main> beschrijft de hoofdinhoud van de pagina.'
      }
    ]
  }
};

const progress = [
  {
    id: 'progress-1',
    userId: 'user-student-1',
    entityType: 'lesson',
    entityId: 'les-html-structuur',
    status: 'completed',
    score: 1,
    timeSpentMs: 600000,
    lastSeenAt: now()
  }
];

const submissions = [
  {
    id: 'sub-1',
    userId: 'user-student-1',
    assignmentId: 'assign-array-utilities',
    createdAt: now(),
    status: 'passed',
    score: 0.9,
    testResults: [
      { name: 'active users', status: 'passed', message: 'Alle tests geslaagd.' }
    ],
    runtimeMs: 250,
    plagioScore: 0.12
  }
];

const threads = [
  {
    id: 'thread-1',
    scope: 'lesson:les-js-arrays',
    title: 'Map vs forEach',
    authorId: 'user-student-1',
    createdAt: now(),
    type: 'question',
    tags: ['javascript', 'arrays'],
    resolved: true,
    commentIds: ['comment-1']
  }
];

const comments = [
  {
    id: 'comment-1',
    threadId: 'thread-1',
    authorId: 'user-mentor-1',
    body: 'Gebruik map als je een nieuwe array wilt retourneren.',
    createdAt: now(),
    updatedAt: now(),
    reactions: { helpful: 4 }
  }
];

const pseudocodeDrafts = [];

const cheatsheets = [
  {
    id: 'cheat-js-arrays',
    slug: 'javascript-array-methods',
    title: 'JavaScript Array Methods',
    language: 'javascript',
    topics: ['arrays', 'javascript'],
    snippets: [
      { label: 'map()', code: 'const result = items.map(transform);' },
      { label: 'filter()', code: 'const active = items.filter(Boolean);' }
    ],
    pitfalls: ['Vergeet niet een return in map callback te gebruiken.'],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'cheat-html-forms',
    slug: 'html-accessible-forms',
    title: 'Toegankelijke HTML formulieren',
    language: 'html',
    topics: ['a11y', 'html'],
    snippets: [
      {
        label: 'Labels koppelen',
        code: '<label for="email">E-mail</label>\n<input id="email" type="email" required />'
      }
    ],
    pitfalls: ['Gebruik altijd een label of aria-label voor inputs.'],
    createdAt: now(),
    updatedAt: now()
  }
];

const anatomyEntries = [
  {
    id: 'anatomy-js-closures',
    slug: 'javascript-closures',
    language: 'javascript',
    concept: 'closures',
    title: 'Closures ontleed',
    code: 'function outer() {\n  const secret = 42;\n  return function inner() {\n    return secret;\n  };\n}',
    explanation:
      'Een closure geeft een functie toegang tot de scope waarin deze is gedefinieerd, zelfs na uitvoer van die scope.',
    pitfalls: ['Mutaties in de outer scope kunnen onverwachte resultaten geven.'],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: 'anatomy-js-promises',
    slug: 'javascript-promises',
    language: 'javascript',
    concept: 'promises',
    title: 'Promises stap voor stap',
    code: 'fetch(url)\n  .then((response) => response.json())\n  .catch((error) => console.error(error));',
    explanation:
      'Promises vertegenwoordigen de toekomstige uitkomst van asynchrone operaties met expliciete success- en errorpaden.',
    pitfalls: ['Vergeet niet een catch toe te voegen om fouten te behandelen.'],
    createdAt: now(),
    updatedAt: now()
  }
];

const microVideos = [
  {
    id: 'micro-js-map',
    slug: 'javascript-map-legenda',
    title: 'Map in 20 seconden',
    durationSeconds: 22,
    topics: ['javascript', 'arrays'],
    videoUrl: 'https://cdn.learnzo.io/micro/map-20s.m3u8',
    posterUrl: 'https://cdn.learnzo.io/micro/map-20s.jpg',
    captionsUrl: 'https://cdn.learnzo.io/micro/map-20s.vtt',
    transcript: 'Gebruik map om elk item te transformeren zonder het origineel te muteren.',
    createdAt: now()
  },
  {
    id: 'micro-html-forms',
    slug: 'html-form-validatie',
    title: 'HTML Validatie basics',
    durationSeconds: 18,
    topics: ['html', 'forms'],
    videoUrl: 'https://cdn.learnzo.io/micro/html-forms.m3u8',
    posterUrl: 'https://cdn.learnzo.io/micro/html-forms.jpg',
    captionsUrl: 'https://cdn.learnzo.io/micro/html-forms.vtt',
    transcript: 'Gebruik required, pattern en aria-live voor betere formulieren.',
    createdAt: now()
  }
];

const calendarEvents = [
  {
    id: 'cal-1',
    userId: 'user-student-1',
    title: 'Studieblok – Arrays oefening',
    type: 'study-block',
    start: '2025-02-03T18:00:00.000Z',
    end: '2025-02-03T19:30:00.000Z',
    source: 'manual'
  }
];

const invoices = [
  {
    id: 'inv-1001',
    userId: 'user-student-1',
    amount: 1900,
    currency: 'EUR',
    status: 'paid',
    issuedAt: '2025-01-01T00:00:00.000Z',
    pdfUrl: 'https://cdn.learnzo.io/invoices/inv-1001.pdf'
  }
];

const certificates = [
  {
    id: 'cert-frontend',
    userId: 'user-student-1',
    pathId: 'path-frontend',
    issuedAt: '2025-01-20T00:00:00.000Z',
    hash: 'b96d6dff5c9e1b1c',
    publicUrl: 'https://learnzo.io/certificaten/cert-frontend'
  }
];

const featureFlags = [
  {
    key: 'cheatsheet-panel-v1',
    variant: 'on',
    targeting: { plan: ['pro-monthly', 'pro-annual'] }
  },
  {
    key: 'ai-hints-beta',
    variant: 'off',
    targeting: { role: ['student'], allowlist: ['user-student-1'] }
  }
];

const reviewQueue = [
  {
    id: 'review-1',
    submissionId: 'sub-1',
    assignmentId: 'assign-array-utilities',
    status: 'waiting',
    requestedAt: now(),
    claimedBy: null,
    notes: 'Student vraagt feedback op gebruik van map vs reduce.'
  }
];

const supportTickets = [
  {
    id: 'ticket-1',
    userId: 'user-student-1',
    subject: 'Vraag over factuur',
    status: 'open',
    priority: 'p2',
    createdAt: now()
  }
];

const promotions = [
  {
    id: 'promo-sprint-2025',
    name: 'Spring Launch 25%',
    code: 'SPRING25',
    discountType: 'percentage',
    value: 25,
    status: 'scheduled',
    startsAt: '2025-03-01T00:00:00.000Z',
    endsAt: '2025-04-15T23:59:59.000Z',
    usageLimit: 500,
    perUserLimit: 1,
    stackable: false,
    appliesTo: {
      plans: ['pro-monthly', 'pro-annual'],
      cohorts: ['spring-2025']
    },
    createdBy: 'user-admin-1',
    updatedBy: 'user-admin-1',
    createdAt: now(),
    updatedAt: now(),
    notes: 'Launch campaign for the spring cohort. Requires mentor approval for manual overrides.'
  },
  {
    id: 'promo-team-trial',
    name: 'Teams 14-day pilot',
    code: 'TEAMTRIAL',
    discountType: 'fixed',
    value: 14900,
    status: 'draft',
    startsAt: '2025-05-01T00:00:00.000Z',
    endsAt: '2025-06-30T23:59:59.000Z',
    usageLimit: 50,
    perUserLimit: 1,
    stackable: false,
    appliesTo: {
      plans: ['team'],
      cohorts: []
    },
    createdBy: 'user-admin-1',
    updatedBy: 'user-admin-1',
    createdAt: now(),
    updatedAt: now(),
    notes: 'Invite-only pilot for corporate teams. Requires signed MSA before activation.'
  }
];

const gamificationProfiles = [
  {
    userId: 'user-student-1',
    xp: 420,
    level: 3,
    streak: {
      current: 4,
      longest: 10,
      lastRecordedAt: now()
    },
    badges: ['consistent-learner']
  }
];

const achievements = [
  {
    id: 'achievement-1',
    userId: 'user-student-1',
    type: 'milestone',
    title: 'Eerste opdracht ingeleverd',
    description: 'Je hebt je eerste opdracht succesvol ingeleverd.',
    points: 120,
    earnedAt: now(),
    awardedBy: 'user-mentor-1',
    evidence: { submissionId: 'sub-1' }
  }
];

const subscriptionPlans = {
  free: { id: 'free', name: 'Free', termDays: null },
  'pro-monthly': { id: 'pro-monthly', name: 'Pro Maandelijks', termDays: 30 },
  'pro-annual': { id: 'pro-annual', name: 'Pro Jaarlijks', termDays: 365 },
  team: { id: 'team', name: 'Team', termDays: 30 }
};

const telemetryEvents = [];
const privacyRequests = [];
const calendarFeedTokens = new Map();
const auditEvents = [];
const ltiRegistrations = [
  {
    id: 'lti-reg-1',
    institution: 'Tech University',
    contactEmail: 'admin@techuniversity.edu',
    clientId: 'lti-client-1',
    deploymentId: 'deployment-frontend',
    platformUrl: 'https://lms.techuniversity.edu',
    jwksUrl: 'https://lms.techuniversity.edu/.well-known/jwks.json',
    createdAt: now(),
    active: true,
    lastLaunchAt: null
  }
];
const ltiLaunches = [];
const scormPackages = [
  {
    id: 'scorm-package-1',
    title: 'Frontend Fundamentals',
    version: '2004 3rd',
    manifestHash: 'hash-frontend',
    importedAt: now(),
    status: 'processed'
  }
];
const ssoProviders = [
  {
    id: 'sso-provider-1',
    name: 'Okta',
    type: 'saml',
    issuer: 'https://okta.learnzo',
    metadataUrl: 'https://okta.learnzo/metadata',
    defaultRole: 'student',
    createdAt: now(),
    active: true
  }
];
const scimDirectory = [
  {
    id: 'scim-map-1',
    externalId: 'ext-user-1',
    userId: 'user-student-1',
    active: true,
    displayName: 'Ada Student',
    email: 'ada@student.learnzo.io',
    syncedAt: now()
  }
];
const affiliatePartners = [
  {
    id: 'affiliate-1',
    code: 'LEARNWITHADA',
    name: 'Ada Student',
    payoutPercentage: 20,
    clicks: 15,
    conversions: 2,
    createdAt: now()
  }
];
const affiliatePayouts = [];
const aiHintSessions = [];

const apiCatalog = [
  {
    name: 'Platform health',
    method: 'GET',
    path: '/healthz',
    category: 'Platform',
    auth: 'Public',
    description: 'Liveness probe used by orchestrators to ensure the service is running.'
  },
  {
    name: 'Platform readiness',
    method: 'GET',
    path: '/readyz',
    category: 'Platform',
    auth: 'Public',
    description: 'Readiness probe that reports when dependencies and bootstrapping have completed.'
  },
  {
    name: 'Prometheus metrics',
    method: 'GET',
    path: '/metrics',
    category: 'Observability',
    auth: 'Internal',
    description: 'Exports runtime metrics for Prometheus scraping (protect via network policy).'
  },
  {
    name: 'API catalog',
    method: 'GET',
    path: '/meta/endpoints',
    category: 'Platform',
    auth: 'Public',
    description: 'Lists the documented API surface with methods, categories and auth requirements.'
  },
  {
    name: 'Auth: Register',
    method: 'POST',
    path: '/auth/register',
    category: 'Authentication',
    auth: 'Public',
    description: 'Create a learner account, choose a plan, and start a device-bound session.'
  },
  {
    name: 'Auth: Login',
    method: 'POST',
    path: '/auth/login',
    category: 'Authentication',
    auth: 'Public',
    description: 'Exchange email and password for a short-lived access token and refresh cookie.'
  },
  {
    name: 'Auth: Refresh token',
    method: 'POST',
    path: '/auth/refresh',
    category: 'Authentication',
    auth: 'Authenticated (refresh cookie)',
    description: 'Rotate the refresh token and mint a new access token for the same device.'
  },
  {
    name: 'Auth: Logout',
    method: 'POST',
    path: '/auth/logout',
    category: 'Authentication',
    auth: 'Authenticated',
    description: 'Revoke the active refresh token, clear cookies, and end the session.'
  },
  {
    name: 'Current user',
    method: 'GET',
    path: '/me',
    category: 'Profile',
    auth: 'Authenticated',
    description: 'Return the authenticated user profile, roles, subscription and progress summary.'
  },
  {
    name: 'Learning paths',
    method: 'GET',
    path: '/paths',
    category: 'Learning',
    auth: 'Public',
    description: 'List all learning paths with WHY-first context and linked courses.'
  },
  {
    name: 'Learning path detail',
    method: 'GET',
    path: '/paths/:slug',
    category: 'Learning',
    auth: 'Public',
    description: 'Fetch a single path with courses, outcomes, modules and recommended careers.'
  },
  {
    name: 'Courses',
    method: 'GET',
    path: '/courses',
    category: 'Learning',
    auth: 'Public',
    description: 'List WHY-focused courses, each linked to modules and assessments.'
  },
  {
    name: 'Course detail',
    method: 'GET',
    path: '/courses/:slug',
    category: 'Learning',
    auth: 'Public',
    description: 'Retrieve a single course with reflection prompts, modules, and success criteria.'
  },
  {
    name: 'Lesson detail',
    method: 'GET',
    path: '/lessons/:slug',
    category: 'Learning',
    auth: 'Authenticated (preview for selected lessons)',
    description: 'Return lesson content including hook, WHY narrative, practice tasks, and reflection.'
  },
  {
    name: 'Assignment detail',
    method: 'GET',
    path: '/assignments/:id',
    category: 'Learning',
    auth: 'Authenticated',
    description: 'Return a coding assignment with WHY context, starter code, tests, and success metrics.'
  },
  {
    name: 'Quizzes',
    method: 'GET',
    path: '/quizzes',
    category: 'Learning',
    auth: 'Authenticated',
    description: 'List quiz banks with WHY-first rationales and remediation hints.'
  },
  {
    name: 'Cheatsheets search',
    method: 'GET',
    path: '/cheatsheets',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'Search cheatsheets filtered by language, topic, or keyword to reinforce WHY concepts.'
  },
  {
    name: 'Cheatsheet detail',
    method: 'GET',
    path: '/cheatsheets/:slug',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'Retrieve a single cheatsheet with copy-ready snippets and pitfalls.'
  },
  {
    name: 'Anatomy library',
    method: 'GET',
    path: '/anatomy',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'List language anatomy entries that explain syntax and runtime WHY context.'
  },
  {
    name: 'Anatomy entry',
    method: 'GET',
    path: '/anatomy/:language/:concept',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'Retrieve an annotated code walkthrough with scope visualisations and best practices.'
  },
  {
    name: 'Micro videos',
    method: 'GET',
    path: '/microvideos',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'List bite-sized explainer videos aligned to the learner context.'
  },
  {
    name: 'Micro video detail',
    method: 'GET',
    path: '/microvideos/:slug',
    category: 'Learning support',
    auth: 'Authenticated',
    description: 'Retrieve a single micro video with transcripts, captions, and related resources.'
  },
  {
    name: 'Progress list',
    method: 'GET',
    path: '/progress',
    category: 'Progress',
    auth: 'Authenticated',
    description: 'List progress per lesson, assignment, or module for the current learner.'
  },
  {
    name: 'Progress upsert',
    method: 'POST',
    path: '/progress',
    category: 'Progress',
    auth: 'Authenticated',
    description: 'Update or insert progress status, scores, and time spent for a learning entity.'
  },
  {
    name: 'Create submission',
    method: 'POST',
    path: '/submissions',
    category: 'Assignments',
    auth: 'Authenticated (active plan)',
    description: 'Submit code for an assignment, run tests, and capture rubric-aligned outcomes.'
  },
  {
    name: 'Submission detail',
    method: 'GET',
    path: '/submissions/:id',
    category: 'Assignments',
    auth: 'Authenticated (owner or mentor/admin)',
    description: 'Inspect stored submissions with grader results, runtime data, and hints.'
  },
  {
    name: 'Grader run',
    method: 'POST',
    path: '/grader/run',
    category: 'Assignments',
    auth: 'Authenticated (active plan)',
    description: 'Execute the grader sandbox for a given assignment and receive pass/fail diagnostics.'
  },
  {
    name: 'AI hints',
    method: 'POST',
    path: '/ai/hints',
    category: 'Assignments',
    auth: 'Authenticated (active plan)',
    description: 'Request WHY-aligned coaching prompts with guardrails that prevent full solutions.'
  },
  {
    name: 'Pseudocode generator',
    method: 'POST',
    path: '/pseudocode',
    category: 'Assignments',
    auth: 'Authenticated (active plan)',
    description: 'Transform the current code attempt into guided pseudocode steps with guardrails.'
  },
  {
    name: 'Events log',
    method: 'GET',
    path: '/events',
    category: 'Telemetry',
    auth: 'Authenticated',
    description: 'Retrieve tracked product analytics events for the requesting user or cohort.'
  },
  {
    name: 'Record event',
    method: 'POST',
    path: '/events',
    category: 'Telemetry',
    auth: 'Authenticated',
    description: 'Record a telemetry event (lesson, assignment, billing) with metadata payloads.'
  },
  {
    name: 'Analytics event ingest',
    method: 'POST',
    path: '/analytics/events',
    category: 'Telemetry',
    auth: 'Public (secured via shared secret header)',
    description: 'Ingest a single analytics event from the marketing site or external tooling.'
  },
  {
    name: 'Analytics bulk ingest',
    method: 'POST',
    path: '/analytics/events/bulk',
    category: 'Telemetry',
    auth: 'Public (secured via shared secret header)',
    description: 'Receive a batch of analytics events for efficient server-side collection.'
  },
  {
    name: 'Gamification profile',
    method: 'GET',
    path: '/gamification',
    category: 'Engagement',
    auth: 'Authenticated',
    description: 'Return streaks, XP, achievements, and dashboard-level motivators.'
  },
  {
    name: 'Update streak',
    method: 'POST',
    path: '/gamification/streak',
    category: 'Engagement',
    auth: 'Authenticated',
    description: 'Increment or reset the learner streak when daily goals are met.'
  },
  {
    name: 'Award achievement',
    method: 'POST',
    path: '/gamification/award',
    category: 'Engagement',
    auth: 'Mentor/Admin',
    description: 'Mentors and admins can award badges or XP boosts to learners.'
  },
  {
    name: 'Community threads',
    method: 'GET',
    path: '/threads',
    category: 'Community',
    auth: 'Authenticated',
    description: 'List discussion threads filtered by scope (lesson, assignment, or channel).'
  },
  {
    name: 'Create thread',
    method: 'POST',
    path: '/threads',
    category: 'Community',
    auth: 'Authenticated',
    description: 'Start a new context-aware discussion with WHY-first templates.'
  },
  {
    name: 'Reply to thread',
    method: 'POST',
    path: '/comments',
    category: 'Community',
    auth: 'Authenticated',
    description: 'Add a comment to a thread with markdown support and guardrails.'
  },
  {
    name: 'Calendar events',
    method: 'GET',
    path: '/app/calendar',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'List scheduled study sessions, milestones, and reminders for the learner.'
  },
  {
    name: 'Create calendar event',
    method: 'POST',
    path: '/app/calendar',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'Add a personalised study block or due date to the learner calendar.'
  },
  {
    name: 'Update calendar event',
    method: 'PATCH',
    path: '/app/calendar/:id',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'Update details of a calendar event owned by the learner.'
  },
  {
    name: 'Delete calendar event',
    method: 'DELETE',
    path: '/app/calendar/:id',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'Remove a scheduled calendar entry from the learner planner.'
  },
  {
    name: 'Calendar feed token',
    method: 'GET',
    path: '/calendar/feed-token',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'Retrieve the tokenised iCal feed link for syncing with external calendars.'
  },
  {
    name: 'Rotate calendar feed token',
    method: 'POST',
    path: '/calendar/feed-token',
    category: 'Calendar',
    auth: 'Authenticated',
    description: 'Rotate the calendar feed token to revoke previously shared links.'
  },
  {
    name: 'Calendar feed',
    method: 'GET',
    path: '/calendar/feed.ics',
    category: 'Calendar',
    auth: 'Token',
    description: 'Serve an iCalendar feed of scheduled learning events using a signed token.'
  },
  {
    name: 'Billing checkout session',
    method: 'POST',
    path: '/billing/checkout',
    category: 'Billing',
    auth: 'Authenticated',
    description: 'Create a checkout redirect session for a selected price identifier.'
  },
  {
    name: 'Subscription change',
    method: 'POST',
    path: '/subscriptions/change',
    category: 'Billing',
    auth: 'Authenticated',
    description: 'Upgrade, downgrade, pause, or resume a learner subscription.'
  },
  {
    name: 'Dashboard overview',
    method: 'GET',
    path: '/app/dashboard',
    category: 'Engagement',
    auth: 'Authenticated',
    description: 'Return personalised dashboard cards with WHY-focused nudges and metrics.'
  },
  {
    name: 'Invoices',
    method: 'GET',
    path: '/billing/invoices',
    category: 'Billing',
    auth: 'Authenticated',
    description: 'Retrieve billing history and invoice PDFs linked to the learner account.'
  },
  {
    name: 'Certificates',
    method: 'GET',
    path: '/app/certificaten',
    category: 'Learning',
    auth: 'Authenticated',
    description: 'List issued certificates with verification hashes and shareable URLs.'
  },
  {
    name: 'Mentor review queue',
    method: 'GET',
    path: '/mentor/reviews',
    category: 'Mentoring',
    auth: 'Mentor/Admin',
    description: 'Display the submissions awaiting mentor review with rubric context.'
  },
  {
    name: 'Claim mentor review',
    method: 'POST',
    path: '/mentor/reviews/:id/claim',
    category: 'Mentoring',
    auth: 'Mentor/Admin',
    description: 'Allow mentors to claim a review task and set expectations with learners.'
  },
  {
    name: 'Complete mentor review',
    method: 'POST',
    path: '/mentor/reviews/:id/complete',
    category: 'Mentoring',
    auth: 'Mentor/Admin',
    description: 'Submit feedback, rubric scores, and recommendations after reviewing work.'
  },
  {
    name: 'List promotions',
    method: 'GET',
    path: '/admin/promotions',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Retrieve all discount campaigns with lifecycle status and guardrails.'
  },
  {
    name: 'Create promotion',
    method: 'POST',
    path: '/admin/promotions',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Register a new campaign with code, schedule, targeting, and guardrails.'
  },
  {
    name: 'Update promotion',
    method: 'PATCH',
    path: '/admin/promotions/:id',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Adjust promotion metadata, validity windows, and allocation limits.'
  },
  {
    name: 'Promotion status transition',
    method: 'POST',
    path: '/admin/promotions/:id/{activate|pause|archive}',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Activate, pause, or archive a campaign with audit logging and safeguards.'
  },
  {
    name: 'Feature flags',
    method: 'GET',
    path: '/admin/flags',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'List active feature flags and variants for experimentation governance.'
  },
  {
    name: 'Toggle feature flag',
    method: 'PATCH',
    path: '/flags/:key',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Update a specific feature flag variant or targeting configuration.'
  },
  {
    name: 'Admin overview',
    method: 'GET',
    path: '/admin/overview',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Summarise platform metrics including students, mentors, and open tickets.'
  },
  {
    name: 'Admin support tickets',
    method: 'GET',
    path: '/admin/support',
    category: 'Support',
    auth: 'Admin',
    description: 'List current support tickets with priority for follow-up.'
  },
  {
    name: 'Content sync trigger',
    method: 'POST',
    path: '/content/sync',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Trigger a content sync job from the CMS into the learning data store.'
  },
  {
    name: 'Audit log',
    method: 'GET',
    path: '/admin/audit-log',
    category: 'Admin & Ops',
    auth: 'Admin',
    description: 'Retrieve security-sensitive audit trails for compliance and forensics.'
  },
  {
    name: 'Privacy request submit',
    method: 'POST',
    path: '/privacy/export',
    category: 'Privacy',
    auth: 'Authenticated',
    description: 'Start a GDPR export request for the current learner.'
  },
  {
    name: 'Privacy delete request',
    method: 'POST',
    path: '/privacy/delete',
    category: 'Privacy',
    auth: 'Authenticated',
    description: 'Request deletion of personal data for the current learner.'
  },
  {
    name: 'Privacy review queue',
    method: 'GET',
    path: '/admin/privacy-requests',
    category: 'Privacy',
    auth: 'Admin',
    description: 'List pending privacy requests for operational follow-up.'
  },
  {
    name: 'Privacy request update',
    method: 'PATCH',
    path: '/admin/privacy-requests/:id',
    category: 'Privacy',
    auth: 'Admin',
    description: 'Update the status of a privacy request after processing.'
  },
  {
    name: 'Support status',
    method: 'GET',
    path: '/support/status',
    category: 'Support',
    auth: 'Public',
    description: 'Expose current incident and SLA status for transparency pages.'
  },
  {
    name: 'Affiliate partners',
    method: 'GET',
    path: '/affiliate/partners',
    category: 'Growth',
    auth: 'Admin',
    description: 'List registered affiliate partners and performance metrics.'
  },
  {
    name: 'Create affiliate partner',
    method: 'POST',
    path: '/affiliate/partners',
    category: 'Growth',
    auth: 'Admin',
    description: 'Register a new affiliate or ambassador with commission settings.'
  },
  {
    name: 'Affiliate click tracking',
    method: 'POST',
    path: '/affiliate/click',
    category: 'Growth',
    auth: 'Public',
    description: 'Record a tracked click for an affiliate partner code.'
  },
  {
    name: 'Affiliate conversion',
    method: 'POST',
    path: '/affiliate/conversions',
    category: 'Growth',
    auth: 'Admin',
    description: 'Capture a conversion event with attributed revenue for payout calculations.'
  },
  {
    name: 'Affiliate payouts',
    method: 'GET',
    path: '/affiliate/payouts',
    category: 'Growth',
    auth: 'Admin',
    description: 'List pending and historical affiliate payouts with status information.'
  },
  {
    name: 'Settle affiliate payout',
    method: 'PATCH',
    path: '/affiliate/payouts',
    category: 'Growth',
    auth: 'Admin',
    description: 'Update the status of an affiliate payout (e.g. mark as paid).' 
  },
  {
    name: 'LTI registrations',
    method: 'GET',
    path: '/admin/lti',
    category: 'Integrations',
    auth: 'Admin',
    description: 'List configured LTI Advantage registrations for partner institutions.'
  },
  {
    name: 'SCORM packages',
    method: 'GET',
    path: '/admin/scorm',
    category: 'Integrations',
    auth: 'Admin',
    description: 'List uploaded SCORM packages and metadata for enterprise customers.'
  },
  {
    name: 'SSO providers',
    method: 'GET',
    path: '/admin/sso/providers',
    category: 'Integrations',
    auth: 'Admin',
    description: 'List configured SAML/OIDC identity providers with provisioning status.'
  },
  {
    name: 'SCIM directory',
    method: 'GET',
    path: '/admin/scim/users',
    category: 'Integrations',
    auth: 'Admin',
    description: 'Inspect SCIM-provisioned users for enterprise lifecycle automation.'
  }
];

function snapshotCalendarFeedTokens() {
  return Array.from(calendarFeedTokens.entries()).map(([userId, entry]) => ({
    userId,
    token: entry.token,
    rotatedAt: entry.rotatedAt
  }));
}

function snapshotRefreshTokens() {
  return Array.from(refreshTokens.entries()).map(([token, record]) => ({
    token,
    userId: record.userId,
    sessionId: record.sessionId,
    deviceId: record.deviceId || null,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    userAgent: record.userAgent || null,
    ip: record.ip || null
  }));
}

function snapshotRevokedRefreshTokens() {
  return Array.from(revokedRefreshTokens.values());
}

function restoreRefreshTokens(entries) {
  refreshTokens.clear();
  if (!Array.isArray(entries)) {
    return;
  }
  for (const item of entries) {
    if (!item || !item.token || !item.userId || !item.sessionId) {
      continue;
    }
    refreshTokens.set(item.token, {
      userId: item.userId,
      sessionId: item.sessionId,
      deviceId: item.deviceId || null,
      createdAt: item.createdAt || Date.now(),
      expiresAt: item.expiresAt || Date.now(),
      userAgent: item.userAgent || null,
      ip: item.ip || null
    });
  }
}

function restoreRevokedRefreshTokens(entries) {
  revokedRefreshTokens.clear();
  if (!Array.isArray(entries)) {
    return;
  }
  for (const token of entries) {
    if (typeof token === 'string' && token.length > 0) {
      revokedRefreshTokens.add(token);
    }
  }
}

function restoreCalendarFeedTokens(entries) {
  calendarFeedTokens.clear();
  if (!Array.isArray(entries)) {
    return;
  }
  for (const item of entries) {
    if (item && item.userId && item.token) {
      calendarFeedTokens.set(item.userId, {
        token: item.token,
        rotatedAt: item.rotatedAt || now()
      });
    }
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function restoreCollection(target, snapshot) {
  target.splice(0, target.length, ...deepClone(snapshot));
}

function snapshotState() {
  return {
    users: deepClone(users),
    progress: deepClone(progress),
    submissions: deepClone(submissions),
    threads: deepClone(threads),
    comments: deepClone(comments),
    pseudocodeDrafts: deepClone(pseudocodeDrafts),
    calendarEvents: deepClone(calendarEvents),
    invoices: deepClone(invoices),
    certificates: deepClone(certificates),
    featureFlags: deepClone(featureFlags),
    reviewQueue: deepClone(reviewQueue),
    supportTickets: deepClone(supportTickets),
    promotions: deepClone(promotions),
    gamificationProfiles: deepClone(gamificationProfiles),
    achievements: deepClone(achievements),
    privacyRequests: deepClone(privacyRequests),
    telemetryEvents: deepClone(telemetryEvents),
    calendarFeedTokens: snapshotCalendarFeedTokens(),
    auditEvents: deepClone(auditEvents),
    ltiRegistrations: deepClone(ltiRegistrations),
    ltiLaunches: deepClone(ltiLaunches),
    scormPackages: deepClone(scormPackages),
    ssoProviders: deepClone(ssoProviders),
    scimDirectory: deepClone(scimDirectory),
    affiliatePartners: deepClone(affiliatePartners),
    affiliatePayouts: deepClone(affiliatePayouts),
    aiHintSessions: deepClone(aiHintSessions),
    refreshTokens: snapshotRefreshTokens(),
    revokedRefreshTokens: snapshotRevokedRefreshTokens()
  };
}

function applySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return;
  }
  if (snapshot.users) restoreCollection(users, snapshot.users);
  if (snapshot.progress) restoreCollection(progress, snapshot.progress);
  if (snapshot.submissions) restoreCollection(submissions, snapshot.submissions);
  if (snapshot.threads) restoreCollection(threads, snapshot.threads);
  if (snapshot.comments) restoreCollection(comments, snapshot.comments);
  if (snapshot.pseudocodeDrafts) restoreCollection(pseudocodeDrafts, snapshot.pseudocodeDrafts);
  if (snapshot.calendarEvents) restoreCollection(calendarEvents, snapshot.calendarEvents);
  if (snapshot.invoices) restoreCollection(invoices, snapshot.invoices);
  if (snapshot.certificates) restoreCollection(certificates, snapshot.certificates);
  if (snapshot.featureFlags) restoreCollection(featureFlags, snapshot.featureFlags);
  if (snapshot.reviewQueue) restoreCollection(reviewQueue, snapshot.reviewQueue);
  if (snapshot.supportTickets) restoreCollection(supportTickets, snapshot.supportTickets);
  if (snapshot.promotions) restoreCollection(promotions, snapshot.promotions);
  if (snapshot.gamificationProfiles) restoreCollection(gamificationProfiles, snapshot.gamificationProfiles);
  if (snapshot.achievements) restoreCollection(achievements, snapshot.achievements);
  if (snapshot.privacyRequests) restoreCollection(privacyRequests, snapshot.privacyRequests);
  if (snapshot.telemetryEvents) restoreCollection(telemetryEvents, snapshot.telemetryEvents);
  if (snapshot.calendarFeedTokens) restoreCalendarFeedTokens(snapshot.calendarFeedTokens);
  if (snapshot.auditEvents) restoreCollection(auditEvents, snapshot.auditEvents);
  if (snapshot.ltiRegistrations) restoreCollection(ltiRegistrations, snapshot.ltiRegistrations);
  if (snapshot.ltiLaunches) restoreCollection(ltiLaunches, snapshot.ltiLaunches);
  if (snapshot.scormPackages) restoreCollection(scormPackages, snapshot.scormPackages);
  if (snapshot.ssoProviders) restoreCollection(ssoProviders, snapshot.ssoProviders);
  if (snapshot.scimDirectory) restoreCollection(scimDirectory, snapshot.scimDirectory);
  if (snapshot.affiliatePartners) restoreCollection(affiliatePartners, snapshot.affiliatePartners);
  if (snapshot.affiliatePayouts) restoreCollection(affiliatePayouts, snapshot.affiliatePayouts);
  if (snapshot.aiHintSessions) restoreCollection(aiHintSessions, snapshot.aiHintSessions);
  if (snapshot.refreshTokens) restoreRefreshTokens(snapshot.refreshTokens);
  if (snapshot.revokedRefreshTokens) restoreRevokedRefreshTokens(snapshot.revokedRefreshTokens);
}

const initialState = snapshotState();

const persistedState = storage.loadState();
if (persistedState) {
  applySnapshot(persistedState);
} else {
  storage.ensureStateFile(initialState);
}

function persistState(stateOverride = null) {
  const snapshot = stateOverride || snapshotState();
  storage.saveState(snapshot);
  return snapshot;
}

function resetRuntimeData() {
  telemetryEvents.length = 0;
  privacyRequests.length = 0;
  calendarFeedTokens.clear();
  auditEvents.length = 0;

  applySnapshot(initialState);
  persistState(initialState);
}

function recordEvent(event) {
  const entry = {
    id: randomUUID(),
    userId: event.userId || null,
    type: event.type,
    metadata: event.metadata || {},
    createdAt: now(),
    source: event.source || 'web'
  };
  telemetryEvents.unshift(entry);
  if (telemetryEvents.length > 5000) {
    telemetryEvents.pop();
  }
  persistState();
  return entry;
}

function storeRefreshTokenRecord(token, record) {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid refresh token provided');
  }
  refreshTokens.set(token, {
    userId: record.userId,
    sessionId: record.sessionId,
    deviceId: record.deviceId || null,
    createdAt: record.createdAt || Date.now(),
    expiresAt: record.expiresAt || Date.now(),
    userAgent: record.userAgent || null,
    ip: record.ip || null
  });
  persistState();
  return refreshTokens.get(token);
}

function getRefreshTokenRecord(token) {
  return refreshTokens.get(token) || null;
}

function deleteRefreshTokenRecord(token) {
  const deleted = refreshTokens.delete(token);
  if (deleted) {
    persistState();
  }
  return deleted;
}

function listRefreshTokensForUser(userId) {
  const results = [];
  for (const [token, record] of refreshTokens.entries()) {
    if (record.userId === userId) {
      results.push({ token, ...record });
    }
  }
  return results;
}

function markRefreshTokenRevoked(token) {
  if (!token) return false;
  const sizeBefore = revokedRefreshTokens.size;
  revokedRefreshTokens.add(token);
  if (revokedRefreshTokens.size !== sizeBefore) {
    persistState();
    return true;
  }
  return false;
}

function isRefreshTokenRevoked(token) {
  return revokedRefreshTokens.has(token);
}

function pruneExpiredRefreshTokenRecords(referenceTime = Date.now()) {
  let removed = 0;
  for (const [token, record] of refreshTokens.entries()) {
    if (record.expiresAt && record.expiresAt <= referenceTime) {
      refreshTokens.delete(token);
      revokedRefreshTokens.add(token);
      removed += 1;
    }
  }
  if (removed > 0) {
    persistState();
  }
  return removed;
}

function clearRefreshTokenState() {
  const hadEntries = refreshTokens.size > 0 || revokedRefreshTokens.size > 0;
  refreshTokens.clear();
  revokedRefreshTokens.clear();
  if (hadEntries) {
    persistState();
  }
}

function listEvents(options = {}) {
  const { userId = null, type = null, limit = 100 } = options;
  return telemetryEvents
    .filter((entry) => {
      if (userId && entry.userId !== userId) {
        return false;
      }
      if (type && entry.type !== type) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
}

function appendAuditEvent(entry) {
  const record = {
    id: randomUUID(),
    event: entry.event,
    actor: entry.actor || null,
    ip: entry.ip || 'unknown',
    userAgent: entry.userAgent || 'unknown',
    createdAt: now(),
    details: entry.details || entry.metadata || entry.meta || null
  };
  auditEvents.push(record);
  if (auditEvents.length > 5000) {
    auditEvents.shift();
  }
  persistState();
  return record;
}

function listAuditEvents(limit = 200) {
  return auditEvents.slice(-limit).reverse();
}

function registerPrivacyRequest({ userId, requestType, reason = null, locale = 'nl-NL' }) {
  const entry = {
    id: randomUUID(),
    userId,
    requestType,
    reason,
    locale,
    status: 'open',
    createdAt: now(),
    updatedAt: now()
  };
  privacyRequests.unshift(entry);
  persistState();
  return entry;
}

function listPrivacyRequests() {
  return privacyRequests.slice();
}

function updatePrivacyRequestStatus(id, status, actorId = null) {
  const request = privacyRequests.find((item) => item.id === id);
  if (!request) {
    return null;
  }
  request.status = status;
  request.updatedAt = now();
  request.reviewedBy = actorId;
  persistState();
  return request;
}

function registerLtiRegistration({
  institution,
  contactEmail,
  clientId,
  deploymentId,
  platformUrl,
  jwksUrl,
  active = true
}) {
  if (!clientId || !deploymentId) {
    throw new Error('clientId en deploymentId zijn verplicht');
  }
  const existing = ltiRegistrations.find(
    (registration) =>
      registration.clientId === clientId && registration.deploymentId === deploymentId
  );
  const payload = {
    institution: institution || 'Onbekend',
    contactEmail: contactEmail || 'unknown@learnzo.io',
    clientId,
    deploymentId,
    platformUrl: platformUrl || null,
    jwksUrl: jwksUrl || null,
    active,
    updatedAt: now()
  };
  if (existing) {
    Object.assign(existing, payload);
    persistState();
    return existing;
  }
  const record = {
    id: `lti-${randomUUID()}`,
    createdAt: now(),
    lastLaunchAt: null,
    ...payload
  };
  ltiRegistrations.push(record);
  persistState();
  return record;
}

function listLtiRegistrations() {
  return ltiRegistrations.slice();
}

function recordLtiLaunch({ clientId, deploymentId, userId, context = {} }) {
  const registration = ltiRegistrations.find(
    (entry) => entry.clientId === clientId && entry.deploymentId === deploymentId
  );
  if (!registration || !registration.active) {
    return null;
  }
  const launch = {
    id: `lti-launch-${randomUUID()}`,
    clientId,
    deploymentId,
    userId: userId || null,
    context,
    launchedAt: now()
  };
  ltiLaunches.unshift(launch);
  registration.lastLaunchAt = launch.launchedAt;
  persistState();
  return launch;
}

function listLtiLaunches(limit = 50) {
  return ltiLaunches.slice(0, limit);
}

function storeScormPackage({ title, version, manifestHash, status = 'processed' }) {
  if (!manifestHash) {
    throw new Error('manifestHash verplicht');
  }
  const existing = scormPackages.find((pkg) => pkg.manifestHash === manifestHash);
  if (existing) {
    Object.assign(existing, {
      title: title || existing.title,
      version: version || existing.version,
      status,
      updatedAt: now()
    });
    persistState();
    return existing;
  }
  const pkg = {
    id: `scorm-${randomUUID()}`,
    title: title || 'Onbekend pakket',
    version: version || '1.2',
    manifestHash,
    status,
    importedAt: now()
  };
  scormPackages.push(pkg);
  persistState();
  return pkg;
}

function listScormPackages() {
  return scormPackages.slice();
}

function registerSsoProvider({ id = null, name, type = 'saml', issuer, metadataUrl, defaultRole = 'student', active = true }) {
  if (!issuer) {
    throw new Error('issuer verplicht');
  }
  const target =
    ssoProviders.find((provider) => provider.id === id || provider.issuer === issuer) || null;
  const payload = {
    name: name || issuer,
    type,
    issuer,
    metadataUrl: metadataUrl || null,
    defaultRole,
    active,
    updatedAt: now()
  };
  if (target) {
    Object.assign(target, payload);
    persistState();
    return target;
  }
  const provider = {
    id: id || `sso-${randomUUID()}`,
    createdAt: now(),
    ...payload
  };
  ssoProviders.push(provider);
  persistState();
  return provider;
}

function listSsoProviders() {
  return ssoProviders.slice();
}

function upsertScimUser({
  externalId,
  email,
  givenName,
  familyName,
  locale = 'nl-NL',
  role = 'student',
  active = true
}) {
  if (!externalId) {
    throw new Error('externalId verplicht');
  }
  const displayName = `${givenName || ''} ${familyName || ''}`.trim() || email || externalId;
  let userRecord = email ? getUserByEmail(email) : null;
  if (!userRecord) {
    const password = generateSecurePassword();
    userRecord = createUserAccount({
      email: email || `${externalId}@scim.learnzo.io`,
      name: displayName,
      password,
      locale,
      plan: 'team'
    });
  } else {
    userRecord.locale = locale;
  }
  if (role && userRecord.role !== role) {
    userRecord.role = role;
  }
  if (!active && userRecord.subscription) {
    userRecord.subscription.status = 'paused';
  }
  const existing = scimDirectory.find((entry) => entry.externalId === externalId);
  const entry = existing || {
    id: `scim-${randomUUID()}`,
    externalId,
    userId: userRecord.id
  };
  Object.assign(entry, {
    displayName,
    email: email || userRecord.email,
    active,
    syncedAt: now()
  });
  if (!existing) {
    scimDirectory.push(entry);
  }
  persistState();
  return { mapping: entry, user: userRecord };
}

function listScimDirectory() {
  return scimDirectory.slice();
}

function deactivateScimUser(externalId) {
  const mapping = scimDirectory.find((entry) => entry.externalId === externalId);
  if (!mapping) return null;
  mapping.active = false;
  mapping.syncedAt = now();
  const userRecord = getUserById(mapping.userId);
  if (userRecord?.subscription) {
    userRecord.subscription.status = 'paused';
  }
  persistState();
  return mapping;
}

function deleteScimUser(externalId) {
  const index = scimDirectory.findIndex((entry) => entry.externalId === externalId);
  if (index === -1) return false;
  const [removed] = scimDirectory.splice(index, 1);
  persistState();
  return removed;
}

function registerAffiliatePartner({ code, name, payoutPercentage = 20 }) {
  if (!code) {
    throw new Error('code verplicht');
  }
  const normalized = code.trim().toUpperCase();
  let partner = affiliatePartners.find((entry) => entry.code === normalized);
  if (partner) {
    partner.name = name || partner.name;
    partner.payoutPercentage = payoutPercentage;
    partner.updatedAt = now();
  } else {
    partner = {
      id: `affiliate-${randomUUID()}`,
      code: normalized,
      name: name || normalized,
      payoutPercentage,
      clicks: 0,
      conversions: 0,
      createdAt: now()
    };
    affiliatePartners.push(partner);
  }
  persistState();
  return partner;
}

function recordAffiliateClick(code) {
  const partner = affiliatePartners.find((entry) => entry.code === code.toUpperCase());
  if (!partner) return null;
  partner.clicks += 1;
  partner.updatedAt = now();
  persistState();
  return partner;
}

function recordAffiliateConversion({ code, amount }) {
  const partner = affiliatePartners.find((entry) => entry.code === code.toUpperCase());
  if (!partner) return null;
  partner.conversions += 1;
  partner.updatedAt = now();
  const payout = {
    id: `affiliate-payout-${randomUUID()}`,
    partnerId: partner.id,
    code: partner.code,
    amount,
    currency: 'EUR',
    generatedAt: now(),
    status: 'pending'
  };
  affiliatePayouts.push(payout);
  persistState();
  return payout;
}

function settleAffiliatePayout(payoutId, status = 'paid') {
  const payout = affiliatePayouts.find((entry) => entry.id === payoutId);
  if (!payout) return null;
  payout.status = status;
  payout.settledAt = now();
  persistState();
  return payout;
}

function listAffiliatePartners() {
  return affiliatePartners.slice();
}

function listAffiliatePayouts() {
  return affiliatePayouts.slice();
}

function storeAiHintSession({ userId, assignmentId, question, requestMeta, response, refusal }) {
  const session = {
    id: `ai-hint-${randomUUID()}`,
    userId,
    assignmentId,
    question,
    requestMeta: requestMeta || {},
    response,
    refusal: Boolean(refusal),
    createdAt: now()
  };
  aiHintSessions.unshift(session);
  if (aiHintSessions.length > 1000) {
    aiHintSessions.pop();
  }
  persistState();
  return session;
}

function listAiHintSessions({ userId = null, limit = 100 } = {}) {
  return aiHintSessions
    .filter((session) => (userId ? session.userId === userId : true))
    .slice(0, limit);
}

function rotateCalendarFeedToken(userId) {
  const token = randomUUID().replace(/-/g, '');
  const entry = {
    token,
    rotatedAt: now()
  };
  calendarFeedTokens.set(userId, entry);
  persistState();
  return entry;
}

function getCalendarFeedToken(userId) {
  const existing = calendarFeedTokens.get(userId);
  if (existing) {
    return existing;
  }
  return rotateCalendarFeedToken(userId);
}

function findUserIdByCalendarToken(token) {
  for (const [userId, entry] of calendarFeedTokens.entries()) {
    if (entry.token === token) {
      return userId;
    }
  }
  return null;
}

function findUserByToken(token) {
  if (!token) return null;
  const [type, userId] = token.split(' ');
  if (type !== 'token' || !userId) return null;
  return users.find((user) => user.id === userId) || null;
}

function createSubmission({ userId, assignmentId, code }) {
  const submission = {
    id: randomUUID(),
    userId,
    assignmentId,
    createdAt: now(),
    status: 'processing',
    score: null,
    testResults: [],
    runtimeMs: null,
    plagioScore: null,
    code
  };
  submissions.unshift(submission);
  persistState();
  return submission;
}

function updateSubmissionResult(id, result) {
  const submission = submissions.find((item) => item.id === id);
  if (!submission) return null;
  Object.assign(submission, result, { updatedAt: now() });
  persistState();
  return submission;
}

function upsertProgress(entry) {
  const existing = progress.find(
    (item) =>
      item.userId === entry.userId &&
      item.entityType === entry.entityType &&
      item.entityId === entry.entityId
  );
  if (existing) {
    Object.assign(existing, entry, { lastSeenAt: now() });
    persistState();
    return existing;
  }
  const created = {
    id: randomUUID(),
    ...entry,
    lastSeenAt: now()
  };
  progress.push(created);
  persistState();
  return created;
}

function createThread({ scope, title, authorId, type, body, tags = [] }) {
  const threadId = randomUUID();
  const commentId = randomUUID();
  const createdAt = now();
  const thread = {
    id: threadId,
    scope,
    title,
    authorId,
    createdAt,
    type,
    tags,
    resolved: false,
    commentIds: [commentId]
  };
  const comment = {
    id: commentId,
    threadId,
    authorId,
    body,
    createdAt,
    updatedAt: createdAt,
    reactions: {}
  };
  threads.unshift(thread);
  comments.unshift(comment);
  persistState();
  return { thread, comment };
}

function addComment({ threadId, authorId, body }) {
  const thread = threads.find((item) => item.id === threadId);
  if (!thread) return null;
  const comment = {
    id: randomUUID(),
    threadId,
    authorId,
    body,
    createdAt: now(),
    updatedAt: now(),
    reactions: {}
  };
  comments.push(comment);
  thread.commentIds.push(comment.id);
  thread.updatedAt = now();
  persistState();
  return comment;
}

function savePseudocodeDraft({ userId, assignmentId, steps, complexityHint }) {
  const draft = {
    id: randomUUID(),
    userId,
    assignmentId,
    steps,
    complexityHint: complexityHint || null,
    createdAt: now()
  };
  pseudocodeDrafts.push(draft);
  persistState();
  return draft;
}

function searchCheatsheets({ language, topic, query }) {
  return cheatsheets.filter((cheat) => {
    if (language && cheat.language !== language) return false;
    if (topic && !cheat.topics.includes(topic)) return false;
    if (query) {
      const normalized = query.toLowerCase();
      return (
        cheat.title.toLowerCase().includes(normalized) ||
        cheat.snippets.some((snippet) => snippet.code.toLowerCase().includes(normalized))
      );
    }
    return true;
  });
}

function findCheatsheetBySlug(slug) {
  return cheatsheets.find((sheet) => sheet.slug === slug) || null;
}

function findAnatomyEntry(language, concept) {
  return (
    anatomyEntries.find(
      (entry) =>
        entry.language.toLowerCase() === language.toLowerCase() &&
        entry.concept.toLowerCase() === concept.toLowerCase()
    ) || null
  );
}

function listAnatomyEntries({ language }) {
  return language
    ? anatomyEntries.filter((entry) => entry.language === language)
    : anatomyEntries;
}

function listMicroVideos({ topic }) {
  return topic
    ? microVideos.filter((video) => video.topics.includes(topic))
    : microVideos;
}

function listCalendarEvents(userId) {
  return calendarEvents.filter((event) => event.userId === userId);
}

function createCalendarEvent({ userId, title, type, start, end }) {
  const event = {
    id: randomUUID(),
    userId,
    title,
    type,
    start,
    end,
    source: 'manual'
  };
  calendarEvents.push(event);
  persistState();
  return event;
}

function updateCalendarEvent(eventId, updates) {
  const event = calendarEvents.find((item) => item.id === eventId);
  if (!event) return null;
  Object.assign(event, updates);
  persistState();
  return event;
}

function deleteCalendarEvent(eventId, userId) {
  const index = calendarEvents.findIndex((item) => item.id === eventId && item.userId === userId);
  if (index === -1) return false;
  calendarEvents.splice(index, 1);
  persistState();
  return true;
}

function listInvoices(userId) {
  return invoices.filter((invoice) => invoice.userId === userId);
}

function listCertificates(userId) {
  return certificates.filter((certificate) => certificate.userId === userId);
}

function toggleFeatureFlag(key, variant) {
  const flag = featureFlags.find((item) => item.key === key);
  if (!flag) return null;
  flag.variant = variant;
  flag.updatedAt = now();
  persistState();
  return flag;
}

function listFeatureFlags() {
  return featureFlags;
}

function listReviewQueue() {
  return reviewQueue;
}

function claimReview(reviewId, mentorId) {
  const review = reviewQueue.find((item) => item.id === reviewId);
  if (!review || review.status !== 'waiting') return null;
  Object.assign(review, { status: 'claimed', claimedBy: mentorId, claimedAt: now() });
  persistState();
  return review;
}

function completeReview(reviewId, mentorId) {
  const review = reviewQueue.find((item) => item.id === reviewId && item.claimedBy === mentorId);
  if (!review) return null;
  Object.assign(review, { status: 'completed', completedAt: now() });
  persistState();
  return review;
}

function listSupportTickets() {
  return supportTickets;
}

function normalizePromotionCode(code) {
  if (!code) return '';
  return String(code)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

function derivePromotionLifecycleStatus(promotion, referenceTime = Date.now()) {
  if (!promotion) return 'unknown';
  const status = promotion.status || 'draft';
  if (status === 'archived') return 'archived';
  if (status === 'paused') return 'paused';
  const start = promotion.startsAt ? Date.parse(promotion.startsAt) : null;
  const end = promotion.endsAt ? Date.parse(promotion.endsAt) : null;
  if (end && Number.isFinite(end) && referenceTime > end) {
    return 'expired';
  }
  if (status === 'active') {
    if (start && Number.isFinite(start) && referenceTime < start) {
      return 'scheduled';
    }
    return 'active';
  }
  if (status === 'scheduled') {
    if (start && Number.isFinite(start) && referenceTime >= start) {
      return 'active';
    }
    return 'scheduled';
  }
  return status;
}

function sanitizePromotion(promotion, referenceTime = Date.now()) {
  return {
    id: promotion.id,
    name: promotion.name,
    code: promotion.code,
    discountType: promotion.discountType,
    value: promotion.value,
    status: promotion.status,
    lifecycleStatus: derivePromotionLifecycleStatus(promotion, referenceTime),
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    usageLimit: promotion.usageLimit,
    perUserLimit: promotion.perUserLimit,
    stackable: Boolean(promotion.stackable),
    appliesTo: {
      plans: Array.isArray(promotion.appliesTo?.plans)
        ? [...promotion.appliesTo.plans]
        : [],
      cohorts: Array.isArray(promotion.appliesTo?.cohorts)
        ? [...promotion.appliesTo.cohorts]
        : []
    },
    notes: promotion.notes || null,
    createdBy: promotion.createdBy || null,
    updatedBy: promotion.updatedBy || null,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt
  };
}

function listPromotions(options = {}) {
  const { includeArchived = false } = options;
  const nowTs = Date.now();
  return promotions
    .filter((promotion) => includeArchived || promotion.status !== 'archived')
    .map((promotion) => sanitizePromotion(promotion, nowTs))
    .sort((a, b) => {
      const aStart = a.startsAt ? Date.parse(a.startsAt) : 0;
      const bStart = b.startsAt ? Date.parse(b.startsAt) : 0;
      return bStart - aStart;
    });
}

function assertValidPlans(plans) {
  if (!plans) return [];
  if (!Array.isArray(plans)) {
    throw Object.assign(new Error('appliesTo.plans must be an array'), {
      code: 'PROMO_VALIDATION'
    });
  }
  const validKeys = new Set(Object.keys(subscriptionPlans));
  const normalized = [];
  for (const plan of plans) {
    const key = String(plan || '').trim();
    if (!validKeys.has(key)) {
      throw Object.assign(new Error(`Unknown plan ${plan}`), {
        code: 'PROMO_VALIDATION'
      });
    }
    normalized.push(key);
  }
  return Array.from(new Set(normalized));
}

function parseIsoDate(value, field) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw Object.assign(new Error(`${field} must be a valid ISO date`), {
      code: 'PROMO_VALIDATION'
    });
  }
  return new Date(timestamp).toISOString();
}

function ensureDiscountPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('Promotion payload is required'), {
      code: 'PROMO_VALIDATION'
    });
  }
  const name = String(payload.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('name is required'), { code: 'PROMO_VALIDATION' });
  }
  const code = normalizePromotionCode(payload.code);
  if (!code) {
    throw Object.assign(new Error('code is required'), { code: 'PROMO_VALIDATION' });
  }
  const discountType = payload.discountType === 'fixed' ? 'fixed' : 'percentage';
  const numericValue = Number(payload.value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw Object.assign(new Error('value must be greater than zero'), {
      code: 'PROMO_VALIDATION'
    });
  }
  if (discountType === 'percentage' && (numericValue > 100 || numericValue <= 0)) {
    throw Object.assign(new Error('percentage value must be between 0 and 100'), {
      code: 'PROMO_VALIDATION'
    });
  }
  const usageLimit =
    payload.usageLimit === null || payload.usageLimit === undefined
      ? null
      : Number(payload.usageLimit);
  if (usageLimit !== null) {
    if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
      throw Object.assign(new Error('usageLimit must be a positive integer'), {
        code: 'PROMO_VALIDATION'
      });
    }
  }
  const perUserLimit =
    payload.perUserLimit === null || payload.perUserLimit === undefined
      ? null
      : Number(payload.perUserLimit);
  if (perUserLimit !== null) {
    if (!Number.isInteger(perUserLimit) || perUserLimit <= 0) {
      throw Object.assign(new Error('perUserLimit must be a positive integer'), {
        code: 'PROMO_VALIDATION'
      });
    }
  }
  const startsAt = parseIsoDate(payload.startsAt, 'startsAt');
  const endsAt = parseIsoDate(payload.endsAt, 'endsAt');
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw Object.assign(new Error('endsAt must be after startsAt'), {
      code: 'PROMO_VALIDATION'
    });
  }
  const stackable = Boolean(payload.stackable);
  const appliesTo = {
    plans: assertValidPlans(payload.appliesTo?.plans || payload.plans || []),
    cohorts: Array.isArray(payload.appliesTo?.cohorts)
      ? Array.from(new Set(payload.appliesTo.cohorts.map((entry) => String(entry || '').trim()).filter(Boolean)))
      : []
  };
  const notes = payload.notes ? String(payload.notes).trim() : null;
  return {
    name,
    code,
    discountType,
    value: discountType === 'percentage' ? Number(numericValue.toFixed(2)) : Math.round(numericValue),
    usageLimit,
    perUserLimit,
    startsAt,
    endsAt,
    stackable,
    appliesTo,
    notes
  };
}

function findPromotionByCode(code) {
  const normalized = normalizePromotionCode(code);
  if (!normalized) return null;
  return promotions.find((promotion) => promotion.code === normalized) || null;
}

function createPromotion({ payload, actorId }) {
  const data = ensureDiscountPayload(payload);
  if (findPromotionByCode(data.code)) {
    throw Object.assign(new Error('Promotion code already exists'), {
      code: 'PROMO_CONFLICT'
    });
  }
  const nowIso = now();
  const promotion = {
    id: `promo-${randomUUID()}`,
    ...data,
    status: 'draft',
    createdBy: actorId || null,
    updatedBy: actorId || null,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  promotions.unshift(promotion);
  persistState();
  return sanitizePromotion(promotion);
}

function updatePromotion({ id, patch, actorId }) {
  const promotion = promotions.find((item) => item.id === id);
  if (!promotion) {
    throw Object.assign(new Error('Promotion not found'), { code: 'PROMO_NOT_FOUND' });
  }
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'status')) {
    throw Object.assign(new Error('Use the status endpoints to change promotion state'), {
      code: 'PROMO_VALIDATION'
    });
  }
  const merged = ensureDiscountPayload({ ...promotion, ...patch });
  if (merged.code !== promotion.code && findPromotionByCode(merged.code)) {
    throw Object.assign(new Error('Promotion code already exists'), {
      code: 'PROMO_CONFLICT'
    });
  }
  Object.assign(promotion, merged, {
    updatedAt: now(),
    updatedBy: actorId || promotion.updatedBy
  });
  persistState();
  return sanitizePromotion(promotion);
}

function transitionPromotionStatus({ id, action, actorId }) {
  const promotion = promotions.find((item) => item.id === id);
  if (!promotion) {
    throw Object.assign(new Error('Promotion not found'), { code: 'PROMO_NOT_FOUND' });
  }
  const allowedActions = new Set(['activate', 'pause', 'archive']);
  if (!allowedActions.has(action)) {
    throw Object.assign(new Error('Unsupported promotion action'), {
      code: 'PROMO_VALIDATION'
    });
  }
  if (action === 'activate') {
    if (promotion.status === 'archived') {
      throw Object.assign(new Error('Cannot activate an archived promotion'), {
        code: 'PROMO_VALIDATION'
      });
    }
    if (promotion.status === 'active') {
      return sanitizePromotion(promotion);
    }
    const nowIso = now();
    const startsAtTs = promotion.startsAt ? Date.parse(promotion.startsAt) : null;
    if (!startsAtTs || startsAtTs > Date.now()) {
      promotion.startsAt = nowIso;
    }
    promotion.status = 'active';
  } else if (action === 'pause') {
    if (promotion.status !== 'active' && promotion.status !== 'scheduled') {
      throw Object.assign(new Error('Only active or scheduled promotions can be paused'), {
        code: 'PROMO_VALIDATION'
      });
    }
    promotion.status = 'paused';
  } else if (action === 'archive') {
    promotion.status = 'archived';
  }
  promotion.updatedAt = now();
  promotion.updatedBy = actorId || promotion.updatedBy;
  persistState();
  return sanitizePromotion(promotion);
}

function ensureGamificationProfile(userId) {
  let profile = gamificationProfiles.find((item) => item.userId === userId);
  let created = false;
  if (!profile) {
    profile = {
      userId,
      xp: 0,
      level: 1,
      streak: {
        current: 0,
        longest: 0,
        lastRecordedAt: null
      },
      badges: []
    };
    gamificationProfiles.push(profile);
    created = true;
  }
  profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
  if (created) {
    persistState();
  }
  return profile;
}

function getGamificationState(userId) {
  const profile = ensureGamificationProfile(userId);
  return {
    userId: profile.userId,
    xp: profile.xp,
    level: profile.level,
    streak: { ...profile.streak },
    badges: [...profile.badges],
    achievements: achievements
      .filter((item) => item.userId === userId)
      .map((item) => ({ ...item }))
  };
}

function awardAchievement({ userId, type, title, description, points = 0, evidence = null, awardedBy = null }) {
  const profile = ensureGamificationProfile(userId);
  const entry = {
    id: `achievement-${randomUUID()}`,
    userId,
    type,
    title,
    description,
    points,
    evidence,
    awardedBy,
    earnedAt: now()
  };
  achievements.unshift(entry);
  if (typeof points === 'number' && Number.isFinite(points)) {
    profile.xp += points;
  }
  profile.level = Math.max(1, Math.floor(profile.xp / 500) + 1);
  persistState();
  return entry;
}

function incrementStreak(userId, amount = 1) {
  const profile = ensureGamificationProfile(userId);
  const increment = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  profile.streak.current += increment;
  if (profile.streak.current > profile.streak.longest) {
    profile.streak.longest = profile.streak.current;
  }
  profile.streak.lastRecordedAt = now();
  persistState();
  return { ...profile.streak };
}

function resetStreak(userId) {
  const profile = ensureGamificationProfile(userId);
  profile.streak.current = 0;
  profile.streak.lastRecordedAt = now();
  persistState();
  return { ...profile.streak };
}

function changeUserSubscription({ userId, plan, status = 'active', trialEndsAt = null }) {
  const user = users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }
  const planKey = subscriptionPlans[plan] ? plan : 'free';
  const planDefinition = subscriptionPlans[planKey];
  const nowIso = now();
  const renewal =
    status === 'active' && planDefinition.termDays
      ? new Date(Date.now() + planDefinition.termDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
  const subscription = {
    plan: planDefinition.id,
    status,
    start: user.subscription?.start || nowIso,
    renewal,
    updatedAt: nowIso,
    trialEndsAt
  };
  if (status === 'paused' || status === 'canceled') {
    subscription.endedAt = nowIso;
  }
  user.subscription = subscription;
  persistState();
  return subscription;
}

function createUserAccount({ email, name, password, locale = 'nl-NL', plan = 'free' }) {
  if (!email || getUserByEmail(email)) {
    throw new Error('Email already registered');
  }
  const nowIso = now();
  const user = {
    id: `user-${randomUUID()}`,
    email,
    name: name || email.split('@')[0],
    role: 'student',
    locale,
    avatar: 'https://placehold.co/128x128',
    createdAt: nowIso,
    subscription: null,
    auth: {
      password: createPasswordRecord(password),
      mfaEnabled: false,
      lastLoginAt: null,
      lastPasswordChangeAt: nowIso
    }
  };
  users.push(user);
  changeUserSubscription({ userId: user.id, plan, status: 'active' });
  ensureGamificationProfile(user.id);
  persistState();
  return user;
}

function getDashboardForUser(userId) {
  const path = paths[0];
  const lessonsCompleted = progress.filter(
    (item) => item.userId === userId && item.entityType === 'lesson' && item.status === 'completed'
  ).length;
  const gamification = getGamificationState(userId);
  return {
    streak: gamification.streak.current,
    upcomingEvents: listCalendarEvents(userId),
    activePath: path,
    lessonsCompleted,
    totalLessons: Object.values(lessons).length,
    submissions: submissions.filter((submission) => submission.userId === userId).slice(0, 3),
    xp: gamification.xp,
    level: gamification.level,
    badges: gamification.badges
  };
}

function getUserByEmail(email) {
  if (!email) {
    return null;
  }
  return (
    users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null
  );
}

function getUserById(id) {
  if (!id) {
    return null;
  }
  return users.find((user) => user.id === id) || null;
}

function markUserLogin(userId) {
  const user = getUserById(userId);
  if (!user) {
    return null;
  }
  user.auth.lastLoginAt = now();
  persistState();
  return user;
}

module.exports = {
  users,
  paths,
  courses,
  lessons,
  assignments,
  quizzes,
  progress,
  submissions,
  threads,
  comments,
  pseudocodeDrafts,
  cheatsheets,
  anatomyEntries,
  microVideos,
  calendarEvents,
  invoices,
  certificates,
  featureFlags,
  ltiRegistrations,
  ltiLaunches,
  scormPackages,
  ssoProviders,
  scimDirectory,
  affiliatePartners,
  affiliatePayouts,
  promotions,
  gamificationProfiles,
  achievements,
  subscriptionPlans,
  createSubmission,
  updateSubmissionResult,
  upsertProgress,
  createThread,
  addComment,
  savePseudocodeDraft,
  searchCheatsheets,
  findCheatsheetBySlug,
  findAnatomyEntry,
  listAnatomyEntries,
  listMicroVideos,
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listInvoices,
  listCertificates,
  toggleFeatureFlag,
  listFeatureFlags,
  listReviewQueue,
  claimReview,
  completeReview,
  listSupportTickets,
  listPromotions,
  createPromotion,
  updatePromotion,
  transitionPromotionStatus,
  getGamificationState,
  awardAchievement,
  incrementStreak,
  resetStreak,
  changeUserSubscription,
  createUserAccount,
  getDashboardForUser,
  getUserByEmail,
  getUserById,
  markUserLogin,
  recordEvent,
  listEvents,
  appendAuditEvent,
  listAuditEvents,
  registerPrivacyRequest,
  listPrivacyRequests,
  updatePrivacyRequestStatus,
  getCalendarFeedToken,
  rotateCalendarFeedToken,
  findUserIdByCalendarToken,
  resetRuntimeData,
  registerLtiRegistration,
  listLtiRegistrations,
  recordLtiLaunch,
  listLtiLaunches,
  storeScormPackage,
  listScormPackages,
  registerSsoProvider,
  listSsoProviders,
  upsertScimUser,
  listScimDirectory,
  deactivateScimUser,
  deleteScimUser,
  registerAffiliatePartner,
  recordAffiliateClick,
  recordAffiliateConversion,
  settleAffiliatePayout,
  listAffiliatePartners,
  listAffiliatePayouts,
  storeAiHintSession,
  listAiHintSessions,
  apiCatalog,
  storeRefreshTokenRecord,
  getRefreshTokenRecord,
  deleteRefreshTokenRecord,
  listRefreshTokensForUser,
  markRefreshTokenRevoked,
  isRefreshTokenRevoked,
  pruneExpiredRefreshTokenRecords,
  clearRefreshTokenState
};
