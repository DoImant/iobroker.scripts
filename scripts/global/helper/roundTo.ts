//
// Rounds a number to "place" digits after the decimal point
//
function roundTo(n:any, place:any) {  
    let decimals = 10**place; 
    return (Math.round((n + Number.EPSILON) * decimals) / decimals);
}