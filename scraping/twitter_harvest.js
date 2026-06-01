import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { URL, URLSearchParams } from 'url';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { Tesseract } from 'tesseract.js'

const URLS_FILE = resolve('urls.txt');
const COOKIES_FILE = resolve('cookies.txt');
const MESSAGES_FILE = resolve('messages.txt');
const READ_JS = resolve('read.js');

const ID_RE = /\b([0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4})\b/g;

const MAX_PAGES_PER_URL = 15;
const MAX_WORKERS = 3;
const SEARCH_MAX_AGE_HOURS = 24;
const PAGE_DELAY_MS = 500;

const BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs' +
  '%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const GQL_FEATURES = {
  rweb_video_screen_enabled: false,
  rweb_cashtags_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  rweb_cashtags_composer_attachment_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  rweb_conversational_replies_downvote_enabled: false,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const GQL_FIELD_TOGGLES = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withArticleSummaryText: true,
  withArticleVoiceOver: true,
  withGrokAnalyze: false,
  withDisallowedReplyControls: false,
};

const QUERY_IDS = {
  TweetDetail: '6uCvnic3m5reVuehkvHa3w',
  SearchTimeline: '-TFXKoMnMTKdEXcCn-eahw',
  UserByScreenName: '',
  UserTweets: '',
};

let _shutdown = false;

process.on('SIGINT', () => {
  if (!_shutdown) {
    console.log('\nCtrl+C - finishing current requests then saving...');
    _shutdown = true;
  }
});

let _sessionCookies = '';
let _csrfToken = '';

const BASE_HEADERS = {
  Authorization: `Bearer ${BEARER}`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  Origin: 'https://x.com',
  Referer: 'https://x.com/',
  'x-twitter-active-user': 'yes',
  'x-twitter-auth-type': 'OAuth2Session',
  'x-twitter-client-language': 'en',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
};

function getHeaders(extraReferer = null) {
  const h = { ...BASE_HEADERS };
  if (_csrfToken) h['x-csrf-token'] = _csrfToken;
  if (_sessionCookies) h['Cookie'] = _sessionCookies;
  if (extraReferer) h['Referer'] = extraReferer;
  return h;
}

function loadCookies() {
  if (!existsSync(COOKIES_FILE)) {
    console.error(`\n${COOKIES_FILE} not found!`);
    console.error('   Create cookies.txt and paste your browser cookie string into it.');
    console.error('   (DevTools -> Network -> any x.com/i/api request -> Headers -> Cookie)');
    process.exit(1);
  }

  const raw = readFileSync(COOKIES_FILE, 'utf-8').trim();
  if (!raw) {
    console.error(`${COOKIES_FILE} is empty - paste your cookie string into it.`);
    process.exit(1);
  }

  _sessionCookies = raw;

  const cookieMap = {};
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      cookieMap[key] = val;
    }
  }

  const ct0 = cookieMap['ct0'] || '';
  const authToken = cookieMap['auth_token'] || '';

  if (ct0) {
    _csrfToken = ct0;
  } else {
    console.warn('WARNING: ct0 cookie missing - x-csrf-token not set (API calls may fail)');
  }

  console.log(
    `Cookies loaded - auth_token=${authToken ? 'OK' : 'MISSING'}  ct0=${ct0 ? 'OK' : 'MISSING'}`
  );
}

async function discoverQueryIds() {
  console.log('Discovering GraphQL query IDs from Twitter JS...');
  try {
    const r = await fetch('https://x.com/', { headers: getHeaders() });
    const text = await r.text();

    const jsUrls = [...text.matchAll(
      /https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/[^\s"']+\.js/g
    )].map(m => m[0]);

    if (jsUrls.length === 0) {
      console.log('  WARNING: No JS bundle URLs found - using hardcoded query IDs');
      return;
    }

    const needed = new Set(
      Object.entries(QUERY_IDS)
        .filter(([, v]) => !v)
        .map(([k]) => k)
    );
    const found = {};

    for (const jsUrl of jsUrls) {
      if (needed.size === 0 || _shutdown) break;
      try {
        const js = await (await fetch(jsUrl, { headers: getHeaders() })).text();
        for (const [, qid, name] of js.matchAll(/queryId:"([^"]+)",operationName:"([^"]+)"/g)) {
          if (needed.has(name)) {
            found[name] = qid;
            needed.delete(name);
          }
        }
      } catch { }
    }

    if (Object.keys(found).length > 0) {
      Object.assign(QUERY_IDS, found);
      console.log(`  Discovered: ${JSON.stringify(found)}`);
    }
    if (needed.size > 0) {
      console.log(`  WARNING: Could not discover query IDs for: ${[...needed].join(', ')} - those operations will be skipped`);
    }

  } catch (e) {
    console.log(`  WARNING: Discovery failed (${e.message}) - using hardcoded query IDs`);
  }
}

function gqlUrl(operation) {
  const qid = QUERY_IDS[operation] || '';
  return qid ? `https://x.com/i/api/graphql/${qid}/${operation}` : null;
}

function gqlParams(variables, withToggles = false) {
  const p = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(GQL_FEATURES),
  });
  if (withToggles) {
    p.set('fieldToggles', JSON.stringify(GQL_FIELD_TOGGLES));
  }
  return p.toString();
}

async function waitForRateLimit(headers) {
  const resetEpoch = headers.get('x-ratelimit-reset');
  const retryAfter = headers.get('retry-after');

  if (resetEpoch) {
    const resetMs = parseInt(resetEpoch, 10) * 1000;
    const waitSecs = Math.max(1, (resetMs - Date.now()) / 1000);
    const resetStr = new Date(resetMs).toISOString().slice(11, 19) + ' UTC';
    console.log(`  Rate limited - sleeping ${waitSecs.toFixed(0)}s until ${resetStr}...`);
    await sleep(waitSecs * 1000 + 1000);
  } else if (retryAfter) {
    console.log(`  Rate limited - retry-after ${retryAfter}s...`);
    await sleep((parseInt(retryAfter, 10) + 1) * 1000);
  } else {
    console.log('  Rate limited - sleeping 60s...');
    await sleep(61_000);
  }
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function apiGet(url, params = null, retries = 5) {
  const fullUrl = params ? `${url}?${params}` : url;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (_shutdown) return null;
    try {
      const r = await fetch(fullUrl, { headers: getHeaders(), signal: AbortSignal.timeout(20_000) });

      if (r.status === 404) {
        console.log(`  404 - skipping: ${url.split('?')[0]}`);
        return null;
      }

      if (r.status === 401 || r.status === 403) {
        console.log(`  Auth error ${r.status} - check cookies.txt`);
        return null;
      }

      if (r.status === 429) {
        if (_shutdown) return null;
        await waitForRateLimit(r.headers);
        continue;
      }

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();

    } catch (e) {
      if (_shutdown) return null;
      console.log(`  Request error (attempt ${attempt + 1}/${retries}): ${e.message}`);
      await sleep(Math.min(2 ** attempt * 1000, 30_000));
    }
  }
  return null;
}

function findIdsInText(text) {
  if (!text) return new Set();
  const matches = (text.match(ID_RE) || []).map(m => m.toUpperCase());
  ID_RE.lastIndex = 0;
  return new Set(matches);
}

async function ocrImageUrl(imageUrl) {
  const worker = await Tesseract.createWorker('eng');
  if (!worker) return new Set();
  try {
    const resp = await fetch(imageUrl, { headers: getHeaders(), signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) return new Set();
    const buf = Buffer.from(await resp.arrayBuffer());
    const { data: { text } } = await worker.recognize(buf);
    const ids = findIdsInText(text);
    if (ids.size > 0) console.log(`OCR -> ${ids.size} ID(s)`);
    return ids;
  } catch (e) {
    console.log(`OCR failed: ${e.message}`);
    return new Set();
  }
}

async function extractFromLegacy(legacy) {
  const text = legacy.full_text || legacy.text || '';
  const found = findIdsInText(text);

  const mediaList =
    (legacy.extended_entities || legacy.entities || {}).media || [];

  for (const m of mediaList) {
    if (m.type === 'photo') {
      const url = m.media_url_https || m.media_url || '';
      if (url) {
        for (const id of await ocrImageUrl(url + ':orig')) found.add(id);
      }
    }
  }

  return found;
}

function walkGql(node, tweets, visited, cursors, depth = 0) {
  if (depth > 20 || typeof node !== 'object' || node === null) return;

  const result =
    (node.tweet_results && node.tweet_results.result) ||
    (node.tweetResult && node.tweetResult.result);
  if (result) walkGql(result, tweets, visited, cursors, depth + 1);

  const legacy = node.legacy;
  if (legacy && typeof legacy === 'object' && ('full_text' in legacy || 'text' in legacy)) {
    const tid = legacy.id_str || legacy.id;
    if (tid && !visited.has(tid)) {
      visited.add(tid);
      tweets.push(legacy);
    }
  }

  if (('full_text' in node || 'text' in node) && 'id_str' in node) {
    const tid = node.id_str;
    if (!visited.has(tid)) {
      visited.add(tid);
      tweets.push(node);
    }
  }

  const cursorType = node.cursorType || '';
  const entryType = node.entryType || '';
  if (
    cursorType.includes('Bottom') ||
    (entryType === 'TimelineTimelineCursor' && cursorType.toLowerCase().includes('bottom'))
  ) {
    if (node.value) cursors.push(node.value);
  }

  for (const v of Object.values(node)) {
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === 'object') walkGql(item, tweets, visited, cursors, depth + 1);
        }
      } else {
        walkGql(v, tweets, visited, cursors, depth + 1);
      }
    }
  }
}

function parseGqlResponse(data, visited) {
  const tweets = [];
  const cursors = [];
  walkGql(data, tweets, visited, cursors);
  return { tweets, nextCursor: cursors.length > 0 ? cursors[cursors.length - 1] : null };
}

function cutoffDate() {
  return new Date(Date.now() - SEARCH_MAX_AGE_HOURS * 3_600_000);
}

function tweetIsTooOld(legacy, cutoff) {
  const raw = legacy.created_at || '';
  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d)) return d < cutoff;
  }
  try {
    const ms = (BigInt(legacy.id_str || '0') >> 22n) + 1288834974657n;
    return new Date(Number(ms)) < cutoff;
  } catch {
    return false;
  }
}

async function fetchTweetWithReplies(tweetId) {
  if (_shutdown) return [];

  const url = gqlUrl('TweetDetail');
  if (!url) {
    console.log(`  TweetDetail query ID unknown - skipping ${tweetId}`);
    return [];
  }

  console.log(`  [${tweetId}] Fetching tweet + replies...`);
  const allTweets = [];
  const visited = new Set();
  let cursor = null;

  for (let page = 0; page < MAX_PAGES_PER_URL; page++) {
    if (_shutdown) break;

    const variables = {
      focalTweetId: tweetId,
      with_rux_injections: false,
      rankingMode: 'Relevance',
      includePromotedContent: true,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
    };
    if (cursor) variables.cursor = cursor;

    const data = await apiGet(url, gqlParams(variables, true));
    if (!data) break;

    const { tweets, nextCursor } = parseGqlResponse(data, visited);
    allTweets.push(...tweets);
    console.log(`    [${tweetId}] Page ${page + 1}: +${tweets.length} (total ${allTweets.length})`);

    if (!tweets.length || !nextCursor) break;
    cursor = nextCursor;
    await sleep(PAGE_DELAY_MS);
  }

  return allTweets;
}

async function resolveUserId(screenName) {
  const url = gqlUrl('UserByScreenName');
  if (!url) return null;

  const data = await apiGet(url, gqlParams({
    screen_name: screenName,
    withSafetyModeUserFields: true,
  }));
  if (!data) return null;

  try {
    return data.data.user.result.rest_id || null;
  } catch {
    const m = JSON.stringify(data).match(/"rest_id"\s*:\s*"(\d+)"/);
    return m ? m[1] : null;
  }
}

async function fetchUserTimeline(screenName) {
  if (_shutdown) return [];
  console.log(`  @${screenName} - resolving user ID...`);

  const userId = await resolveUserId(screenName);
  if (!userId) {
    console.log(`  Could not resolve @${screenName} - skipping`);
    return [];
  }

  const url = gqlUrl('UserTweets');
  if (!url) {
    console.log(`  UserTweets query ID unknown - skipping @${screenName}`);
    return [];
  }

  console.log(`  Fetching timeline @${screenName} (id=${userId})...`);
  const allTweets = [];
  const visited = new Set();
  let cursor = null;

  for (let page = 0; page < MAX_PAGES_PER_URL; page++) {
    if (_shutdown) break;

    const variables = {
      userId,
      count: 200,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true,
    };
    if (cursor) variables.cursor = cursor;

    const data = await apiGet(url, gqlParams(variables));
    if (!data) break;

    const { tweets, nextCursor } = parseGqlResponse(data, visited);
    allTweets.push(...tweets);
    console.log(`    [@${screenName}] Page ${page + 1}: +${tweets.length} (total ${allTweets.length})`);

    if (!tweets.length || !nextCursor) break;
    cursor = nextCursor;
    await sleep(PAGE_DELAY_MS);
  }

  return allTweets;
}

async function fetchSearch(query) {
  if (_shutdown) return [];

  const url = gqlUrl('SearchTimeline');
  if (!url) {
    console.log(`  SearchTimeline query ID unknown - skipping "${query}"`);
    return [];
  }

  const cutoff = cutoffDate();
  console.log(`  Searching "${query}" (last ${SEARCH_MAX_AGE_HOURS}h, cutoff ${cutoff.toISOString().slice(11, 16)} UTC)...`);
  const allTweets = [];
  const visited = new Set();
  let cursor = null;

  for (let page = 0; page < MAX_PAGES_PER_URL; page++) {
    if (_shutdown) break;

    const variables = {
      rawQuery: query,
      count: 20,
      querySource: '',
      product: 'Latest',
      withGrokTranslatedBio: true,
      withQuickPromoteEligibilityTweetFields: false,
    };
    if (cursor) variables.cursor = cursor;

    const data = await apiGet(url, gqlParams(variables));
    if (!data) break;

    const { tweets, nextCursor } = parseGqlResponse(data, visited);
    const fresh = tweets.filter(t => !tweetIsTooOld(t, cutoff));
    const stale = tweets.length - fresh.length;
    allTweets.push(...fresh);

    console.log(`    ["${query}"] Page ${page + 1}: +${fresh.length} fresh (${stale} too old, total ${allTweets.length})`);

    if (stale > 0) {
      console.log(`    ["${query}"] Hit age cutoff - stopping.`);
      break;
    }
    if (!tweets.length || !nextCursor) break;
    cursor = nextCursor;
    await sleep(PAGE_DELAY_MS);
  }

  return allTweets;
}

function parseInputUrl(raw) {
  raw = raw.trim();
  if (!raw) return [null, null];

  if (raw.startsWith('#') || (!raw.startsWith('http') && !raw.includes('/'))) {
    return ['search', raw];
  }

  const parsed = new URL(raw);
  const parts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  const qs = parsed.searchParams;

  if (parts[0] === 'search') return ['search', qs.get('q') || ''];
  if (parts.length >= 2 && parts[0] === 'hashtag') return ['search', `#${parts[1]}`];
  if (parts.length >= 3 && parts[1] === 'status') return ['tweet', parts[2]];
  if (parts.length === 1) return ['user', parts[0]];
  return ['user', parts[parts.length - 1]];
}

async function processUrl(line, idx, total) {
  const [kind, value] = parseInputUrl(line);
  console.log(`\n[${idx}/${total}] "${line}" -> ${kind}="${value}"`);

  let tweets;
  if (kind === 'tweet') tweets = await fetchTweetWithReplies(value);
  else if (kind === 'user') tweets = await fetchUserTimeline(value);
  else if (kind === 'search') tweets = await fetchSearch(value);
  else {
    console.log(`  Unrecognised URL type: "${line}"`);
    return new Set();
  }

  const found = new Set();
  for (const t of tweets) {
    for (const id of await extractFromLegacy(t)) found.add(id);
  }

  console.log(`  [${value}] ${found.size} ID(s) found`);
  return found;
}

function appendToMessages(ids) {
  appendFileSync(MESSAGES_FILE, ids.join('\n') + '\n', 'utf-8');
}

async function runWithPool(tasks, maxWorkers) {
  const results = new Array(tasks.length);
  let i = 0;

  async function worker() {
    while (i < tasks.length && !_shutdown) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: maxWorkers }, worker));
  return results;
}

async function main() {
  loadCookies();
  await discoverQueryIds();

  if (!existsSync(URLS_FILE)) {
    console.error(`${URLS_FILE} not found.`);
    process.exit(1);
  }

  const rawLines = readFileSync(URLS_FILE, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  if (rawLines.length === 0) {
    console.warn(`${URLS_FILE} is empty or all lines are comments.`);
    process.exit(0);
  }

  const total = rawLines.length;
  console.log(`\n${total} URL(s) loaded | workers=${MAX_WORKERS} | search cutoff=${SEARCH_MAX_AGE_HOURS}h\n`);

  const allFound = new Set();

  const tasks = rawLines.map((line, i) => async () => {
    if (_shutdown) return new Set();
    try {
      const found = await processUrl(line, i + 1, total);
      for (const id of found) allFound.add(id);
    } catch (e) {
      console.log(`  URL failed ("${line}"): ${e.message}`);
    }
  });

  await runWithPool(tasks, MAX_WORKERS);

  const allIds = [...allFound].sort();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total found: ${allIds.length}`);

  if (allIds.length === 0) {
    console.log('Nothing found.');
  } else {
    appendToMessages(allIds);
    console.log(`\nAppended to ${MESSAGES_FILE}:`);
    for (const id of allIds) console.log(`   ${id}`);
  }

  if (existsSync(READ_JS)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running ${READ_JS}...\n`);
    try {
      execFileSync(process.execPath, [READ_JS], { stdio: 'inherit' });
    } catch (e) {
      console.warn(`read.js exited with code ${e.status}`);
    }
  } else {
    console.warn(`\n${READ_JS} not found - skipping JS const generation.`);
  }

  console.log('\nDone!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
