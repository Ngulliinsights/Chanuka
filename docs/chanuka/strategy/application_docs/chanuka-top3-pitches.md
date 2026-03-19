# Chanuka: Expanded Pitches & Submission Strategies
## Top 3 Opportunities — Full Application Packages

---

# OPPORTUNITY 1: SHUTTLEWORTH FOUNDATION FELLOWSHIP

## Overview
- **Award:** €100,000 + matched funding on personal spend up to €100K = up to €200K year one
- **Duration:** 1 year, renewable for up to 3 years
- **Deadline:** Rolling — three cohorts per year (March, July, November)
- **Apply at:** shuttleworthfoundation.org/fellows/apply
- **Competition:** ~3 fellows selected per cohort from hundreds of applications

---

## What the Shuttleworth Foundation Actually Funds

Shuttleworth does not fund organisations. It does not fund projects. It funds **people with an idea for social change** who are building in the open — open-source, open-knowledge, open-process. Their one-page description of what they look for is essentially this: someone who has already started, believes radical openness is the mechanism for change (not just a compliance requirement), and can articulate *why* their specific approach shifts systemic power.

The fellowship committee has seen every permutation of "civic tech for democracy." What they have not seen is the specific argument Chanuka makes: that parliamentary data is a power resource that currently flows exclusively to institutional insiders, and that open-source accountability infrastructure is the redistribution mechanism. That argument, made precisely, is the application.

The video matters as much as the written application. More than most fellowships, Shuttleworth is selecting for the quality of thinking and the clarity of conviction visible in the person. Watch the "Flash Grant" recipient videos on their website before recording yours.

---

## The Application: Question by Question

### Question 1: What are you going to do with the fellowship?
*Word limit: 500 words. This is your core pitch. Be specific to the point of granularity.*

---

Kenya's parliament is formally transparent and functionally opaque. Voting records exist. Bills are published. Hansards are produced. None of this is accessible in a form that allows a citizen in Kibra to know how their MP voted on the Finance Bill, understand what that vote means for their household costs, and carry that knowledge into the 2027 election. The data is public in a technical sense. It functions as private.

Chanuka is the open-source engine that changes that. The platform ingests parliamentary data through an automated scraping pipeline, processes legislation through a plain-language translation model, and generates constituency-level MP accountability scorecards — a quantified measure of the gap between how representatives vote and what their constituents want. The pipeline is operational. The Nairobi pilot covers 17 constituencies and 4.3 million constituents.

The Shuttleworth Fellowship would fund three components that convert an operational platform into a complete accountability loop:

**Constitutional violation detection.** An NLP layer trained on Kenya's constitution that flags when bills contain provisions that conflict with constitutional rights — surfacing those flags for citizens in plain language before legislation passes. This is the "trojan bill" problem: provisions that materially affect citizens' lives buried in complex omnibus legislation that no one reads. The Finance Bill 2023 protests in Kenya were driven precisely by provisions most citizens did not know existed until civil society decoded them. Chanuka automates that decoding.

**Electoral consequence layer.** Accountability scorecards integrated with constituency-level electoral data so that citizens approaching the 2027 ballot have a voting record — not a campaign promise — as their primary reference. This is the component that converts transparency into consequence. Information without electoral weight is still just information.

**USSD access layer.** A complete feature-phone interface that makes the platform functional for Kenyans without smartphones. This is not a technical feature. It is a values commitment: a parliamentary accountability platform that requires a smartphone correctly answers the question "who is this for?" with the wrong answer. Reaching citizens in rural constituencies — where accountability deficits are most acute — requires operating on the infrastructure that actually exists there.

All three components will be developed in the open — full codebase, methodology documentation, and adaptation guides published for civic technologists in Uganda, Tanzania, Ghana, and any parliamentary democracy where the same data-inaccessibility problem exists. Nairobi is the proof of concept. Open publication is the replication strategy.

---

### Question 2: What do you want to change and why?
*Word limit: 500 words. This is your theory of change. Connect Chanuka to the systemic problem.*

---

The democratic recession visible across the Global South is not a philosophy problem. People in Kenya, in Nigeria, in Ghana, still want self-determination. What has failed is the accountability mechanism — the feedback loop that should make representative behaviour consequential but does not function. Elections happen. Representatives serve their interests rather than their constituents' interests. Citizens know this, abstractly, and have no instrument for converting that knowledge into consequence.

This is a design failure, not a values failure. Democratic systems were built on an assumption that accountability would emerge from the combination of elected representatives and an informed public. What was never built is the infrastructure between those two elements: the system that quantifies representative behaviour, measures it against constituent interest, and makes the gap visible at the moment it matters — the electoral campaign, not two years after the fact.

The result is the pattern that has defined Kenyan politics across multiple election cycles: campaigns fought on personality and ethnic loyalty rather than legislative record, because the legislative record is inaccessible to the people who need it. MPs who vote consistently against their constituencies' interests face no systematic electoral consequence because the link between vote and consequence has never been made legible.

What I want to change is that legibility. Not the hearts of politicians — structural incentives change behaviour more reliably than moral appeals. When MPs know that every vote is being tracked, scored against constituent sentiment, and will appear on a shareable accountability scorecard at campaign time, the calculus changes. The cost of voting against constituents' interests rises. That rise, multiplied across hundreds of constituencies and sustained across election cycles, is what functional democratic accountability looks like.

Chanuka is the instrument for that change. It does not ask citizens to trust institutions. It gives them the data to evaluate those institutions themselves. It does not ask MPs to be better people. It creates structural conditions in which being a worse representative carries a higher electoral cost.

The open-source architecture is not incidental to this theory of change. It is central to it. A proprietary accountability platform controlled by a single organisation can be pressured, defunded, or shut down. An open-source methodology that has been replicated across multiple countries by multiple civic technologists cannot. The goal is not to build a platform. It is to establish a replicable standard for parliamentary accountability infrastructure — one that exists independently of any single organisation, government, or funder.

---

### Question 3: What do you believe that others do not?
*Word limit: 250 words. This is the Shuttleworth question that separates the applications. They want your genuine conviction, not your best-sounding answer.*

---

I believe that transparency tools have been the wrong investment. For a decade, the civic technology community has built portals, dashboards, and information platforms — all premised on the assumption that if citizens had access to better information, accountability would follow. It has not. The information gap was never the binding constraint.

The binding constraint is consequence. Citizens can know, abstractly, that their representative voted against their interests. Without a system that quantifies that misalignment, tracks it over time, and makes it visible and shareable at the moment of electoral decision, the knowledge produces no behavioural change — in citizens or in representatives.

The civic tech community does not believe this yet. Most of it is still building better transparency. Chanuka is built on the conviction that transparency without consequence is simply better-documented impunity. The investment should be in closing the loop — connecting legislative behaviour to electoral outcome — not in making the existing broken loop more visible.

The second thing I believe is that open-source replication is the only accountability infrastructure that survives changes in political weather. Proprietary platforms get shut down. Government-funded portals get defunded when governments change. An open methodology that has been independently deployed in twelve countries is a different kind of thing entirely. Permanence comes from distribution, not from any single institution's commitment to keeping the lights on.

---

### Question 4: Describe your relationship with openness.

---

Chanuka was built in the open from the start — not because openness was a funding requirement, but because the problem I am solving requires it. A parliamentary accountability platform that is itself opaque would be a contradiction in terms.

The codebase is fully open-source. The scraping methodology is documented for adaptation. The plain-language translation model will be published with training data so civic technologists in other parliamentary contexts can fine-tune it for their legislative language. The accountability scoring methodology will be released as a specification — a standard that any implementation in any country can be evaluated against.

But my relationship with openness extends beyond the technical. The platform's data is a public resource, and I have designed every aspect of the infrastructure around the principle that public data should function as a public resource — not monetised, not gated, not controlled by any single actor including me. The goal is to make myself unnecessary: to build methodology and tooling that communities can own and maintain independently. That requires genuine openness at the architectural level, not just the licensing level.

---

## Submission Strategy

### Timeline
- **Month 1:** Complete the written application. Record the video — minimum three takes, ideally with one person who will tell you honestly what lands and what does not.
- **Month 2:** Identify a current or former Shuttleworth Fellow in your network or adjacent network and request a 20-minute conversation. Not to get a referral — they do not use a referral system — but to pressure-test your framing against someone who has been through the process.
- **Submit in the November cohort window** if you want the maximum preparation time, or July if the Nairobi pilot has produced early data you can reference.

### The Video (3 minutes — the most important part)
- First 30 seconds: State the problem in one concrete, specific sentence that makes the stakes visceral. Not "Kenya faces democratic challenges." Something like: "A citizen in Mathare has no way to know how their MP voted on the Finance Bill that raised their cost of living by 20% last year — and the MP is running for re-election on the promise that they fought for their constituents."
- Minutes 1–2: The mechanism. How Chanuka closes the gap between the data that exists and the accountability that does not. Specific, not general.
- Final minute: Why you, why now, why open. This is the conviction section. Do not perform passion — demonstrate it through the specificity of what you know and how you think.

### What to Avoid
- Do not describe the platform as "a platform." Describe it as an accountability mechanism. The distinction tells them you understand what you're building.
- Do not cite other civic technology platforms as comparators. Shuttleworth is not interested in "we're like TheyWorkForYou but for Kenya." They are interested in the genuine insight that drove you to build this specific thing.
- Do not use the word "empower." It has been emptied of meaning in this space.

---

---

# OPPORTUNITY 2: NATIONAL ENDOWMENT FOR DEMOCRACY (NED)
## Kenya Civil Society Grant — Democratic Governance Track

## Overview
- **Award:** Typically $50,000–$150,000 per grant year, renewable
- **Duration:** 12–24 months
- **Deadline:** Rolling, with regional review cycles. East Africa programme reviewed quarterly.
- **Apply at:** ned.org/apply-for-a-grant
- **Contact:** Africa programme officers — reach out before submitting

---

## What NED Actually Funds in Kenya

NED operates two relevant tracks for Chanuka: the **National Democratic Institute (NDI) sub-grant channel** (slower, more institutionalised) and the **direct civil society grant** (faster, appropriate for independent organisations and early-stage platforms). The direct track is the right entry point.

NED's Kenya portfolio currently includes parliamentary monitoring, civil society strengthening, voter education, and media freedom. The gap in their portfolio — which Chanuka fills — is the **accountability loop**: the mechanism that converts parliamentary monitoring data into electoral consequence. NED funds the monitoring. No current grantee closes the loop to electoral consequence. That gap is the application.

NED's programme officers are the most important relationship in this process. They review hundreds of applications and make initial recommendations to the Washington committee. A pre-submission call with the Africa programme officer is not optional — it is how you learn the current portfolio priorities, identify the specific gap your application should address, and ensure your framing matches the committee's current concerns. Chanuka's 2027 election cycle timing is highly relevant to NED's current East Africa priorities.

---

## Full Grant Application

### Executive Summary (1 page)

**Organisation:** Chanuka — Parliamentary Accountability Infrastructure for Kenya
**Project Title:** Closing the Accountability Loop: Constituency-Level MP Scorecards for Kenya's 2027 Election Cycle
**Grant Period:** 18 months
**Requested Amount:** $120,000
**Project Location:** Nairobi, Kenya (17 constituencies pilot, National Assembly-wide data)

Kenya's democratic accountability infrastructure has a structural gap that no current tool addresses: the mechanism that converts parliamentary monitoring data into electoral consequence. Voting records exist. MP behaviour data is technically public. Citizens have no system that translates that data into usable accountability information — by constituency, in plain language, tied to electoral records — before the moment they vote.

Chanuka closes that gap. The platform is an open-source parliamentary accountability engine with operational data infrastructure: a parliamentary scraping pipeline, a plain-language bill translation engine, and a constituency-level MP accountability scoring methodology in final development. This grant funds the Nairobi pilot — 17 constituencies, 4.3 million constituents — and the distribution strategy that ensures accountability scorecards reach voters before the 2027 election cycle.

---

### Problem Statement (2 pages)

Kenya's 13th Parliament operates with formal transparency that produces no functional accountability. The mechanisms exist on paper:

- Bills are published in the Kenya Gazette
- Hansard records document floor debate
- Voting records are technically available through parliamentary systems
- MP profiles are listed on the National Assembly website

What does not exist is the infrastructure that converts this formal transparency into citizen-accessible accountability information. A constituent in Westlands cannot, without significant technical and legal expertise, determine how their MP voted on the Finance Bill, whether that vote aligned with their constituency's interests, or how their MP's voting record compares to their campaign promises.

This gap is not accidental. The architecture of access — the systems that would make legislative data usable by ordinary citizens — was never built. The result is democratic form without democratic function: procedures performed, accountability absent.

**The Consequence in Practice**

Kenya's Finance Bill 2023 protests demonstrated both the civic energy that exists and the structural failure that wastes it. Millions of citizens — primarily young, primarily urban, primarily digitally connected — mobilised against legislation whose specific provisions most of them learned about through social media interpretation rather than primary source access. The movement was powerful. It was reactive. It was operating without the institutional knowledge that would have made it surgical: the ability to identify which MPs voted for which provisions, hold them specifically accountable, and build toward 2027 with a documented record rather than general grievance.

That is what Chanuka provides. Not a substitute for civic energy but the instrument that makes civic energy consequential.

**The Electoral Window**

Kenya's 2027 election cycle creates a specific and time-limited opportunity. Accountability infrastructure embedded in civil society consciousness before an election produces different outcomes than infrastructure built after. Citizens who have used an accountability tool to evaluate their MP's record during the parliamentary cycle approach the ballot with a different quality of information than those who have not. The 18-month grant period covers the critical pre-election phase. The work done in this period is the work that matters.

**The Existing Tool Gap**

Mzalendo Trust has done admirable work addressing the information gap — providing legislative tracking and MP profiles that significantly improved on the previous void. What Mzalendo does not provide, by design, is the accountability gap solution. There is a critical distinction between:

- **Information access:** What happened in Parliament? (Mzalendo addresses this)
- **Accountability infrastructure:** What are the consequences of what happened? (Chanuka addresses this)

The distinction is the difference between a library and an enforcement mechanism. Kenya's democracy needs both. The information layer exists. The accountability layer does not.

---

### Project Description (3 pages)

**Objective 1: Complete the Accountability Scoring Engine**

Chanuka's MP accountability scorecard measures a single, specific thing: the gap between how an MP votes and what their constituency wants. The scoring methodology compares verified voting records against constituency-level sentiment data — gathered through structured USSD surveys, civil society partner networks, and validated public opinion data — and expresses the result as a score that is comparable, shareable, and impossible to dismiss as editorial judgment.

This objective funds completion of the scoring engine, validation of the methodology with a civic society advisory group, and testing with the initial Nairobi constituency set.

*Deliverable: Operational accountability scorecards for all 17 Nairobi MPs, validated and ready for public release.*

**Objective 2: Constitutional Violation and Hidden Provision Detection**

The Finance Bill 2023 contained provisions that most MPs who voted for it had not read in full. This is not an anomaly. Omnibus legislation routinely embeds provisions that materially affect citizens' lives without those provisions receiving separate scrutiny. Chanuka's constitutional violation detection layer uses NLP-based analysis to flag provisions that conflict with Kenya's constitution, that represent significant policy changes buried in broader bills, or that have been identified by legal civil society partners as warranting special public attention.

This objective funds development and testing of the detection layer, with legal review partnership from constitutional law civil society organisations.

*Deliverable: Automated constitutional flagging operational for all National Assembly bills, with plain-language citizen alerts for flagged provisions.*

**Objective 3: USSD Access Layer**

Kenya's digital divide is a democratic divide. A parliamentary accountability platform that requires a smartphone reaches approximately 40% of Kenya's adult population. The USSD layer extends Chanuka's core functionality — voting record lookup, bill plain-language summary, MP accountability score — to any mobile device on Kenya's network, regardless of data connectivity or smartphone access.

This objective funds USSD interface development, carrier partnership negotiation, and pilot testing in constituencies with below-median smartphone penetration.

*Deliverable: Fully operational USSD interface live before the 2026 mid-pilot evaluation.*

**Objective 4: Civil Society Distribution and 2027 Pre-Election Campaign**

Accountability infrastructure only produces consequence if it reaches citizens at decision-relevant moments. Distribution through civil society partner networks — church associations, market trader organisations, community WhatsApp channels, university civic societies — is the strategy for reaching citizens outside formal civic engagement channels.

This objective funds civil society partnership development, distribution materials (including offline constituency-level accountability reports), and a coordinated pre-2027 election voter education campaign built around MP accountability data.

*Deliverable: Accountability scorecards distributed to minimum 500,000 constituents across 17 Nairobi constituencies before the 2027 campaign period opens.*

---

### Monitoring and Evaluation Framework

| Metric | Baseline | 6 Month Target | 18 Month Target |
|---|---|---|---|
| MPs with complete voting record profiles | 0 of 290 | 17 (Nairobi) | 290 (National Assembly) |
| Citizens with constituency scorecard access | 0 | 100,000 | 500,000 |
| Return visit rate (accountability reference use) | N/A | 15% | 35% |
| Civil society organisations using data | 0 | 8 | 25 |
| Media accountability stories citing Chanuka data | 0 | 5 | 20 |

**The primary evaluation question** is not platform usage. It is whether citizens who use Chanuka approach their electoral decisions with documented MP behaviour data rather than campaign promises alone. Longitudinal tracking of a sample of registered voters across the pilot constituencies — comparing their awareness of their MP's voting record before and after exposure to Chanuka — is the evidence base for demonstrating democratic consequence.

---

### Organisational Capacity Statement

Chanuka's development infrastructure demonstrates the technical capacity to execute this grant without institutional overhead that dilutes the programme funding. The parliamentary scraping pipeline, plain-language translation engine, and data architecture are operational and documented. The founder's background combines civic technology development, doctoral research in political psychology and democratic engagement, and direct experience with Kenya's civil society and parliamentary access landscape.

The grant will fund one additional technical developer, one civil society partnership coordinator, and one communications officer — a lean structure appropriate to an 18-month pilot with defined deliverables.

---

### Budget Summary

| Line Item | Amount | % of Total |
|---|---|---|
| Technical Development (scoring engine, constitutional detection, USSD) | $52,000 | 43% |
| Personnel (developer, partnerships coordinator, comms) | $38,000 | 32% |
| Civil Society Distribution Campaign | $18,000 | 15% |
| Evaluation and Documentation | $8,000 | 7% |
| Indirect Costs | $4,000 | 3% |
| **Total** | **$120,000** | **100%** |

---

## Submission Strategy

### Before You Submit: The Programme Officer Conversation

NED's East Africa programme officer is the most important relationship in this process. Email before submitting. The subject line should be direct: *"Pre-submission inquiry — parliamentary accountability platform, Kenya 2027 cycle."* The email should be three paragraphs: what Chanuka is, why the 2027 timing is the frame, and a specific question about current portfolio priorities in Kenya's democratic governance space.

This call has two functions. First, you learn what the committee is currently prioritising and can frame accordingly. Second, the programme officer who reviews your application already has context — you are not a cold submission.

### Letters of Support
NED's committee weights civil society endorsement heavily for Kenya programmes. Identify three organisations before submitting:
- One parliamentary monitoring organisation (Mzalendo is the obvious choice — position Chanuka as complementary, not competitive)
- One human rights or constitutional law organisation
- One grassroots civic mobilisation organisation with 2027 election programme

Letters should be specific: not "we support Chanuka's work" but "we will use Chanuka's accountability data in [specific programme activity] during [specific timeframe]."

### Timing
Submit in a Q2 or Q3 review cycle — the committee prioritises election-cycle-relevant applications in the 18 months before a scheduled election. Kenya's 2027 cycle makes Q2 2026 or Q3 2026 the optimal submission windows.

---

---

# OPPORTUNITY 3: CODE FOR AFRICA
## Embedded Civic Technology Role / Chanuka Integration Partnership

## Overview
- **Structure:** Employment or embedded fellowship, with formal Chanuka development support
- **Location:** Nairobi (CfA has a Kenya office) with continental team access
- **Compensation:** Competitive NGO/civic tech salary (typically $2,500–$4,000/month for senior technical roles in Nairobi)
- **Apply at:** codeforafrica.org/careers — and via direct approach (see strategy below)
- **Decision-maker:** Justin Arenstein (founder/CEO) and the Kenya country director

---

## What Code for Africa Actually Is

Code for Africa is the continent's largest civic technology organisation — not a funder but a builder. They run the iLAB network (investigative data journalism labs embedded in newsrooms across Africa), the openAFRICA data portal (the continent's largest open data repository), the sensors.AFRICA environmental monitoring network, and a growing portfolio of parliamentary and government accountability tools.

Their Kenya operation is one of their most active, with partnerships across major newsrooms and civil society organisations. They are not looking for employees who will execute defined briefs. Their most valuable hires are people who bring an operational platform or methodology that extends their existing work — who are building something that CfA's infrastructure accelerates.

The application here is not a job application in the conventional sense. It is a partnership proposal dressed as a job application. The goal is to present Chanuka as something that is worth CfA's institutional investment — their data infrastructure, their civil society networks, their newsroom partnerships — in exchange for your technical capability and the platform's accountability data becoming part of their public offering.

---

## The Application: Direct Approach Letter

*This replaces a standard cover letter. It should be sent directly to the Kenya country director and CC'd to Justin Arenstein, not submitted through a generic careers portal.*

---

**Subject: Chanuka — Parliamentary Accountability Engine Seeking CfA Integration Partnership**

I am the independent founder of Chanuka, Kenya's first parliamentary accountability platform — an open-source engine that converts National Assembly voting records into constituency-level MP accountability scorecards. I am writing to propose an embedded partnership arrangement that I believe compounds both Chanuka's development and Code for Africa's Kenya programme.

**What exists:** Chanuka's parliamentary data pipeline is operational. The platform ingests National Assembly records through an automated scraping infrastructure, processes legislation through a plain-language translation engine, and generates MP accountability scores measuring the gap between voting behaviour and constituent sentiment. The Nairobi pilot — 17 constituencies, 4.3 million constituents — is the first real-world test of whether the accountability loop produces measurable civic consequence.

**What the partnership looks like:** I am seeking an embedded role within CfA Kenya — contributing technical civic technology capability to your programme work — in exchange for formal institutional support for Chanuka's development. Specifically:

- Access to CfA's openAFRICA data infrastructure for Chanuka's parliamentary dataset (making it a public resource, not a platform-proprietary one)
- Integration of Chanuka's accountability data into CfA's iLAB newsroom partnerships, creating a primary source data layer for parliamentary accountability reporting
- CfA institutional credibility and civil society network access for the Nairobi pilot distribution strategy
- Technical resource access for USSD layer development

**What CfA gains:** An operational parliamentary accountability platform that extends your existing Kenya accountability journalism work into the electoral consequence layer — the tool that converts your newsroom partners' investigative reporting into voter-accessible scorecards. Chanuka's data is designed to be the primary source infrastructure that iLAB journalists use; the newsroom integration is built into the platform architecture, not added as an afterthought.

The arrangement I am proposing is not employment in the conventional sense. It is the kind of compound partnership that has produced CfA's best institutional developments — where a founder with an operational platform finds the organisational infrastructure that accelerates it, and where the organisation gains a tool that extends its impact beyond what its current team is building.

I would like to propose a 45-minute conversation with you and whichever technical team members are appropriate. I can demonstrate the platform's current operational state and walk through the specific integration points where Chanuka's data maps onto CfA Kenya's existing programme portfolio.

---

## The Follow-Up Deck (for the conversation)

Prepare a 6-slide deck — not a pitch for Chanuka in general, but a specific proposal for the CfA integration:

**Slide 1 — The Gap in CfA Kenya's Current Portfolio**
Map what CfA currently does in Kenya against the accountability loop framework. Show specifically where their work stops (investigative data, newsroom tools) and where Chanuka begins (electoral consequence infrastructure). The message: Chanuka is not competing with anything CfA builds. It is the downstream component their current tools do not reach.

**Slide 2 — What is Operational Today**
Screenshots and live demonstration of the scraping pipeline, voting record tracker, and bill translation engine. Be specific about what is working and what is in development. Do not oversell. CfA's technical team will immediately identify any gap between claim and reality.

**Slide 3 — The Data Integration Architecture**
Specifically how Chanuka's parliamentary dataset integrates with openAFRICA's data portal. Show the data schema. Demonstrate that you have thought through the technical integration, not just the strategic rationale for it.

**Slide 4 — The Newsroom Integration Proposal**
How accountability scorecard data becomes a primary source layer for CfA's iLAB newsroom partners. Specific publications. Specific story formats. The proposition is that Chanuka's data makes MP accountability reporting systematic rather than episodic — every election cycle, every constituency, not just when a journalist has time to investigate a specific MP.

**Slide 5 — The 2027 Election Cycle Timeline**
The specific deliverables, by month, between now and Kenya's 2027 election. What CfA's institutional support enables. What the pilot produces. What the data shows.

**Slide 6 — The Arrangement**
A clear statement of what you are seeking (embedded role, institutional support for Chanuka, specific resource access) and what CfA gains (operational platform, data infrastructure, technical capability). Be direct about the compound return framing. CfA's leadership responds to partners who understand the mutual value proposition.

---

## Submission Strategy

### The Approach Sequence

**Week 1:** Research CfA Kenya's current programme portfolio in detail. Identify every existing tool, dataset, and civil society partnership. Map Chanuka against each one — where there is overlap, where there is a gap, where there is a direct integration opportunity. Do not approach until you can speak specifically about CfA's work, not just your own.

**Week 2:** Identify one person in your network with a direct CfA relationship — a journalist they have worked with, a civil society partner, a data community member. A warm introduction to the Kenya country director is worth significantly more than a cold email, even a well-written one.

**Week 3:** Send the direct approach letter. Follow up in ten days if no response. The subject line matters: it should reference Chanuka as an asset, not a request. *"Chanuka parliamentary data — integration partnership proposal"* is stronger than *"Civic technology role inquiry."*

**Week 4:** If a conversation is scheduled, prepare the 6-slide deck and request a live demonstration slot — not a slide presentation but a screen-share of the operational platform. Real, working tools close these conversations faster than any deck.

### What to Avoid

Do not apply through the generic CfA careers portal for this arrangement. A standard job application positions you as a candidate competing for a defined role. The partnership framing positions you as a founder bringing an asset. These are evaluated by different people using different criteria. The direct approach is the only correct path for this specific opportunity.

Do not lead with compensation expectations. The arrangement needs to be defined before the compensation conversation. Raising it too early converts a partnership conversation into a hiring negotiation, which is the wrong frame.

Do not present Chanuka as a finished product. CfA's team are builders. They respect intellectual honesty about what is operational and what is in development. Overselling the platform's current state will damage your credibility with exactly the people whose technical respect you need.

### The Relationship Beyond the Role

Even if the initial conversation does not produce an embedded role, the Code for Africa relationship is worth maintaining as a formal partnership — CfA hosting Chanuka's dataset on openAFRICA, CfA's newsroom partners using the accountability data as a primary source, CfA providing an institutional letter of support for the NED grant application. These partial outcomes are valuable and should be sought explicitly if the full embedded arrangement is not immediately possible.

---

---

# MASTER SUBMISSION CALENDAR

| Action | Deadline | Priority |
|---|---|---|
| Research CfA Kenya portfolio; identify warm introduction | Week 1 | URGENT |
| Contact NED Africa programme officer (pre-submission call) | Week 2 | URGENT |
| Send CfA direct approach letter | Week 3 | HIGH |
| Secure 3 civil society letters of support for NED application | Weeks 3–5 | HIGH |
| Record Shuttleworth video — first draft | Week 4 | HIGH |
| CfA follow-up conversation + deck presentation | Week 4–5 | HIGH |
| NED application complete draft | Week 5 | HIGH |
| Shuttleworth written application complete | Week 6 | HIGH |
| NED application final review + submit (Q2 cycle) | Week 7 | HIGH |
| Shuttleworth peer review of application (fellow contact) | Week 7 | MEDIUM |
| Shuttleworth submission (July cohort) | Week 8 | HIGH |

**The sequencing logic:** CfA first — because a confirmed CfA partnership strengthens both the NED application (institutional home) and the Shuttleworth application (operational context). NED second — because grant confirmation strengthens the Shuttleworth case and provides the budget for the pilot that Shuttleworth funds the extension of. Shuttleworth last in sequence, highest in strategic value.

---

*Chanuka · March 2026 · Nairobi*
