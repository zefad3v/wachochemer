// Decimal input comes from the device's keyboard locale.
// Store canonical JS numbers, and show a dot in editable fields (de-CH).
export function parseDecimal(value){
 if(typeof value==="number")return Number.isFinite(value)?value:NaN;
 const text=String(value??"").trim();
 if(!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))return NaN;
 return Number(text.replace(",","."));
}
export function decimalText(value){return typeof value==="number"&&Number.isFinite(value)?String(value):""}
