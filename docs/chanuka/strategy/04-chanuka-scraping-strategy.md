# CHANUKA PLATFORM — WEB SCRAPING STRATEGY
*Kenyan Parliamentary Data Acquisition · March 2026*

> **Implementation**: See `server/features/government-data/services/parliament-scraper.service.ts` for the production implementation of this strategy.

---

## THE GROUND TRUTH ABOUT parliament.go.ke

Before writing a single scraper, understand what you're actually dealing with. The Kenyan parliament website is a Drupal CMS with inconsistent structure, JavaScript-rendered content on key pages, and a split architecture across multiple subdomains. Treating it as a single uniform target will waste weeks.

| Subdomain | Content | Access |
|---|---|---|
| `parliament.go.ke` | Bills, MP profiles, news, Hansard links | Public |
| `hansardna.parliament.go.ke` | National Assembly Hansard PDFs | **Partially restricted — plenary sessions public, committee sessions login-required** |
| `hansardsn.parliament.go.ke` | Senate Hansard PDFs | Public |

**The critical insight:** Voting records (divisions) are not in a structured database. They are embedded in Hansard PDF documents as tables. Your scraper is fundamentally a PDF parser that feeds off links gathered from HTML scraping. Design for this from day one.

---

## CORE SCRAPING CHALLENGES

### Challenge 1 — JavaScript-Rendered Pages
Several MP profile pages and the bills tracker use JavaScript to render content after page load. A simple `axios` + `cheerio` fetch will return an empty shell. These pages require Puppeteer or Playwright.

**Pages confirmed to need a headless browser:**
- `/the-national-assembly/mps` (MP listing with filters)
- `/the-national-assembly/house-business/bills` (paginated bill list)
- Bill detail pages with tabs (committee, readings, amendments)

**Pages that work with static HTTP fetch:**
- `/node/{id}` — individual Hansard report pages
- `/the-national-assembly/house-business/bills-tracker` (serves PDFs directly)
- Senate votes proceedings (`/the-senate/votes-proceeding`)

### Challenge 2 — Voting Data Lives in PDFs
Division (vote) results are recorded in Hansard PDFs as formatted tables. There is no API, no structured HTML, and no JSON endpoint. The pipeline is:

```
Hansard page (HTML) → extract PDF URL → download PDF → parse table → extract per-MP votes
```

This means your voting record accuracy depends entirely on the quality of your PDF parser. The Hansard PDFs use consistent formatting within sessions but formatting shifts between parliamentary sessions (11th → 12th → 13th Parliament). Handle each session's PDF format separately.

### Challenge 3 — Site Instability
parliament.go.ke goes down or returns 503s during high-traffic parliamentary events — exactly when you most need fresh data. Every scraper must implement exponential backoff, response caching, and stale-data tolerance. A failed scrape during a Finance Bill vote must not blank your accountability scorecards.

### Challenge 4 — URL Pattern Inconsistency
The site uses Drupal node IDs (`/node/22082`) for some content and semantic paths for others. Node IDs are not predictable. The only reliable discovery method is crawling the index/listing pages to collect URLs, then fetching each one individually.

### Challenge 5 — No robots.txt Enforcement but Respect It
parliament.go.ke has a `robots.txt`. Respect crawl delays. The platform's civic legitimacy depends on not being seen as adversarial to the institution it monitors. Use a 2–3 second delay between requests. Never scrape in parallel against the same domain.

---

## DATA SOURCE MAP

### Source 1 — MP Profiles
**URL pattern:** `parliament.go.ke/the-national-assembly/mps`
**Method:** Puppeteer (JavaScript-rendered)
**Yields:** Name, constituency, party, photo URL, profile page URL
**Frequency:** Scrape once on setup, then weekly (MPs rarely change mid-session)
**Nairobi filter:** 17 constituencies — see Appendix A

### Source 2 — Bills Index
**URL pattern:** `parliament.go.ke/the-national-assembly/house-business/bills`
**Method:** Puppeteer (paginated, JS-rendered)
**Yields:** Bill title, number, status, sponsor, first reading date, link to bill detail
**Frequency:** Daily during active sessions, weekly during recess

### Source 3 — Bill Detail Pages
**URL pattern:** `parliament.go.ke/node/{id}` (gathered from bills index)
**Method:** Static HTTP fetch + Cheerio
**Yields:** Full bill text, readings timeline, committee referrals, amendments
**Frequency:** On discovery of new bill, then on status change

### Source 4 — Bills Tracker (PDF)
**URL pattern:** `parliament.go.ke/the-national-assembly/house-business/bills-tracker`
**Method:** Static fetch → PDF download → PDF parse
**Yields:** Bill status table across all readings — useful as a cross-validation source
**Frequency:** Weekly

### Source 5 — Hansard Index (Voting Records)
**URL pattern:** `hansardna.parliament.go.ke` (DSpace repository)
**Method:** Static HTTP fetch + Cheerio
**Yields:** Links to individual Hansard PDF documents, sitting dates
**Frequency:** Daily — new Hansards are published the day after each sitting

### Source 6 — Hansard PDFs (Division Votes)
**Source:** URLs gathered from Source 5
**Method:** PDF download → `pdf-parse` → regex extraction of division tables
**Yields:** Per-MP votes (Aye/Noe/Abstain) tied to specific bill readings
**Frequency:** On each new Hansard PDF discovery
**Critical note:** Parse only, never modify. Store the raw PDF alongside the extracted data for audit purposes.

### Source 7 — Senate Votes Proceedings
**URL pattern:** `parliament.go.ke/the-senate/votes-proceeding`
**Method:** Static HTTP fetch + Cheerio → PDF parse
**Yields:** Senate division records
**Frequency:** Weekly (Senate sits less frequently)

---

## SCRAPING ARCHITECTURE

### Three-Layer Design

```
Layer 1: DISCOVERY
  └─ Crawls index/listing pages to find new URLs
  └─ Stores URL queue with metadata (type, discovered_at, last_scraped)
  └─ Runs on schedule: daily for bills/Hansards, weekly for MPs

Layer 2: EXTRACTION  
  └─ Processes the URL queue
  └─ Routes each URL to the correct parser (HTML vs PDF vs JS-rendered)
  └─ Stores raw content (HTML snapshot or PDF) before parsing
  └─ Runs continuously, processing queue items with rate limiting

Layer 3: TRANSFORMATION
  └─ Parses stored raw content into structured database records
  └─ Validates extracted data against schemas
  └─ Flags uncertain or low-confidence extractions for manual review
  └─ Separates extraction from transformation — if parser logic changes, re-run transformation without re-scraping
```

This separation is the most important architectural decision. Storing raw content before parsing means a bug in your PDF parser doesn't require re-downloading everything. Fix the parser, reprocess from stored raws.

### Storage Strategy

```
Raw content store (filesystem or S3-compatible):
  /raw/html/{source}/{date}/{url-slug}.html
  /raw/pdf/{date}/{hansard-id}.pdf

Database:
  scrape_queue        — URLs to process, status, attempts, last_error
  scrape_runs         — Audit log of every scrape attempt
  bills               — Structured bill records
  mp_profiles         — MP data
  voting_records      — Per-MP per-bill votes
  data_quality_flags  — Records needing manual review
```

### Rate Limiting Rules (Non-Negotiable)
- 2–3 second delay between requests to the same domain
- Maximum 3 retry attempts with exponential backoff (2s, 8s, 32s)
- Headless browser: max 1 concurrent instance, 5s page timeout
- If a domain returns 429 or 503, back off for 15 minutes before retrying
- Daily scrape window: 11pm–5am EAT to minimize load on government servers

---

## DATA QUALITY & VALIDATION STRATEGY

### The Credibility Problem
Chanuka's accountability scorecards are only as credible as their underlying data. An MP shown as voting "Aye" on a bill they actually voted "Noe" on is worse than no data at all — it's a politically weaponizable error. Every extracted record must carry a confidence level.

### Confidence Levels

| Level | Meaning | Display behaviour |
|---|:---:|---|
| `verified` | Cross-validated across 2+ sources | Show normally |
| `extracted` | Parsed from single source, passed schema validation | Show with subtle indicator |
| `uncertain` | Parsed but failed validation or low regex confidence | Show "pending verification" |
| `flagged` | Contradicts other data or manual flag raised | Hide from public; queue for review |

### Validation Rules
- MP name in Hansard must fuzzy-match (`>85% similarity`) a known MP in the database — misspellings and initials are common
- Constituency extracted from PDF must match known Nairobi constituency list (prevents mis-attribution)
- Vote totals in division summary (e.g., "Ayes 204, Noes 115") must equal the count of individual vote records extracted — if they don't, flag the entire record
- Bill number format must match Kenya's naming convention (`NAB No. {n} of {year}`)

### Manual Review Queue
Build a minimal admin UI (or just a database view) showing `data_quality_flags` records. For the pilot, you — as the solo developer — are the manual reviewer. Target: clear the queue daily. A flag that sits for more than 48 hours should hide the affected data from the public UI.

---

## KENYAN PARLIAMENT-SPECIFIC GOTCHAS

**MP name variations.** The same MP may appear as "Hon. John Smith", "J. Smith (Westlands)", or "Smith, John" across different documents. Build a name normalisation table seeded with all Nairobi MPs at setup. Every name extraction runs through this table first.

**Constituency name spelling.** "Westlands", "West Lands", and "Westland" all appear in documents. Use a canonical list and fuzzy-match everything against it.

**Bill numbering.** Bills are numbered per chamber: "National Assembly Bill No. 5 of 2024" vs "Senate Bill No. 5 of 2024". These are different bills. Never deduplicate on bill number alone.

**Session vs sitting.** Kenya's parliament has sessions within a parliament (13th Parliament, 3rd Session, 12th Sitting). Hansard PDFs are indexed by sitting. Store all three levels — parliament, session, sitting — on every voting record so you can filter correctly.

**PDF encoding.** Some older Hansard PDFs are scanned images, not text PDFs. They will return empty text from a standard PDF parser. Detect this (check if extracted text length is near zero for a non-empty PDF) and flag for manual entry rather than silently storing empty records.

**Recess periods.** Parliament goes on recess (typically August, April, and December). Your scraper will find no new data during these periods. This is correct, not a bug. Add recess period detection so you don't generate "data source error" alerts during expected quiet periods.

---

## APPENDIX A — NAIROBI'S 17 CONSTITUENCIES

For the pilot, scope all scraping to these constituencies only.

Westlands · Dagoretti North · Dagoretti South · Langata · Kibra · Roysambu · Kasarani · Ruaraka · Embakasi South · Embakasi North · Embakasi Central · Embakasi East · Embakasi West · Makadara · Kamukunji · Starehe · Mathare

---
*Strategy document · March 6, 2026*
