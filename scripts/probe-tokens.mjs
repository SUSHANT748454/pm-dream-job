// One-off helper: check which ATS board tokens are valid and roughly how many
// India PM roles they carry. Not part of the build. Run: node scripts/probe-tokens.mjs
const IN =
  /india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|remote/i;
const PM = /\b(product manager|product management|product owner|head of product|group product manager|associate product manager|principal product manager|\bapm\b|\bgpm\b|director,? product|vp,? product)\b/i;
const NOTPM = /\b(product marketing|program manager|project manager|technical program|engineering manager|design manager|product designer|marketing manager|data scientist|software engineer)\b/i;

const greenhouse = [
  "stockx","gleanwork","smartsheet","karat","toast","glance","karya","bswiftindia","commvault",
  "airtable","gong","notion","figma","ramp","anthropic","openai","databricks","dropbox","cloudflare",
  "hashicorp","gitlab","elastic","confluent","mongodb","hubspot","affirm","chime","robinhood","plaid",
  "coinbase","doordash","instacart","reddit","pinterest","lyft","airbnb","stripe","brex",
  "wework","udemy","coursera","duolingo","grammarly","canva","atlassian",
  "zscaler","sumologic","rubrik","cohesity","nutanix","freshworks","postman","razorpaysoftwareprivatelimited",
  "groww","porter","slice","bluestone","zomato","swiggy","meesho","phonepe","cred","zeptonow",
  "sprinto","whatfix","chargebee","clevertap","hasura","browserstack","zetaindia","angelone","innovaccer",
  "narvar","moveworks","observe","airbyte","dbtlabs","retool","vercel","supabase","linear","clickup",
];
const lever = [
  "mindtickle","paytm","hevodata","weekdayworks","saviynt","byjus","jumpcloud","wmg",
  "spinny","classplus","leadsquared","upstox","khatabook","fampay","jar","cashfree","juspay",
  "netflix","plaid","palantir","nvidia","kikoff","attentive","ramp","huggingface",
  "swiggy","cure.fit","curefit","meesho","sharechat","mpl","dream11","games24x7","unacademy",
  "leadsquared","postman","chargebee","hasura","yellowai","gupshup","kissflow","exotel",
];
const ashby = [
  "josys","supa","ema","aiprise","sarvam","decagon","flagright","navi","spotdraft","atlan",
  "openai","ramp","notion","linear","hex","posthog","vanta","deel","gusto","mercury",
  "epifi","zluri","superops","hyperface","toplyne","zenskar","nintee","clootrack","recko",
  "chronus","observeai","observe-ai","kula","peoplebox","peer-ai","attentive-ai","enterpret",
  "sprinto","plum","uni","rippling","perplexity-ai","perplexityai","glean","harvey",
];

async function fetchJson(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "User-Agent": "probe" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function countPmIndia(titlesLocs) {
  return titlesLocs.filter(
    ([t, l]) => PM.test(t) && !NOTPM.test(t) && IN.test(l || ""),
  ).length;
}

const hits = { greenhouse: [], lever: [], ashby: [] };

for (const slug of greenhouse) {
  const d = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
  if (d?.jobs) {
    const n = countPmIndia(d.jobs.map((j) => [j.title, j.location?.name]));
    if (n > 0) hits.greenhouse.push([slug, n, d.jobs.length]);
  }
}
for (const slug of lever) {
  const d = await fetchJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (Array.isArray(d)) {
    const n = countPmIndia(d.map((j) => [j.text, j.categories?.location]));
    if (n > 0) hits.lever.push([slug, n, d.length]);
  }
}
for (const slug of ashby) {
  const d = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  if (d?.jobs) {
    const n = countPmIndia(
      d.jobs.map((j) => [j.title, j.location || j.address?.postalAddress?.addressCountry]),
    );
    if (n > 0) hits.ashby.push([slug, n, d.jobs.length]);
  }
}

for (const ats of ["greenhouse", "lever", "ashby"]) {
  console.log(`\n=== ${ats} (token, india-PM, total) ===`);
  hits[ats].sort((a, b) => b[1] - a[1]).forEach((h) => console.log(h.join("  ")));
}
