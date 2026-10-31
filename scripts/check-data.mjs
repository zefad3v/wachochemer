import {readFileSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRecipes} from '../src/domain/model.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const names=readdirSync(join(root,'data/recipes')).filter(n=>n.endsWith('.json')).sort();
const summary=validateRecipes(names.map(n=>read('data/recipes/'+n)),read('data/ingredients.json'));
console.log('Validated '+summary.recipeCount+' recipes and '+summary.ingredientCount+' ingredients.');
