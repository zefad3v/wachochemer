// Recipe illustrations generated for Wachochemer from the recipe ingredients.
export const recipeImages={
 'poulet-fajitas':'./assets/recipes/poulet-fajitas.webp',
 'kuerbissuppe-kaesetoast':'./assets/recipes/kuerbissuppe-kaesetoast.webp',
 'apfel-omeletten':'./assets/recipes/apfel-omeletten.webp'
};
const generatedIds=new Set(Object.keys(recipeImages));
export const demoImages={};
export function imageFor(id){
 return {image:recipeImages[id]||null,imageDemo:false,...(generatedIds.has(id)?{imageGenerated:true}:{})};
}
