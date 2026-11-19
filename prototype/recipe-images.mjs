// Verified, owned recipe photos can later be assigned by stable recipe ID here.
export const recipeImages={};
// Kept as an empty export for older callers.
export const demoImages={};
export function imageFor(id){
 return {image:recipeImages[id]||null,imageDemo:false};
}
