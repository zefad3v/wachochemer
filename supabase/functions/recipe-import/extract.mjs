// Only fetch known publisher hosts. Every redirect is checked against the same list.
const hosts = new Set(['little.fooby.ch','fooby.ch','www.fooby.ch','migusto.migros.ch','swissmilk.ch','www.swissmilk.ch',
  'bettybossi.ch','www.bettybossi.ch','chefkoch.de','www.chefkoch.de']);
export function publisherUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw Error('source'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.has(url.hostname)) throw Error('source');
  url.hash = '';
  return url;
}
export async function readLimited(body, limit) {
  if (!body) throw Error('empty');
  const reader = body.getReader(), decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw Error('size'); }
      text += decoder.decode(value, {stream:true});
    }
  } finally { reader.releaseLock(); }
}
export async function fetchPage(input, fetcher = fetch) {
  let url = publisherUrl(input);
  const signal = AbortSignal.timeout(12000);
  for (let hop = 0; hop <= 4; hop++) {
    const res = await fetcher(url, {redirect:'manual', signal, headers:{Accept:'text/html'}});
    if ([301,302,303,307,308].includes(res.status)) {
      const location = res.headers.get('location');
      await res.body?.cancel();
      if (!location) throw Error('source');
      url = publisherUrl(new URL(location, url).href);
      continue;
    }
    if (!res.ok || !/text\/html|application\/xhtml\+xml/i.test(res.headers.get('content-type') || '')) {
      await res.body?.cancel();
      throw Error('page');
    }
    return {html:await readLimited(res.body, 4_000_000), source:url.href};
  }
  throw Error('page');
}
const typeIs = (node, name) => [node?.['@type']].flat().some(t => typeof t==='string' && t.split(/[/#]/).pop()===name);
function recipeNodes(value, found, refs, depth=0) {
  if (!value || typeof value!=='object' || depth>40) return;
  if (value['@id'] && Object.keys(value).length>1) refs.set(value['@id'],value);
  if (typeIs(value,'Recipe')) found.push(value);
  for (const child of Object.values(value)) recipeNodes(child,found,refs,depth+1);
}
const minutes = time => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(time||'');
  return m ? Number(m[1]||0)*60+Number(m[2]||0) : null;
};
function microdataRecipe(doc) {
  const root = doc.querySelector?.('[itemscope][itemtype$="/Recipe"]');
  if (!root) return null;
  const property = name => {
    const node = root.querySelector(`[itemprop~="${name}"]`);
    return node?.getAttribute('content') ?? node?.getAttribute('datetime') ?? node?.textContent ?? '';
  };
  const recipeIngredient = [...root.querySelectorAll('[itemprop~="recipeIngredient"]')]
    .filter(node => node.tagName !== 'TR' || node.querySelector('.Ingredient--amount'))
    .map(node => [...node.children].map(child => child.textContent.trim()).join(' ').replace(/\s+/g, ' ').trim());
  return {
    image: property('image'), name: property('name'), description: property('description'), recipeYield: property('recipeYield'),
    prepTime: property('prepTime'), cookTime: property('cookTime'), totalTime: property('totalTime'),
    recipeIngredient,
    recipeInstructions: [...root.querySelectorAll('[itemprop~="recipeInstructions"]')]
      .map(node => (node.querySelector('[itemprop~="text"]') ?? node).textContent.trim())
  };
}
export function extractRecipe(doc, plain) {
  const found=[], refs=new Map();
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { recipeNodes(JSON.parse(script.textContent),found,refs); } catch { /* another block can still contain Recipe */ }
  }
  const r=found.find(node=>node.name && node.recipeIngredient) || found[0] || microdataRecipe(doc);
  if (!r) throw Error('no_recipe');
  function steps(obj, depth=0) {
    if (depth>20 || !obj) return [];
    if (typeof obj==='string') return plain(obj).split(/\n+/).map(s=>s.trim()).filter(Boolean);
    if (Array.isArray(obj)) return obj.flatMap(x=>steps(x,depth+1));
    if (obj['@id'] && Object.keys(obj).length===1) return steps(refs.get(obj['@id']),depth+1);
    return steps(obj.itemListElement || obj.text || obj.name || obj.item,depth+1);
  }
  const items=Array.isArray(r.recipeIngredient)?r.recipeIngredient:[r.recipeIngredient];
  const yieldText=[r.recipeYield].flat().map(x=>String(x?.value??x??'')).join(' ');
  const range=/\d\s*(?:[-–—/]|bis|to)\s*\d/i.test(yieldText);
  const servings=range?null:yieldText.trim().match(/^(\d+)\s*$/) || yieldText.match(/\b(\d+)\s*(?:Portion|Person|serving)/i);
  const prepMinutes=minutes(r.prepTime), cookMinutes=minutes(r.cookTime);
  const imageValue=[r.image].flat()[0];
  const candidate=typeof imageValue==='string'?imageValue:imageValue?.url||imageValue?.contentUrl;
  let image='';
  try {const url=new URL(candidate);if(url.protocol==='https:'&&!url.username&&!url.password)image=url.href;}catch{}
  return {image,title:plain(r.name||''),description:plain(r.description||''),baseServings:servings?Number(servings[1]):null,
    prepMinutes,cookMinutes,totalMinutes:minutes(r.totalTime),
    lines:items.map(x=>typeof x==='string'?plain(x):[x?.value,x?.unitText,x?.name].filter(Boolean).join(' ')).filter(Boolean),
    steps:steps(r.recipeInstructions)};
}
