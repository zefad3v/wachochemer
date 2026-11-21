import {strict as assert} from 'node:assert';
import {handleRecipeImport} from '../supabase/functions/recipe-import/handler.ts';
Deno.test('Import checks access first, bounds AI cost, keeps the API key server side, and only returns a draft', async()=>{
  const originalFetch=globalThis.fetch;
  const env={SUPABASE_URL:'https://project.example',SUPABASE_ANON_KEY:'test-public',OPENAI_API_KEY:'test-only',OPENAI_RECIPE_MODEL:'test-model'};
  const previous=Object.fromEntries(Object.keys(env).map(k=>[k,Deno.env.get(k)]));
  const uuid='30000000-0000-4000-8000-000000000001';
  const post=(mode:string,text='',url='')=>handleRecipeImport(new Request('https://edge.example',{method:'POST',
    headers:{Authorization:'Bearer fixture'},body:JSON.stringify({mode,text,url,householdId:uuid})}));
  let expectedModel='test-model';
  let access=200, calls:string[]=[];
  const dish={title:'Salat',description:'',baseServings:2,prepMinutes:5,cookMinutes:0,lines:['1 EL Öl'],steps:['Mischen.']};
  try {
    for(const [k,v] of Object.entries(env))Deno.env.set(k,v);
    globalThis.fetch=async(input,options)=>{
      const url=String(input);calls.push(url);
      if(url.startsWith(env.SUPABASE_URL))return Response.json(true,{status:access});
      if(url.startsWith('https://fooby.ch/')){
        assert.equal(new Headers(options?.headers).has('authorization'),false);
        return new Response('<html><body><script type="application/ld+json">'+JSON.stringify({'@type':'Recipe',name:'Suppe',recipeIngredient:['1 l Wasser'],recipeInstructions:'Kochen.'})+'</script></body></html>',{headers:{'content-type':'text/html'}});
      }
      assert.equal(url,'https://api.openai.com/v1/responses');
      const payload=JSON.parse(String(options?.body));
      assert.equal(payload.store,false); assert.equal(payload.text.format.strict,true);
      assert.equal(payload.input,'Kopierter Rezepttext'); assert.equal(payload.model,expectedModel);
      assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer test-only');
      return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(dish)}]}]});
    };
    access=403;assert.equal((await post('ai','Kopierter Rezepttext')).status,403);assert.equal(calls.length,1);
    access=200;calls=[];
    const ordinary=await post('link','','https://fooby.ch/suppe');
    assert.equal((await ordinary.json()).draft.title,'Suppe');assert.equal(calls.length,2);
    const result=await post('ai','Kopierter Rezepttext');
    assert.deepEqual((await result.json()).draft,{...dish,image:''});
    Deno.env.delete('OPENAI_RECIPE_MODEL');
    expectedModel='gpt-6-luna';
    assert.equal((await post('ai','Kopierter Rezepttext')).status,200);
    access=429;assert.equal((await post('ai','Kopierter Rezepttext')).status,429);
    access=200;Deno.env.delete('OPENAI_API_KEY');
    assert.equal((await (await post('ai','Kopierter Rezepttext')).json()).code,'ai_setup');
  } finally {
    globalThis.fetch=originalFetch;
    for(const [key,value] of Object.entries(previous))if(value===undefined)Deno.env.delete(key);else Deno.env.set(key,value);
  }
});
