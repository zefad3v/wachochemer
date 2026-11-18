// A generated directory of recipe IDs and slugs, never duplicated recipe content.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRecipes} from '../src/domain/model.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
export function buildRecipeIndex(recipes,catalog){
 validateRecipes(recipes,catalog);
 return {
  schemaVersion:1,
  recipes:recipes.map(({id,slug})=>({id,slug})).sort((a,b)=>a.slug.localeCompare(b.slug,'de-CH'))
 };
}
export function buildFromFiles(base=root){
 const read=p=>JSON.parse(readFileSync(join(base,p),'utf8'));
 const names=readdirSync(join(base,'data/recipes')).filter(n=>n.endsWith('.json'));
 const recipes=names.map(n=>read('data/recipes/'+n));
 return buildRecipeIndex(recipes,read('data/ingredients.json'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const index=buildFromFiles();
 const dest=join(root,'data/recipe-index.json');
 writeFileSync(dest,JSON.stringify(index,null,2)+'\n');
 console.log('Generated recipe directory for '+index.recipes.length+' recipes.');
}
