//
// Rounds a number to "place" digits after the decimal point
//
function roundTo(n:number, place:number) {  
    let decimals = 10**place; 
    return (Math.round((n + Number.EPSILON) * decimals) / decimals);
}