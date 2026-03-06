# Chanuka Platform — Glossary

**Last Updated:** March 6, 2026  
**Purpose:** Define key terms used across the Chanuka platform

## Platform Terms

### Chanuka
The Kenyan civic engagement platform for legislative intelligence. Named after the Festival of Lights, symbolizing transparency and enlightenment in governance.

### Legislative Intelligence
The systematic collection, analysis, and presentation of legislative data to enable informed civic participation. Combines bill tracking, constitutional analysis, and community engagement.

### Civic Engagement
Active participation of citizens in the legislative process through commenting, voting, advocacy, and holding representatives accountable.

## Legislative Terms

### Bill
A proposed law presented to the Kenyan Parliament for consideration. Bills go through multiple stages (introduction, committee review, floor debate, voting) before becoming law.

**Lifecycle stages:**
- **Draft** — Bill being prepared
- **Introduced** — Formally presented to Parliament
- **Committee** — Under committee review
- **Floor** — Debated in full Parliament
- **Passed** — Approved by Parliament
- **Assented** — Signed into law by President
- **Rejected** — Failed to pass

### Sponsor
A Member of Parliament (MP) who introduces or supports a bill. The primary sponsor is the MP who introduces the bill; co-sponsors are MPs who formally support it.

### Amendment
A proposed change to a bill during the legislative process. Amendments can be introduced in committee or during floor debate.

### Constituency
A geographic electoral district represented by one MP in the National Assembly. Kenya has 290 constituencies.

### MP (Member of Parliament)
An elected representative in the Kenyan Parliament. MPs serve in either the National Assembly (290 elected + 47 women reps) or the Senate (47 elected + 16 women reps).

### Committee
A group of MPs assigned to review bills in specific policy areas (e.g., Health Committee, Finance Committee). Committees conduct detailed analysis and public hearings.

### Vote
A formal decision by MPs on a bill or amendment. Votes can be:
- **Yes** (Aye) — Support the bill
- **No** (Nay) — Oppose the bill
- **Abstain** — Neither support nor oppose

## Feature Terms

### Argument Intelligence
AI-powered analysis of arguments in bill comments. Identifies claims, evidence, logical structure, and potential fallacies to surface high-quality reasoning.

**Components:**
- **Claim extraction** — Identifying assertions made
- **Evidence linking** — Connecting claims to supporting data
- **Fallacy detection** — Identifying logical errors
- **Argument strength** — Scoring argument quality

### Constitutional Analysis
Automated analysis of bills against the Kenyan Constitution. Identifies potential constitutional conflicts, relevant provisions, and precedents.

**Components:**
- **Provision matching** — Finding relevant constitutional articles
- **Conflict detection** — Identifying potential violations
- **Precedent matching** — Linking to similar cases
- **Expert verification** — Human review of AI analysis

### Electoral Accountability
Tracking MP performance against campaign promises and constituent expectations. Enables citizens to hold representatives accountable.

**Components:**
- **Promise tracking** — Recording campaign commitments
- **Voting record** — Tracking MP votes on bills
- **Gap analysis** — Comparing promises to actions
- **Performance metrics** — Quantifying MP effectiveness

### Weighted Representation
Analysis of how well Parliament represents diverse citizen interests, accounting for population distribution, minority voices, and coalition dynamics.

### Government Data
Official data from Kenyan government sources including Parliament records, Kenya Gazette, county governments, and regulatory bodies.

## Technical Terms

### Feature Module
A self-contained unit of functionality following Domain-Driven Design (DDD) principles. Each feature has its own domain logic, data access, and API endpoints.

### Domain-Driven Design (DDD)
An architectural approach organizing code around business domains rather than technical layers. Separates domain logic, application services, and infrastructure.

**Layers:**
- **Domain** — Business logic and rules
- **Application** — Use cases and orchestration
- **Infrastructure** — Data access and external services
- **Presentation** — HTTP/API layer

### Repository Pattern
A data access pattern that abstracts database operations behind interfaces. Allows swapping database implementations without changing business logic.

### Feature Flag
A configuration toggle that enables/disables features without code changes. Used for gradual rollouts, A/B testing, and emergency shutdowns.

### Monorepo
A single repository containing multiple related packages (client, server, shared). Enables atomic commits across packages and simplified dependency management.

## User Terms

### Citizen User
A registered user representing themselves as an individual citizen. Can comment, vote, and engage with bills.

### Expert User
A verified user with recognized expertise in a specific domain (law, healthcare, economics, etc.). Expert comments are highlighted and weighted more heavily.

**Verification requirements:**
- Professional credentials
- Domain expertise demonstration
- Background verification

### Moderator
A trusted user with permissions to highlight comments, flag spam, and manage community standards. Does not have admin access.

### Admin
A platform administrator with full access to all features, user management, and system configuration.

## Data Terms

### Engagement
Any user interaction with platform content. Tracked for analytics and personalization.

**Types:**
- **View** — Viewing a bill or comment
- **Comment** — Adding a comment
- **Vote** — Voting on a comment
- **Share** — Sharing a bill
- **Follow** — Following a bill for updates

### Verification
The process of confirming a user's identity or expertise. Two types:
- **Citizen verification** — Confirming Kenyan citizenship
- **Expert verification** — Confirming professional expertise

### Notification
A message sent to users about platform activity. Delivered via:
- **In-app** — Notification center in UI
- **Email** — Email notifications
- **Push** — Mobile push notifications (future)
- **SMS** — Text message notifications (future)

## Status Terms

### Code Health
A measure of engineering quality including type safety, test coverage, architecture quality, and maintainability. See [STATUS_VOCABULARY.md](../STATUS_VOCABULARY.md).

### Feature Completeness
A measure of whether a feature delivers on its promise to end users. Includes core functionality, edge cases, and user experience. See [STATUS_VOCABULARY.md](../STATUS_VOCABULARY.md).

### Launch Readiness
A measure of whether the platform is ready to serve the public. Includes security, accessibility, performance, and legal compliance. See [STATUS_VOCABULARY.md](../STATUS_VOCABULARY.md).

### Production-Grade
Code that meets production quality standards (type safety, tests, security) but may be part of a pre-launch platform. Refers to code health, not launch status.

## Kenyan Context Terms

### Kenya Gazette
The official publication of the Government of Kenya. Contains legal notices, appointments, and official announcements.

### County Government
One of 47 devolved government units in Kenya. Counties have their own assemblies and governors with specific devolved functions.

### Devolution
The transfer of powers and functions from the national government to county governments. Established by the 2010 Constitution.

### IEBC (Independent Electoral and Boundaries Commission)
The constitutional body responsible for conducting elections and referendums in Kenya.

### Kiswahili (Swahili)
One of Kenya's two official languages (alongside English). The platform supports both English and Kiswahili.

## Acronyms

### API
Application Programming Interface — How the client communicates with the server.

### DDD
Domain-Driven Design — Architectural approach organizing code by business domains.

### DCS
Distributed Civic System — The underlying architecture for Chanuka's distributed features.

### E2E
End-to-End — Testing that simulates real user workflows from start to finish.

### FSD
Feature-Sliced Design — An architectural methodology for organizing frontend code.

### JWT
JSON Web Token — Authentication token format used for user sessions.

### ML
Machine Learning — AI techniques used for argument intelligence and constitutional analysis.

### MP
Member of Parliament — Elected representative in the Kenyan Parliament.

### NLP
Natural Language Processing — AI techniques for analyzing text (bills, comments, etc.).

### ORM
Object-Relational Mapping — Library for database access (Drizzle ORM).

### RBAC
Role-Based Access Control — Authorization system based on user roles.

### REST
Representational State Transfer — API architectural style.

### WCAG
Web Content Accessibility Guidelines — Standards for accessible web content.

## Related Documentation

- [STATUS_VOCABULARY.md](../STATUS_VOCABULARY.md) — Status dimension definitions
- [CURRENT_CAPABILITIES.md](../../CURRENT_CAPABILITIES.md) — Feature status
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — System architecture
- [Kenyan Legal Reference](./kenyan-legal-framework.md) — Kenyan law context

## Contributing to This Glossary

When adding new terms:

1. **Choose the right category** — Platform, Legislative, Feature, Technical, User, Data, Status, Kenyan Context, or Acronyms
2. **Provide clear definition** — 1-2 sentences explaining the term
3. **Add context** — Why it matters, how it's used
4. **Link related terms** — Cross-reference related glossary entries
5. **Update index** — Add to [DOCUMENTATION_INDEX.md](../../DOCUMENTATION_INDEX.md)

---

**Questions?** Propose new terms or clarifications via PR.  
**Maintainer:** Documentation team
