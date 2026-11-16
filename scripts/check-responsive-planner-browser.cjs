// Maintained entry point: V15 replaced swipe-to-day with swipe-to-meal,
// V17 kept day view on rotation, M4 replaced the V1 storage contract.
// Run their current behavioral suites instead of asserting the removed UI.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['v15-browser.mjs','issue15-browser.mjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,'../tests',file)],{
  stdio:'inherit',env:{...process.env,BASE_URL:process.env.BASE_URL||'http://127.0.0.1:8765'}
 });
 if(result.status!==0)process.exit(result.status||1);
}
