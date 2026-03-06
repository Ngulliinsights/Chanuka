# CHANUKA — APPLICATION SAMPLES
*Tailored applications for each opportunity · March 2026*

---

> **How to use this document.** Each application is written for its specific audience, framing, and submission format. Read the context note before each one. Replace `[your name]` and `[your contact]` throughout. Do not send the same version to multiple organisations — the tailoring is the point.

---

## 01 · CODE FOR AFRICA — DATA FELLOWSHIP

**Why this is your highest-priority application.** Code for Africa funds and incubates exactly this kind of civic data infrastructure. They have previously supported parliamentary monitoring in Kenya (including Mzalendo). They will not need the problem explained to them — your job is to demonstrate that your approach is technically mature and strategically differentiated.

**Framing for this audience:** Technical credibility first, civic mission second. They fund builders. Lead with what you built.

---

### Cover Letter

Dear Code for Africa Fellowships Team,

I am applying for the Data Fellowship with a project that addresses what I believe is the most consequential gap in Kenya's civic technology landscape: the absence of infrastructure that converts parliamentary voting records into electoral accountability.

Chanuka is a parliamentary accountability platform currently in development for a Nairobi pilot. It is not a transparency tool — Kenya has those. It is an accountability engine: a system that scrapes and parses National Assembly Hansard data, extracts per-MP voting records from PDF division tables, calculates the gap between how MPs vote and what their constituents want, and surfaces that gap as electoral pressure at the constituency level.

The technical foundation is production-grade. The platform runs a three-layer scraping pipeline (discovery, extraction, transformation) that handles parliament.go.ke's JavaScript-rendered pages via Puppeteer, PDF division table parsing via regex against Hansard documents, MP name normalisation across document variants, and a confidence-level system that ensures only verified data reaches public-facing scorecards. The backend is Node.js/TypeScript with PostgreSQL, Neo4j for parliamentary network analysis, Redis, and WebSocket real-time delivery. The frontend is React 18. The full stack has been independently audited.

A USSD interface for feature phone access is in the pipeline — not as an afterthought but as a founding design constraint. The accountability gap in Kenya is not distributed along smartphone ownership lines. The infrastructure cannot be either.

The Nairobi pilot targets 17 constituencies and 4.3 million constituents using the 13th Parliament's Hansard record as its primary data source. The pilot is not a proof of concept. The concept is proven in the codebase. The pilot is the first demonstration that the accountability loop functions with real constituents and real electoral stakes.

I am building this independently and am seeking a fellowship that provides the institutional affiliation, network access, and stipend that would allow me to complete the pilot without interruption. Code for Africa's presence across African newsrooms and civil society networks represents exactly the distribution infrastructure the pilot needs to reach its first users.

I would welcome the opportunity to walk your team through the technical implementation and the pilot plan.

[Your name]
[Your contact]

---

### Project Description (500 words)

**Project title:** Chanuka — Parliamentary Accountability Infrastructure for Kenya

**The problem.** Kenya's parliamentary voting records are technically public and practically inaccessible. They exist in PDF Hansard documents, structured for archival rather than citizen access, without the translation, normalisation, or constituency-level filtering that would make them usable by the people they most affect. Existing transparency tools have addressed the information gap. None have addressed the accountability gap — the step between knowing what happened and being able to act on it electorally.

**What Chanuka does.** Chanuka ingests parliamentary data through a three-layer scraping pipeline, extracts individual MP votes from Hansard PDF division tables, translates bills into plain language, detects constitutional violations and hidden legislative provisions, and calculates a representative gap score: the measured difference between how an MP votes and what their constituency wants. That score drives an electoral accountability scorecard visible to constituents at the moment it matters.

**What makes it different.** Most civic tech in Kenya asks: *how do we get citizens more information?* Chanuka asks: *how do we make representative behaviour have electoral consequences?* The distinction is the difference between a library and an enforcement mechanism. The platform is designed for the latter.

**Technical maturity.** The platform is built on a production-grade TypeScript stack. The scraping pipeline handles parliament.go.ke's inconsistent architecture — JavaScript-rendered pages, PDF-encoded voting tables, name variations across documents — and assigns a confidence level to every extracted record. No uncertain data is displayed publicly. An independent technical audit characterised the codebase as having "production-grade features" with "excellent database schema" and "thoughtful security."

**The USSD layer.** A complete USSD interface exists in the codebase to serve Kenyans without smartphones. This is not a feature added for optics. It reflects the founding design constraint: accountability infrastructure that requires a smartphone is infrastructure designed for the wrong people.

**Pilot scope.** The Nairobi pilot covers 17 constituencies, 4.3 million constituents, and the full voting record of Nairobi MPs in the 13th Parliament. Distribution will run through civil society networks and community channels. The primary success metric is return visits — evidence that citizens are using Chanuka as a reference, not a novelty.

**What the fellowship enables.** Code for Africa's institutional affiliation and network access to African newsrooms and civil society organisations represents the distribution infrastructure the pilot cannot build alone. The fellowship stipend removes the income constraint that is currently the binding constraint on pilot completion speed.

**Founder.** I am building Chanuka independently, without co-founder or institutional affiliation. The codebase, architecture, scraping pipeline, and pilot plan are entirely self-developed. I am seeking a fellowship that compounds rather than replaces my existing work.

---

## 02 · MOZILLA TECHNOLOGY FUND — OPEN SOURCE TRACK

**Context.** The Mozilla Technology Fund funds open civic infrastructure with a responsible technology lens. They are not primarily interested in what the platform does — they are interested in *how it does it*. The confidence-level system, the CIB detection, and the explicit decision not to display unverified data are the signals that matter here. Lead with responsible AI and open infrastructure. The democratic mission is the frame, not the pitch.

**Framing:** Responsible civic AI built on open infrastructure. The platform's epistemic humility — its refusal to display uncertain data — is the differentiator.

---

### Letter of Inquiry

Dear Mozilla Technology Fund,

I am writing to inquire about the Open Source Track for Chanuka, a parliamentary accountability platform for Kenya currently in development.

Chanuka addresses a specific failure mode in civic AI: the tendency to surface confident-looking outputs from unverified data. In the context of electoral accountability — where a wrong MP vote score is not a minor data error but a potentially defamatory and politically weaponisable mistake — this failure mode is not theoretical. It is the failure that would end the platform's credibility and civic usefulness on its first day of public operation.

The platform's architecture is built around this risk. Every extracted data point carries a confidence level: `verified` (cross-validated across sources), `extracted` (single-source, passed validation), `uncertain` (low-confidence extraction), or `flagged` (contradicts other data, queued for manual review). Only `verified` and `extracted` records appear on public-facing scorecards. Uncertain and flagged records are hidden until a human reviewer resolves them. The system has a daily manual review queue. A flag that sits for more than 48 hours removes the affected data from public view automatically.

This is not a feature. It is a constitutional commitment embedded in the data architecture.

The platform also implements CIB (Coordinated Inauthentic Behaviour) detection — recognising that a civic platform surfacing MP accountability data will attract adversarial manipulation from political actors with an interest in corrupting the signal. The detection layer sits upstream of the accountability scorecard.

The full codebase is designed to be open infrastructure: the scraping pipeline that handles parliament.go.ke's inconsistent architecture, the PDF parsing layer for Hansard voting tables, the confidence-level schema, and the gap calculation service are all intended to be replicable by parliamentary monitoring organisations across East Africa.

I would welcome the opportunity to discuss whether Chanuka fits within the Technology Fund's current priorities.

[Your name]
[Your contact]

---

## 03 · MZALENDO TRUST — PARTNERSHIP APPROACH

**Context.** This is not a job application. It is a partnership conversation. Mzalendo has been doing manually, for a decade, what Chanuka does computationally. The approach must honour that history, not diminish it. The frame is: *I have built infrastructure that could amplify what you are already doing.* Go in with genuine curiosity about their data and their constraints. The role conversation comes after the partnership conversation.

**Format:** This is an email requesting a meeting, not a formal application. Keep it short. The meeting is the application.

**Framing:** Peer to peer. Builder to builder. Deep respect for what they have done and a specific offer about what could be built together.

---

### Initial Email

Subject: Parliamentary accountability infrastructure — could we find 30 minutes?

Dear [Mzalendo contact name],

I have been building a parliamentary accountability platform for Kenya — Chanuka — and I have reached a point where I think a conversation with Mzalendo would be genuinely useful for both of us.

Chanuka does something adjacent to what Mzalendo does, but at a different layer: it is an accountability engine rather than a transparency portal. It extracts per-MP voting records from Hansard PDFs, calculates a representative gap score between MP voting behaviour and constituency sentiment, and drives electoral accountability scorecards. The USSD layer for feature phone access is in the pipeline. The Nairobi pilot targets 17 constituencies.

I say this not to position Chanuka as a competitor — it isn't — but because I think there is a meaningful conversation about what the two platforms could do together that neither can do alone. Mzalendo has ten years of parliamentary data, established relationships across civil society, and credibility with funders who already understand the problem. Chanuka has infrastructure that automates some of what Mzalendo currently does manually, at a layer of electoral accountability that Mzalendo has not yet built.

I am also, practically speaking, looking for a part-time embedded role while the pilot develops. I want to be honest about that rather than obscure it behind a partnership pitch. But the partnership conversation is the real one, and I would rather start there.

Would you have 30 minutes in the next two weeks?

[Your name]
[Your contact]
[Link to founder brief or GitHub]

---

## 04 · AGA KHAN FOUNDATION KENYA — CIVIC ENGAGEMENT PROGRAMME

**Context.** AKF Kenya funds programme officers, not technologists. The frame here shifts significantly: you are a civic programme builder who uses technology, not a technologist who cares about civic issues. Emphasise the constituency-level design, the USSD decision, and the theory of change. Minimise the technical stack.

**Framing:** Civic participation and community accountability. The technology is invisible infrastructure serving a programme goal.

---

### Expression of Interest

Dear Aga Khan Foundation Kenya,

I am writing to express interest in programme roles within AKF Kenya's civic engagement work.

I am the founder of Chanuka, a parliamentary accountability platform for Kenya currently preparing for a Nairobi pilot. My work sits at the intersection of civic participation and democratic accountability: building the infrastructure that allows citizens — particularly those in constituencies with limited digital access — to understand how their representatives vote, measure the gap between that voting record and their own interests, and exercise meaningful electoral pressure as a result.

The platform's design reflects a specific theory of change. Information access — the ability to read parliamentary bills or find an MP's profile — is necessary but not sufficient for accountability. What is missing in Kenya's civic technology landscape is not more information but a system that converts information into consequence: a feedback loop between representative behaviour and electoral outcome that is visible, measurable, and usable by community organisers who do not have legal or parliamentary expertise.

The USSD interface — a complete feature-phone access layer — is a founding design constraint, not an afterthought. The accountability gap in Kenya is not distributed along smartphone ownership lines, and the infrastructure built to address it cannot be either.

I am building this independently and am seeking a part-time embedded role with an organisation whose programme work compounds what Chanuka is building. AKF Kenya's work on civic participation and community accountability represents exactly the programmatic context within which the platform's first pilot would be most meaningful.

I would welcome the opportunity to discuss whether there is a role where my work would strengthen your programme, and your programme would strengthen mine.

[Your name]
[Your contact]

---

## 05 · SCHMIDT FUTURES — AI IN SOCIETY FELLOWSHIP

**Context.** Schmidt Futures funds people, not projects. The application is fundamentally about you as a thinker — your capacity to identify a problem that others have missed, your judgment in building a response, and your potential to influence how civic AI develops more broadly. Chanuka is the evidence, not the pitch.

**Framing:** You are a person using AI to solve a structural democratic failure. The platform is evidence of your judgment. The fellowship is about what you will do with the next five years, not the next six months.

---

### Fellowship Application Essay

**Prompt (typical): Describe the problem you are working on and why you are the person to work on it.**

The problem I am working on is not a Kenyan problem. It is a structural failure in how democracy operationalises accountability — a failure that is becoming visible globally as the institutions assumed to enforce accountability demonstrate, one by one, that they cannot or will not do so.

Kenya's parliament produces more data than any citizen can navigate: bills, Hansard records, division votes, committee proceedings, financial disclosures. None of this data is organised to answer the question that accountability requires: *Does my representative vote the way I would want them to vote, and if not, what are the consequences?* The data exists in forms designed for archival, not for the activation of democratic pressure. The gap between the data's existence and its usefulness to a constituent in Kibra is the accountability gap I am building infrastructure to close.

Chanuka is my response. It is a parliamentary accountability platform that extracts per-MP voting records from Hansard PDFs, calculates a representative gap score at the constituency level, and drives electoral accountability scorecards that are designed to be used by community organisers, not by researchers. The platform includes ML-assisted detection of constitutional violations in legislation and a trojan bill detector — a model trained to identify legislation whose stated purpose diverges from its operative provisions. A USSD layer serves citizens without smartphones. Every data point carries a confidence level, and the system is architected so that uncertain data cannot appear on public-facing outputs.

I am working on this problem because I believe we are at an inflection point. The collapse of the United States as a moral anchor for democratic norms has sent a signal to already-corrupt governments in growing economies: democratic form can persist without democratic function, and the cost of that substitution is lower than previously assumed. The appropriate response is not to defend democratic aesthetics but to complete democratic infrastructure — to build the systems that make the accountability mechanism real rather than procedural.

I am the person to work on this because I have already built the first version of it, alone, without institutional support, because I concluded it was necessary. The technical architecture exists. The scraping pipeline is operational. The pilot plan is concrete. What I need is the institutional context to understand how this infrastructure scales — how the Chanuka model applies to other parliamentary democracies, how it interacts with electoral commission data, how it survives political pressure from the actors whose behaviour it makes visible. That is the work a Schmidt fellowship would enable.

---

## 06 · PARADIGM INITIATIVE — PROGRAMME / RESEARCH ROLE

**Context.** Paradigm Initiative works on digital rights across Africa. They are a natural home for someone building civic technology at the intersection of data, rights, and democratic accountability. The frame here is digital rights as a prerequisite for democratic participation — access to one's representative's voting record is a rights question, not just a transparency question.

**Framing:** Digital rights and civic participation. The accountability gap is a rights gap.

---

### Application Letter

Dear Paradigm Initiative,

I am writing to express interest in programme or research roles at Paradigm Initiative.

My background is in building civic technology infrastructure. I am the founder of Chanuka, a parliamentary accountability platform for Kenya that treats access to one's representative's voting record not as a convenience but as a democratic right — one that Kenya's current information architecture systematically denies to citizens without legal expertise, parliamentary knowledge, or reliable internet access.

The platform addresses three overlapping rights failures. First, the right to understand legislation that governs you: Chanuka translates bills into plain language and flags constitutional violations, making parliamentary content accessible without specialist knowledge. Second, the right to know how your representative votes: the platform extracts per-MP division records from Hansard PDFs and surfaces them at the constituency level in a form that is usable rather than archival. Third, the right to participate equally regardless of digital access: the USSD interface ensures that feature phone users — a substantial majority of the citizens most affected by accountability gaps — are not excluded by infrastructure designed for smartphone owners.

The platform also implements CIB (Coordinated Inauthentic Behaviour) detection, recognising that a civic platform making MP voting behaviour visible will attract adversarial manipulation from political actors whose interests it challenges. This is a digital rights concern as much as a technical one: the integrity of civic data infrastructure is a prerequisite for the rights it is designed to enable.

I am building Chanuka independently and am seeking a part-time role with an organisation whose work would deepen my understanding of the rights frameworks that the platform operationalises. Paradigm Initiative's work across digital rights in Africa represents exactly that context.

I would welcome the opportunity to discuss how my work might contribute to your programme.

[Your name]
[Your contact]

---

## 07 · UNDP KENYA — SHORT-TERM CONSULTANT (DIGITAL GOVERNANCE)

**Context.** UNDP hires consultants for specific deliverables, not for vision. The application needs a concrete offer: here is what I can do for you, here is what it will produce. The Chanuka work is the credential, not the project. Keep it professional and deliverable-focused.

**Framing:** Technical expert in parliamentary data systems and civic technology. Available for defined-scope engagements.

---

### Consultancy Inquiry

Dear UNDP Kenya Governance Programme,

I am writing to express interest in short-term consultancy engagements related to digital governance and parliamentary transparency.

I am a civic technology developer with specific expertise in parliamentary data systems. I am the founder of Chanuka, a parliamentary accountability platform for Kenya currently preparing for a Nairobi pilot, which has given me detailed technical knowledge of Kenya's parliamentary data infrastructure: the architecture of parliament.go.ke, the Hansard publication system, the structure of division voting records, and the gaps between publicly available data and citizen-accessible information.

My technical capabilities relevant to UNDP Kenya's governance work include: parliamentary data pipeline development (scraping, extraction, normalisation, and validation of legislative data); plain-language translation of legislative content; constitutional analysis tooling; and civic engagement platform design with explicit attention to digital access equity (including USSD and feature phone interface development).

I am available for defined-scope engagements and would welcome the opportunity to discuss where my expertise might support your programme's current priorities. I am particularly interested in work related to parliamentary transparency, electoral accountability, or civic data infrastructure — areas where my existing technical work would compound rather than duplicate the engagement's deliverables.

Please find attached a brief overview of my current work. I would be glad to discuss further at your convenience.

[Your name]
[Your contact]
[Attachment: Chanuka founder brief]

---

## 08 · INTERNATIONAL IDEA — COUNTRY-LEVEL RESEARCH CONSULTANT

**Context.** International IDEA works on democracy assessment across Africa. They commission research on electoral integrity, parliamentary function, and accountability mechanisms. The frame here is research and analysis: you understand the accountability gap in Kenya at a level of technical and institutional depth that is rare, and that depth is what you are offering.

**Framing:** Research expertise on parliamentary accountability mechanisms in Kenya. Chanuka is the evidence of depth, not the product being sold.

---

### Consultancy Expression of Interest

Dear International IDEA,

I am writing to express interest in research consultancy opportunities related to democratic accountability and parliamentary transparency in Kenya.

I am the founder of Chanuka, a parliamentary accountability platform for Kenya, and have spent the past year developing detailed technical and institutional knowledge of how Kenya's parliament produces, publishes, and obscures its voting records. This work has given me a granular understanding of the accountability gap in Kenya's legislative system — not as an abstract concern but as a specific, measurable failure in information architecture.

My research contribution to International IDEA's work would be most relevant in three areas: first, the technical assessment of parliamentary data systems in Kenya (specifically the gap between data availability and data accessibility for citizens); second, the measurement of representative-constituent alignment using voting record analysis and sentiment data; and third, the evaluation of existing civic technology tools against a functional accountability standard — distinguishing tools that provide information from tools that enable consequence.

The distinction between transparency and accountability is, I would argue, the most important conceptual gap in current democracy assessment frameworks. Most tools measure whether information exists. Fewer measure whether that information produces electoral consequences. Chanuka is built around the latter question, and the research that underpins its design is directly applicable to cross-country comparative work on democratic accountability.

I would welcome the opportunity to discuss whether my work aligns with International IDEA's current research priorities in East Africa.

[Your name]
[Your contact]

---

## 09 · INSTITUTE FOR SOCIAL ACCOUNTABILITY (TISA) — PROGRAMME ROLE

**Context.** TISA works on budget transparency and public participation in Kenya. They understand constituency-level accountability and have established community networks. The frame is programmatic: you can help them deepen their accountability work with better data infrastructure, and they can provide you with the community networks the Chanuka pilot needs.

**Framing:** Partnership framing. You bring infrastructure, they bring community. Both sides gain.

---

### Approach Letter

Subject: Civic accountability infrastructure — potential collaboration

Dear TISA,

I am the founder of Chanuka, a parliamentary accountability platform for Kenya currently in development, and I believe there is a meaningful conversation to be had about how our work intersects with yours.

TISA's work on budget transparency and public participation addresses one of the most important levers of accountability in Kenyan civic life. My platform addresses an adjacent lever: the voting behaviour of the MPs who pass the budgets you track, and the electoral consequences of the gap between that behaviour and what their constituents want.

The Nairobi pilot I am preparing targets 17 constituencies with MP accountability scorecards built from verified Hansard voting data. The pilot's primary constraint is not data or infrastructure — it is the community networks through which the accountability information reaches the citizens it is designed to serve. TISA's existing relationships with community organisations and budget monitoring groups in Nairobi represent exactly the distribution channels that would make the pilot meaningful.

I am also looking for a part-time programme role while the pilot develops — and I want to be direct about that rather than dress it in purely collaborative language. I believe the right arrangement is one where my technical contribution to TISA's accountability programme is genuine and valued, while TISA's programmatic infrastructure helps Chanuka reach its first real users.

Could we find time to talk about whether that kind of arrangement makes sense to you?

[Your name]
[Your contact]

---

## 10 · NEW AMERICA FELLOWSHIP

**Context.** New America funds people working at the intersection of technology and public interest. They have a strong track record with democracy and technology internationally. The fellowship essay needs to position you as a thinker whose work speaks to questions that are not only Kenyan — the accountability infrastructure argument must scale.

**Framing:** Global democratic infrastructure question, Kenyan implementation. The work is local; the argument is universal.

---

### Fellowship Application Essay

**Why this work matters beyond Kenya.**

The accountability gap I am building Chanuka to close is not a Kenyan gap. It is a structural feature of representative democracy as it has been implemented across the Global South — and, increasingly, as it is fraying at the edges of established democracies in the Global North.

Representative democracy rests on a feedback loop: citizens express preferences through elections, representatives translate those preferences into legislation, and citizens evaluate the translation and adjust their electoral behaviour accordingly. The loop works when the translation is visible, measurable, and consequential. It fails when any of those three conditions is absent. In Kenya, all three are absent simultaneously: voting records are technically public but practically inaccessible, the gap between representative behaviour and constituent preference is never measured, and the measurement never makes it into the electoral calculation.

This is not a Kenyan failure of political will. It is a global failure of infrastructure design. Democratic institutions were designed in an era when the feedback loop was enforced by proximity — small constituencies, visible representatives, community-level accountability. Scale destroyed that proximity. The infrastructure that would replace it was never built.

Chanuka is my attempt to build one version of it. The platform is Kenyan in its implementation and universal in its argument: that democracy cannot function at scale without systems that make the gap between representative behaviour and constituent preference visible, measurable, and electorally consequential.

The moment I am building into is one in which that argument has become urgent. The United States' democratic regression has demonstrated what was previously theoretical: that democratic form can persist long after democratic function has been captured. The lesson has been taken by governments across the developing world. The response cannot be to defend the form. It must be to complete the function.

I am applying to the New America Fellowship because I believe the work I am doing in Kenya is a contribution to a global conversation about what democratic infrastructure looks like at the scale and under the pressures that 21st-century democracy actually faces. The fellowship would give me the intellectual community and institutional context to make that contribution more than a platform and a pilot — to make it an argument that travels.

---

## 11 · SKOLL FOUNDATION — SOCIAL ENTREPRENEUR INQUIRY

**Context.** Skoll funds social entrepreneurs at the inflection point of proven model and scale. The frame is impact and scalability: what has been proven, what the next stage enables, and what replication looks like across the continent. Less technical than other applications — more narrative and impact-focused.

**Framing:** Social entrepreneur building democratic accountability infrastructure. Nairobi pilot as proof of model. East Africa as the scale case.

---

### Letter of Inquiry

Dear Skoll Foundation,

I am writing to inquire about support for Chanuka, a parliamentary accountability platform for Kenya that I believe represents a replicable model for democratic infrastructure across Sub-Saharan Africa.

Chanuka addresses what I have come to see as the most consequential missing piece in African civic technology: not the absence of information about what governments do, but the absence of infrastructure that converts that information into electoral accountability. Kenya has parliamentary data. Citizens cannot use it. The gap between those two facts is what Chanuka is built to close.

The platform quantifies the gap between how MPs vote and what their constituents want — what I call the representative gap — and surfaces that score as an electoral accountability tool at the constituency level. It includes plain-language bill translation, constitutional violation detection, and a USSD interface for citizens without smartphones. The Nairobi pilot, targeting 17 constituencies and 4.3 million constituents, will be the first demonstration of the accountability loop in practice.

The replication argument is direct. Kenya's parliament operates on infrastructure — Hansard PDFs, publicly accessible voting records, constituency-level MP data — that is structurally similar to the parliamentary systems of Uganda, Tanzania, Ghana, and Rwanda. The scraping pipeline, the gap calculation methodology, and the scorecard architecture are designed to be portable. The Nairobi pilot is simultaneously a proof of model for Kenya and a template for East Africa.

The moment for this work is now. The global retreat of democratic norms — and the emboldening effect it is having on already-compromised governments across the continent — makes infrastructure that enforces accountability from the citizen side more urgent, not less. Chanuka is designed for the democratic reality of 2026, not the democratic aspiration of 1990.

I would welcome the opportunity to discuss whether Chanuka fits within Skoll's current investment priorities.

[Your name]
[Your contact]

---

## 12 · KENYA HUMAN RIGHTS COMMISSION (KHRC) — PROGRAMME ENGAGEMENT

**Context.** KHRC has a broad mandate but is active on legislative accountability. The approach here is about legislative rights — the right to know what your government is doing in your name, and the right to vote with accurate information. Frame around rights, not technology.

**Framing:** Legislative rights and civic accountability. You are a rights practitioner who builds technology, not a technologist who cares about rights.

---

### Approach Letter

Subject: Legislative accountability infrastructure — a conversation

Dear Kenya Human Rights Commission,

I am writing because I believe there is work I could contribute to KHRC's legislative accountability programme, and because I would value the chance to understand where your current priorities sit.

I am the founder of Chanuka, a parliamentary accountability platform for Kenya currently preparing for a Nairobi pilot. The platform treats the accessibility of parliamentary voting records as a rights question: citizens have a right to know how their representatives vote on legislation that governs their lives, and Kenya's current information architecture systematically denies that right to citizens without specialist knowledge or reliable internet access.

The platform addresses this in three ways: by translating bills into plain language, by extracting per-MP voting records from Hansard PDFs and making them accessible at the constituency level, and by calculating a representative gap score that expresses the misalignment between MP voting behaviour and constituent interests in a form that is usable by community organisers and rights practitioners — not just researchers.

I am aware that KHRC's work spans a wider mandate than parliamentary transparency. I am not approaching this as someone with a product to sell. I am approaching it as someone who has built technical infrastructure relevant to legislative accountability and who is looking for a programmatic home — whether that is a part-time research role, a consultancy engagement, or a more informal working relationship — while the platform's pilot develops.

I would welcome a conversation about whether and how my work intersects with yours.

[Your name]
[Your contact]

---

## COVER NOTE — WHAT TO ATTACH WITH EACH APPLICATION

For every application above, attach the following in this order:

**1. The founder brief** (`06-chanuka-founder-brief.md` converted to PDF or the `.docx` version). This is your primary credential document. It goes with every application.

**2. A one-paragraph biography** (write this once, use everywhere):
> *[Your name] is the founder of Chanuka, a parliamentary accountability platform for Kenya. Working independently since [year], [he/she/they] has designed and built the platform's full technical infrastructure — including a parliamentary data scraping pipeline, MP accountability scorecard system, and USSD interface for non-smartphone users — in preparation for a Nairobi constituency pilot. [Your name]'s work sits at the intersection of civic technology, democratic accountability, and data infrastructure design.*

**3. The GitHub repository link** — not the README, just the link. Let them go as deep as they want.

**Do not attach** the technical audit documents, the project management plan, or the scraping strategy. Those are internal documents. If asked for technical depth, they exist and can be shared — but leading with them is the wrong signal for every audience on this list except Code for Africa.

---

*Applications compiled: March 2026 · Chanuka*
