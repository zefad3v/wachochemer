// Verified, owned recipe photos can later be assigned by stable recipe ID here.
export const recipeImages={};
// Presentation-only fixtures. Never copied into canonical recipes or saved plans.
export const demoImages={
 'kuerbissuppe-kaesetoast':{image:'./assets/demo/pumpkin-soup.webp',imageDemo:true}
};
export function imageFor(id,demo=false){
 if(recipeImages[id])return {image:recipeImages[id],imageDemo:false};
 return demo&&demoImages[id]?demoImages[id]:{image:null,imageDemo:false};
}
