// Duplicate import removed — bills imported from ../infrastructure/schema below
/**
 * CHANUKA PLATFORM — PARLIAMENTARY DATA SCRAPER
 * Full TypeScript implementation for Kenyan parliament.go.ke
 *
 * Architecture: Three-layer (Discovery → Extraction → Transformation)
 * Targets: parliament.go.ke, hansardna.parliament.go.ke
 * Scope: Nairobi pilot (17 constituencies)
 */

import puppeteer, { Browser, Page } from "puppeteer";
import * as cheerio from "cheerio";
// Using native fetch (Node 18+) — no external HTTP client dependency needed
import pdfParse from "pdf-parse";
import Fuse from "fuse.js";
import pino from "pino";
import { createWriteStream, existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { setTimeout as sleep } from "timers/promises";
import { db } from "../infrastructure/database";
import {
  bills, mpProfiles, votingRecords, scrapeQueue,
  scrapeRuns, dataQualityFlags,
} from "../infrastructure/schema";
import { eq, and, lt } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────

const logger = pino({ level: "info", transport: { target: "pino-pretty" } });

const RATE_LIMIT_MS = 2500; // 2.5s between requests to same domain
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 8000, 32000]; // exponential backoff
const DOMAIN_BACKOFF_MS = 15 * 60 * 1000; // 15 min on 429/503
const HEADLESS_TIMEOUT_MS = 30000;

const PARLIAMENT_BASE = "https://www.parliament.go.ke";
const HANSARD_NA_BASE = "https://hansardna.parliament.go.ke";

const RAW_STORE_PATH = process.env.RAW_STORE_PATH ?? "./data/raw";

/** Nairobi's 17 constituencies — canonical spellings */
export const NAIROBI_CONSTITUENCIES = [
  "Westlands", "Dagoretti North", "Dagoretti South", "Langata", "Kibra",
  "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North",
  "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara",
  "Kamukunji", "Starehe", "Mathare",
] as const;

export type NairobiConstituency = (typeof NAIROBI_CONSTITUENCIES)[number];

/** Kenya's parliamentary recess windows (approximate) */
const RECESS_PERIODS = [
  { start: "08-01", end: "09-07" }, // August recess
  { start: "04-01", end: "04-28" }, // April recess
  { start: "12-15", end: "01-20" }, // December/January recess
];

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type ConfidenceLevel = "verified" | "extracted" | "uncertain" | "flagged";

export type ScrapeTarget =
  | "mp_profiles"
  | "bills_index"
  | "bill_detail"
  | "hansard_index"
  | "hansard_pdf"
  | "bills_tracker_pdf"
  | "senate_votes";

export interface QueueItem {
  id: string;
  url: string;
  target: ScrapeTarget;
  attempts: number;
  lastError?: string;
  metadata?: Record<string, string>;
}

export interface ExtractedMP {
  name: string;
  normalizedName: string;
  constituency: string;
  party: string;
  photoUrl?: string;
  profileUrl: string;
  confidence: ConfidenceLevel;
}

export interface ExtractedBill {
  billNumber: string;           // e.g. "NAB No. 5 of 2024"
  title: string;
  chamber: "national_assembly" | "senate";
  sponsor: string;
  status: string;
  firstReadingDate?: string;    // ISO date string
  detailUrl: string;
  confidence: ConfidenceLevel;
}

export interface ExtractedVote {
  mpName: string;
  normalizedMpName: string;
  constituency?: string;
  vote: "aye" | "noe" | "abstain" | "absent";
  billNumber: string;
  billTitle: string;
  sittingDate: string;          // ISO date string
  parliament: number;           // e.g. 13
  session: number;
  sitting: number;
  hansardPdfUrl: string;
  confidence: ConfidenceLevel;
}

export interface DivisionSummary {
  ayes: number;
  noes: number;
  abstentions: number;
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

/** Check if today falls within a parliamentary recess period */
export function isRecessPeriod(): boolean {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return RECESS_PERIODS.some(({ start, end }) => {
    if (start <= end) return mmdd >= start && mmdd <= end;
    // Wraps year boundary (Dec-Jan)
    return mmdd >= start || mmdd <= end;
  });
}

/** Ensure raw storage directories exist */
function ensureStoreDirs(): void {
  ["html", "pdf"].forEach((sub) => {
    const dir = join(RAW_STORE_PATH, sub);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });
}

/** Slugify a URL for use as a filename */
function urlToSlug(url: string): string {
  return url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

/** Save raw HTML to the store */
function storeRawHtml(url: string, html: string): string {
  ensureStoreDirs();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}_${urlToSlug(url)}.html`;
  const path = join(RAW_STORE_PATH, "html", filename);
  writeFileSync(path, html, "utf-8");
  return path;
}

/** Save raw PDF buffer to the store */
function storeRawPdf(id: string, buffer: Buffer): string {
  ensureStoreDirs();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}_${id}.pdf`;
  const path = join(RAW_STORE_PATH, "pdf", filename);
  writeFileSync(path, buffer);
  return path;
}

// ─────────────────────────────────────────────────────────────
// NAME NORMALISATION
// ─────────────────────────────────────────────────────────────

/**
 * Normalises MP name variations found across parliament.go.ke and Hansard PDFs.
 * Examples handled:
 *   "Hon. John Smith (Westlands)" → "john smith"
 *   "Smith, John"                 → "john smith"
 *   "J. Smith"                    → kept as-is for fuzzy matching
 */
export function normaliseMpName(raw: string): string {
  return raw
    .replace(/^Hon\.?\s*/i, "")           // strip "Hon." prefix
    .replace(/\s*\([^)]+\)\s*/g, "")      // strip constituency in parens
    .replace(/,\s*(\w+)\s*$/, " $1")      // "Smith, John" → "Smith John"
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Normalises constituency name variants.
 * Uses fuzzy matching against the canonical Nairobi list.
 */
const constituencyFuse = new Fuse(NAIROBI_CONSTITUENCIES, { threshold: 0.35 });

export function normaliseConstituency(raw: string): NairobiConstituency | null {
  const result = constituencyFuse.search(raw.trim());
  return result.length > 0 ? result[0].item : null;
}

// ─────────────────────────────────────────────────────────────
// HTTP CLIENT (Static pages)
// ─────────────────────────────────────────────────────────────

/** Per-domain last-request timestamps for rate limiting */
const domainLastRequest: Record<string, number> = {};
const domainBackoffUntil: Record<string, number> = {};

function getDomain(url: string): string {
  return new URL(url).hostname;
}

async function respectRateLimit(url: string): Promise<void> {
  const domain = getDomain(url);
  const backoffUntil = domainBackoffUntil[domain] ?? 0;
  if (Date.now() < backoffUntil) {
    const wait = backoffUntil - Date.now();
    logger.warn({ domain, waitMs: wait }, "Domain in backoff, waiting");
    await sleep(wait);
  }
  const last = domainLastRequest[domain] ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  domainLastRequest[domain] = Date.now();
}

const HTTP_HEADERS = {
  "User-Agent": "Chanuka-Civic-Platform/1.0 (civic transparency research; contact@chanuka.ke)",
  "Accept": "text/html,application/xhtml+xml,application/pdf",
};

/**
 * Fetches a URL with rate limiting, retries, and backoff.
 * Uses native fetch (Node 18+). Returns null on permanent failure.
 */
export async function fetchWithRetry(
  url: string,
  options: { responseType?: "arraybuffer" | "text" } = {}
): Promise<{ data: string | Buffer; storedPath?: string } | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await respectRateLimit(url);
    try {
      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, {
        headers: HTTP_HEADERS,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const status = res.status;
        if (status === 429 || status === 503) {
          domainBackoffUntil[getDomain(url)] = Date.now() + DOMAIN_BACKOFF_MS;
          logger.warn({ url, status }, "Rate limited — entering domain backoff");
          break;
        }
        if (status === 404) {
          logger.warn({ url }, "404 — skipping");
          return null;
        }
        throw new Error(`HTTP ${status}`);
      }

      const data = options.responseType === "arraybuffer"
        ? Buffer.from(await res.arrayBuffer())
        : await res.text();

      return { data };
    } catch (err: any) {
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt];
        logger.warn({ url, attempt, delay }, "Fetch failed, retrying");
        await sleep(delay);
      } else {
        logger.error({ url, err: err.message }, "All retries exhausted");
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// HEADLESS BROWSER (JS-rendered pages)
// ─────────────────────────────────────────────────────────────

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance?.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Fetches a JS-rendered page via Puppeteer.
 * Waits for network idle to ensure dynamic content has loaded.
 */
export async function fetchJsRendered(url: string): Promise<string | null> {
  await respectRateLimit(url);
  const browser = await getBrowser();
  let page: Page | null = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent(
      "Chanuka-Civic-Platform/1.0 (civic transparency research; contact@chanuka.ke)"
    );
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: HEADLESS_TIMEOUT_MS,
    });
    const html = await page.content();
    return html;
  } catch (err: any) {
    logger.error({ url, err: err.message }, "Puppeteer fetch failed");
    return null;
  } finally {
    await page?.close();
    domainLastRequest[getDomain(url)] = Date.now();
  }
}

// ─────────────────────────────────────────────────────────────
// LAYER 1: DISCOVERY
// ─────────────────────────────────────────────────────────────

/**
 * Discovers MP profile URLs from the National Assembly members page.
 * Enqueues each profile for extraction.
 */
export async function discoverMpProfiles(): Promise<void> {
  logger.info("Discovering MP profiles");
  const url = `${PARLIAMENT_BASE}/the-national-assembly/mps`;
  const html = await fetchJsRendered(url);
  if (!html) return;

  storeRawHtml(url, html);
  const $ = cheerio.load(html);

  const profileUrls: string[] = [];

  // parliament.go.ke renders MPs as cards/list items with links
  $("a[href*='/the-national-assembly/mps/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http") ? href : `${PARLIAMENT_BASE}${href}`;
      profileUrls.push(fullUrl);
    }
  });

  logger.info({ count: profileUrls.length }, "MP profile URLs discovered");

  // Enqueue each profile for extraction
  for (const profileUrl of profileUrls) {
    await enqueueIfNew(profileUrl, "mp_profiles");
  }
}

/**
 * Discovers bill URLs from the bills listing page.
 * Handles pagination by following "next page" links.
 */
export async function discoverBills(): Promise<void> {
  logger.info("Discovering bills");
  let pageUrl: string | null = `${PARLIAMENT_BASE}/the-national-assembly/house-business/bills`;
  let pageCount = 0;

  while (pageUrl && pageCount < 20) { // cap at 20 pages of bills
    const html = await fetchJsRendered(pageUrl);
    if (!html) break;
    storeRawHtml(pageUrl, html);

    const $ = cheerio.load(html);
    let foundOnPage = 0;

    // Bill links on parliament.go.ke are typically in a table or list
    $("a[href*='/node/']").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && /bill/i.test(text)) {
        const fullUrl = href.startsWith("http") ? href : `${PARLIAMENT_BASE}${href}`;
        enqueueIfNew(fullUrl, "bill_detail");
        foundOnPage++;
      }
    });

    logger.info({ page: pageCount + 1, found: foundOnPage }, "Bills page processed");

    // Follow pagination
    const nextHref = $("a.pager-next, a[rel='next'], li.pager__item--next a").attr("href");
    pageUrl = nextHref
      ? nextHref.startsWith("http") ? nextHref : `${PARLIAMENT_BASE}${nextHref}`
      : null;
    pageCount++;
  }
}

/**
 * Discovers Hansard PDF links from the National Assembly Hansard repository.
 * The DSpace repository serves a paginated list of sitting records.
 */
export async function discoverHansards(): Promise<void> {
  logger.info("Discovering Hansard PDFs");

  // DSpace community/collection listing
  const indexUrl = `${HANSARD_NA_BASE}/handle/123456789/1/browse?type=dateissued&order=DESC`;
  const result = await fetchWithRetry(indexUrl);
  if (!result) return;

  storeRawHtml(indexUrl, result.data as string);
  const $ = cheerio.load(result.data as string);

  $("a[href*='/handle/'], a[href*='/bitstream/']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    if (href.includes(".pdf") || href.includes("/bitstream/")) {
      const fullUrl = href.startsWith("http") ? href : `${HANSARD_NA_BASE}${href}`;
      enqueueIfNew(fullUrl, "hansard_pdf");
    } else if (href.includes("/handle/")) {
      // This is a Hansard sitting page — fetch it to find the PDF link
      const fullUrl = href.startsWith("http") ? href : `${HANSARD_NA_BASE}${href}`;
      enqueueIfNew(fullUrl, "hansard_index");
    }
  });
}

// ─────────────────────────────────────────────────────────────
// LAYER 2: EXTRACTION
// ─────────────────────────────────────────────────────────────

/**
 * Extracts structured MP data from a single profile page.
 */
export async function extractMpProfile(url: string): Promise<ExtractedMP | null> {
  const html = await fetchJsRendered(url);
  if (!html) return null;
  storeRawHtml(url, html);

  const $ = cheerio.load(html);
  let confidence: ConfidenceLevel = "extracted";

  // Name: typically in an h1 or .field--name-title
  const rawName =
    $("h1.page-header, h1.node__title, .field--name-title").first().text().trim() ||
    $("h1").first().text().trim();

  if (!rawName) {
    logger.warn({ url }, "Could not extract MP name");
    return null;
  }

  // Constituency: look for field labels
  const rawConstituency =
    $(".field--name-field-constituency, .constituency").first().text().trim() ||
    $("td:contains('Constituency')").next().text().trim();

  // Party: look for field labels
  const rawParty =
    $(".field--name-field-party, .party").first().text().trim() ||
    $("td:contains('Party')").next().text().trim();

  // Photo
  const photoUrl = $(".field--name-field-photo img, .mp-photo img").first().attr("src") ?? undefined;

  // Validate constituency against Nairobi list
  const normalisedConstituency = normaliseConstituency(rawConstituency);
  if (!normalisedConstituency) {
    // Not a Nairobi MP — skip for pilot
    return null;
  }

  // Flag low-confidence extractions
  if (!rawParty || !rawConstituency) confidence = "uncertain";

  return {
    name: rawName,
    normalizedName: normaliseMpName(rawName),
    constituency: normalisedConstituency,
    party: rawParty || "Unknown",
    photoUrl: photoUrl ? (photoUrl.startsWith("http") ? photoUrl : `${PARLIAMENT_BASE}${photoUrl}`) : undefined,
    profileUrl: url,
    confidence,
  };
}

/**
 * Extracts structured bill metadata from a bill detail page.
 */
export async function extractBillDetail(url: string): Promise<ExtractedBill | null> {
  const result = await fetchWithRetry(url);
  if (!result) return null;
  storeRawHtml(url, result.data as string);

  const $ = cheerio.load(result.data as string);
  let confidence: ConfidenceLevel = "extracted";

  const title = $("h1.page-header, h1.node__title, h1").first().text().trim();
  if (!title) return null;

  // Bill number: Kenya format "National Assembly Bill No. X of YYYY"
  const billNumberMatch = title.match(/(?:national assembly|senate)\s+bill\s+no\.?\s*(\d+)\s+of\s+(\d{4})/i)
    ?? $(".field--name-field-bill-number").first().text().trim().match(/no\.?\s*(\d+)\s+of\s+(\d{4})/i);

  if (!billNumberMatch) {
    confidence = "uncertain";
  }

  const chamber = /senate/i.test(title) ? "senate" : "national_assembly";
  const billNumber = billNumberMatch
    ? `${chamber === "senate" ? "SB" : "NAB"} No. ${billNumberMatch[1]} of ${billNumberMatch[2]}`
    : `UNKNOWN_${urlToSlug(url)}`;

  // Sponsor: often in a field or table row
  const sponsor =
    $(".field--name-field-sponsor, .field--name-field-mp").first().text().trim() ||
    $("td:contains('Sponsor')").next().text().trim() ||
    "Unknown";

  // Status
  const status =
    $(".field--name-field-bill-status, .bill-status").first().text().trim() ||
    $("td:contains('Status')").next().text().trim() ||
    "Unknown";

  // First reading date
  const firstReadingText =
    $("td:contains('First Reading')").next().text().trim() ||
    $(".field--name-field-first-reading").first().text().trim();

  let firstReadingDate: string | undefined;
  if (firstReadingText) {
    const parsed = new Date(firstReadingText);
    if (!isNaN(parsed.getTime())) firstReadingDate = parsed.toISOString().slice(0, 10);
  }

  return {
    billNumber,
    title,
    chamber,
    sponsor: normaliseMpName(sponsor) !== "unknown" ? sponsor : sponsor,
    status,
    firstReadingDate,
    detailUrl: url,
    confidence,
  };
}

/**
 * Downloads and parses a Hansard PDF to extract individual MP votes.
 *
 * Division records in Kenyan Hansards follow this pattern:
 *   DIVISION
 *   AYES (204)                      NOES (115)
 *   Hon. Smith (Westlands)    |   Hon. Jones (Kibra)
 *   ...
 *   The Ayes have it.
 *
 * We extract: vote side, MP name, and associate with the bill under debate.
 */
export async function extractHansardVotes(
  pdfUrl: string,
  sittingDate: string,
  parliament: number,
  session: number,
  sitting: number
): Promise<ExtractedVote[]> {
  const result = await fetchWithRetry(pdfUrl, { responseType: "arraybuffer" });
  if (!result) return [];

  const buffer = result.data as Buffer;

  // Detect scanned image PDFs (near-zero text = image scan)
  let pdfText: string;
  try {
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text;
    if (pdfText.trim().length < 100) {
      logger.warn({ pdfUrl }, "Probable scanned PDF — flagging for manual entry");
      await createDataQualityFlag({
        source: pdfUrl,
        reason: "scanned_pdf",
        notes: "PDF appears to be a scanned image; voting records require manual extraction",
      });
      return [];
    }
  } catch (err) {
    logger.error({ pdfUrl }, "PDF parse failed");
    return [];
  }

  // Store raw PDF
  const pdfId = urlToSlug(pdfUrl).slice(0, 60);
  storeRawPdf(pdfId, buffer);

  const votes: ExtractedVote[] = [];

  // Split by DIVISION markers
  const divisionBlocks = pdfText.split(/(?=DIVISION\s*\n)/i);

  for (const block of divisionBlocks) {
    if (!/DIVISION/i.test(block)) continue;

    // Extract bill context from text around the division
    const billTitleMatch = block.match(/(?:The\s+)?([A-Z][A-Za-z\s,()]+Bill[^,\n]*)/);
    const billTitle = billTitleMatch?.[1]?.trim() ?? "Unknown Bill";
    const billNumber = extractBillNumberFromText(block);

    // Extract vote totals for validation
    const summaryMatch = block.match(/AYES[:\s]+\(?\s*(\d+)\s*\)?.*NOES[:\s]+\(?\s*(\d+)\s*\)?/is);
    const expectedAyes = summaryMatch ? parseInt(summaryMatch[1]) : null;
    const expectedNoes = summaryMatch ? parseInt(summaryMatch[2]) : null;

    // Extract AYES column
    const ayesSection = block.match(/AYES[^]*?(?=NOES|$)/is)?.[0] ?? "";
    const noesSection = block.match(/NOES[^]*?(?=ABSTENTIONS|The |$)/is)?.[0] ?? "";
    const abstainSection = block.match(/ABSTENTIONS[^]*?(?=The |$)/is)?.[0] ?? "";

    const ayeVotes = parseMpNamesFromSection(ayesSection, "aye", billNumber, billTitle, sittingDate, parliament, session, sitting, pdfUrl);
    const noeVotes = parseMpNamesFromSection(noesSection, "noe", billNumber, billTitle, sittingDate, parliament, session, sitting, pdfUrl);
    const abstainVotes = parseMpNamesFromSection(abstainSection, "abstain", billNumber, billTitle, sittingDate, parliament, session, sitting, pdfUrl);

    // Validate counts
    if (expectedAyes !== null && ayeVotes.length !== expectedAyes) {
      logger.warn({
        pdfUrl, billTitle, expected: expectedAyes, got: ayeVotes.length
      }, "Aye count mismatch — flagging division");
      await createDataQualityFlag({
        source: pdfUrl,
        reason: "vote_count_mismatch",
        notes: `Expected ${expectedAyes} ayes, extracted ${ayeVotes.length} for ${billTitle}`,
      });
      // Mark all votes in this division as uncertain
      [...ayeVotes, ...noeVotes, ...abstainVotes].forEach(v => v.confidence = "uncertain");
    }

    votes.push(...ayeVotes, ...noeVotes, ...abstainVotes);
  }

  logger.info({ pdfUrl, count: votes.length }, "Votes extracted from Hansard");
  return votes;
}

// ─────────────────────────────────────────────────────────────
// PDF PARSING HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Extracts MP names from a vote section (Ayes or Noes column of a division table).
 * Handles the two-column layout common in Kenyan Hansard PDFs.
 */
function parseMpNamesFromSection(
  sectionText: string,
  side: "aye" | "noe" | "abstain",
  billNumber: string,
  billTitle: string,
  sittingDate: string,
  parliament: number,
  session: number,
  sitting: number,
  pdfUrl: string
): ExtractedVote[] {
  const votes: ExtractedVote[] = [];

  // MP names in Hansards follow: "Hon. [Name] ([Constituency])" or "Hon. [Name], [Party]"
  const mpPattern = /Hon\.?\s+([A-Z][A-Za-z\s\-.']+?)(?:\s*\(([^)]+)\))?(?:[,\n]|$)/g;
  let match: RegExpExecArray | null;

  while ((match = mpPattern.exec(sectionText)) !== null) {
    const rawName = match[1].trim();
    const rawConstituency = match[2]?.trim();

    const normalisedName = normaliseMpName(rawName);
    const normalisedConstituency = rawConstituency
      ? normaliseConstituency(rawConstituency)
      : null;

    // For Nairobi pilot: only include if constituency is Nairobi OR constituency unknown
    // (unknown = we can't filter them out — flag as uncertain instead)
    const confidence: ConfidenceLevel = normalisedConstituency
      ? NAIROBI_CONSTITUENCIES.includes(normalisedConstituency) ? "extracted" : "extracted"
      : "uncertain";

    votes.push({
      mpName: rawName,
      normalizedMpName: normalisedName,
      constituency: normalisedConstituency ?? rawConstituency,
      vote: side,
      billNumber,
      billTitle,
      sittingDate,
      parliament,
      session,
      sitting,
      hansardPdfUrl: pdfUrl,
      confidence,
    });
  }

  return votes;
}

/**
 * Extracts a Kenya-format bill number from arbitrary text.
 */
function extractBillNumberFromText(text: string): string {
  const match = text.match(
    /(?:national assembly|senate)?\s*bill\s+no\.?\s*(\d+)\s+of\s+(\d{4})/i
  );
  if (!match) return "UNKNOWN";
  const chamber = /senate/i.test(text) ? "SB" : "NAB";
  return `${chamber} No. ${match[1]} of ${match[2]}`;
}

// ─────────────────────────────────────────────────────────────
// LAYER 3: TRANSFORMATION (DB writes)
// ─────────────────────────────────────────────────────────────

export async function persistMpProfile(mp: ExtractedMP): Promise<void> {
  try {
    await db.insert(mpProfiles).values({
      name: mp.name,
      normalizedName: mp.normalizedName,
      constituency: mp.constituency,
      party: mp.party,
      photoUrl: mp.photoUrl,
      profileUrl: mp.profileUrl,
      confidence: mp.confidence,
      lastScrapedAt: new Date(),
    }).onConflictDoUpdate({
      target: mpProfiles.normalizedName,
      set: {
        party: mp.party,
        photoUrl: mp.photoUrl,
        confidence: mp.confidence,
        lastScrapedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error({ mp: mp.normalizedName, err }, "Failed to persist MP profile");
  }
}

export async function persistBill(bill: ExtractedBill): Promise<void> {
  try {
    await db.insert(bills).values({
      billNumber: bill.billNumber,
      title: bill.title,
      chamber: bill.chamber,
      sponsor: bill.sponsor,
      status: bill.status,
      firstReadingDate: bill.firstReadingDate,
      detailUrl: bill.detailUrl,
      confidence: bill.confidence,
      lastScrapedAt: new Date(),
    }).onConflictDoUpdate({
      target: bills.billNumber,
      set: {
        status: bill.status,
        confidence: bill.confidence,
        lastScrapedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error({ billNumber: bill.billNumber, err }, "Failed to persist bill");
  }
}

export async function persistVotingRecords(extractedVotes: ExtractedVote[]): Promise<void> {
  // Filter: only persist Nairobi MPs for the pilot
  const nairobiVotes = extractedVotes.filter(
    v => v.constituency && NAIROBI_CONSTITUENCIES.includes(v.constituency as NairobiConstituency)
  );

  // Additionally persist uncertain ones (unknown constituency) — flag them
  const uncertainVotes = extractedVotes.filter(v => v.confidence === "uncertain");

  const toPersist = [...nairobiVotes, ...uncertainVotes];
  if (toPersist.length === 0) return;

  try {
    await db.insert(votingRecords).values(
      toPersist.map(v => ({
        mpNormalizedName: v.normalizedMpName,
        constituency: v.constituency,
        vote: v.vote,
        billNumber: v.billNumber,
        billTitle: v.billTitle,
        sittingDate: v.sittingDate,
        parliament: v.parliament,
        session: v.session,
        sitting: v.sitting,
        hansardPdfUrl: v.hansardPdfUrl,
        confidence: v.confidence,
      }))
    ).onConflictDoNothing();

    logger.info({ count: toPersist.length }, "Voting records persisted");
  } catch (err) {
    logger.error({ err }, "Failed to persist voting records");
  }
}

// ─────────────────────────────────────────────────────────────
// SCRAPE QUEUE
// ─────────────────────────────────────────────────────────────

async function enqueueIfNew(url: string, target: ScrapeTarget): Promise<void> {
  try {
    await db.insert(scrapeQueue).values({
      url,
      target,
      attempts: 0,
      status: "pending",
      discoveredAt: new Date(),
    }).onConflictDoNothing(); // url is unique key
  } catch (err) {
    logger.error({ url, err }, "Failed to enqueue URL");
  }
}

async function getNextQueueItem(): Promise<QueueItem | null> {
  const rows = await db
    .select()
    .from(scrapeQueue)
    .where(and(
      eq(scrapeQueue.status, "pending"),
      lt(scrapeQueue.attempts, MAX_RETRIES)
    ))
    .limit(1);
  return rows[0] ?? null;
}

async function markQueueItem(id: string, status: "complete" | "failed", error?: string): Promise<void> {
  await db.update(scrapeQueue)
    .set({ status, lastError: error, processedAt: new Date() })
    .where(eq(scrapeQueue.id, id));
}

async function createDataQualityFlag(flag: {
  source: string;
  reason: string;
  notes: string;
}): Promise<void> {
  await db.insert(dataQualityFlags).values({
    source: flag.source,
    reason: flag.reason,
    notes: flag.notes,
    createdAt: new Date(),
    resolved: false,
  }).onConflictDoNothing();
}

// ─────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────

/**
 * Main scrape orchestrator. Runs a full cycle:
 * 1. Discovery (find new URLs)
 * 2. Extraction (process queue)
 * 3. Transformation (persist to DB)
 */
export async function runScrapeCycle(): Promise<void> {
  if (isRecessPeriod()) {
    logger.info("Parliament in recess — skipping scrape cycle");
    return;
  }

  logger.info("Starting scrape cycle");
  const runStart = Date.now();

  try {
    // ── DISCOVERY ──────────────────────────────────────────
    await discoverMpProfiles();
    await discoverBills();
    await discoverHansards();

    // ── EXTRACTION + TRANSFORMATION (queue processing) ────
    let processed = 0;
    let item: QueueItem | null;

    while ((item = await getNextQueueItem()) !== null) {
      try {
        switch (item.target) {
          case "mp_profiles": {
            const mp = await extractMpProfile(item.url);
            if (mp) await persistMpProfile(mp);
            await markQueueItem(item.id, "complete");
            break;
          }
          case "bill_detail": {
            const bill = await extractBillDetail(item.url);
            if (bill) await persistBill(bill);
            await markQueueItem(item.id, "complete");
            break;
          }
          case "hansard_index": {
            // Fetch the sitting page and find the PDF link
            const result = await fetchWithRetry(item.url);
            if (result) {
              storeRawHtml(item.url, result.data as string);
              const $ = cheerio.load(result.data as string);
              $("a[href*='.pdf'], a[href*='/bitstream/']").each((_, el) => {
                const href = $(el).attr("href");
                if (href) {
                  const fullUrl = href.startsWith("http") ? href : `${HANSARD_NA_BASE}${href}`;
                  enqueueIfNew(fullUrl, "hansard_pdf");
                }
              });
            }
            await markQueueItem(item.id, "complete");
            break;
          }
          case "hansard_pdf": {
            // Parse sitting context from URL/metadata
            const { date, parliament, session, sitting } = parseSittingMetadataFromUrl(item.url);
            const votes = await extractHansardVotes(item.url, date, parliament, session, sitting);
            await persistVotingRecords(votes);
            await markQueueItem(item.id, "complete");
            break;
          }
          default:
            await markQueueItem(item.id, "complete");
        }
        processed++;
      } catch (err: any) {
        logger.error({ url: item.url, err: err.message }, "Queue item processing failed");
        await db.update(scrapeQueue)
          .set({ attempts: item.attempts + 1, lastError: err.message })
          .where(eq(scrapeQueue.id, item.id));
        if (item.attempts + 1 >= MAX_RETRIES) {
          await markQueueItem(item.id, "failed", err.message);
        }
      }
    }

    const durationMs = Date.now() - runStart;
    logger.info({ processed, durationMs }, "Scrape cycle complete");

    await db.insert(scrapeRuns).values({
      startedAt: new Date(runStart),
      completedAt: new Date(),
      itemsProcessed: processed,
      success: true,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Scrape cycle failed");
    await db.insert(scrapeRuns).values({
      startedAt: new Date(runStart),
      completedAt: new Date(),
      itemsProcessed: 0,
      success: false,
      error: err.message,
    });
  } finally {
    await closeBrowser();
  }
}

/**
 * Parses sitting metadata from a Hansard PDF URL or filename.
 * Hansard filenames often encode the date; parliament/session/sitting
 * must be inferred from the date or stored alongside during discovery.
 *
 * Returns conservative defaults if parsing fails.
 */
function parseSittingMetadataFromUrl(url: string): {
  date: string;
  parliament: number;
  session: number;
  sitting: number;
} {
  // Try to extract date from URL pattern like "2024-06-19" or "19th_June_2024"
  const isoMatch = url.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      parliament: 13, // Current parliament (2022-2027)
      session: inferSessionFromDate(isoMatch[1]),
      sitting: 0, // Unknown without cross-referencing index
    };
  }
  // Fallback: return today's date and flag
  return {
    date: new Date().toISOString().slice(0, 10),
    parliament: 13,
    session: 0,
    sitting: 0,
  };
}

/** Maps a date to the approximate Kenyan parliamentary session number */
function inferSessionFromDate(isoDate: string): number {
  const year = parseInt(isoDate.slice(0, 4));
  // 13th Parliament sessions: 1st=2022, 2nd=2023, 3rd=2024, 4th=2025, 5th=2026
  return Math.max(1, year - 2021);
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────

/**
 * Runs the scraper on a schedule.
 * Nightly window: 11pm–5am EAT (UTC+3) to respect government servers.
 *
 * Usage: call startScheduler() once on application boot.
 */
export function startScheduler(): void {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // check every hour

  logger.info("Scrape scheduler started");

  const checkAndRun = async () => {
    const now = new Date();
    const eatHour = (now.getUTCHours() + 3) % 24; // East Africa Time

    // Run between 11pm and 5am EAT
    if (eatHour >= 23 || eatHour < 5) {
      await runScrapeCycle();
    } else {
      logger.info({ eatHour }, "Outside scrape window — skipping");
    }
  };

  // Run immediately on startup (for development), then on schedule
  checkAndRun();
  setInterval(checkAndRun, CHECK_INTERVAL_MS);
}

// ─────────────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────────────

if (require.main === module) {
  const command = process.argv[2];
  switch (command) {
    case "run":
      runScrapeCycle().then(() => process.exit(0)).catch((err) => {
        logger.error(err);
        process.exit(1);
      });
      break;
    case "schedule":
      startScheduler();
      break;
    case "discover-mps":
      discoverMpProfiles().then(() => process.exit(0));
      break;
    case "discover-bills":
      discoverBills().then(() => process.exit(0));
      break;
    case "discover-hansards":
      discoverHansards().then(() => process.exit(0));
      break;
    default:
      console.log(`
Chanuka Parliament Scraper

Commands:
  run              — Run a full scrape cycle once
  schedule         — Start the nightly scheduler
  discover-mps     — Discover and enqueue MP profile URLs
  discover-bills   — Discover and enqueue bill URLs
  discover-hansards — Discover and enqueue Hansard PDF URLs

Usage: npx ts-node scraper.ts [command]
      `);
  }
}
