let coords = [1,2,3,4,5,6,7,8,9,10,11,12];
let bezierControlsSlice = [];
let bezierControlsIndex = [];

console.time( 'index' );

for (let i = 0; i <= coords.length - 6; i += 6) {
    const controlCoords = [ coords[i], coords[i+1], coords[i+4], coords[i+5], coords[i+2], coords[i+3] ];
    bezierControlsIndex.push( controlCoords );
}

console.timeEnd( 'index' );
console.log( bezierControlsIndex );

console.time( 'slice' );

for (let i = 0; i <= coords.length - 6; i += 6) {
    const controlCoords = [ ...coords.slice(i,i+2), ...coords.slice(i+4,i+6), ...coords.slice(i+2,i+4) ];
    bezierControlsSlice.push( controlCoords );
}

console.timeEnd( 'slice' );
console.log( bezierControlsSlice );

console.time( 'slice2' );
const startCoordsSlice = [ ...coords.slice( 2, 4 ), ...coords.slice( 0, 2 ) ];
console.timeEnd( 'slice2' );
console.log( startCoordsSlice );

console.time( 'index2' );
const startCoordsIndex = [ coords[2], coords[3], coords[0], coords[1] ];
console.timeEnd( 'index2' );
console.log( startCoordsIndex );

console.log( coords[coords.length-1] );



fArr = [1,2];
sArr = [3,4];
console.log( fArr.concat( sArr ) );
console.log( fArr );

fArr[3] = 4;
console.log( fArr ); 

nArr = [1,,3];
console.log( nArr[1] == null );
console.log( nArr[1] != null );

// What happens if you call null on a class/function (ideally nothing).
// Indeed nothing happens.
const myObj = function() {};
myObj.call( null );