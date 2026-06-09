const Data = require("./data.js");
const Max = require('max-api');

function getAdjacentPitches(scaleName) {
    let scaleObj = Data.scales[scaleName];

    let primaryPitches = scaleObj.pitch_classes;
    let adjacentScales = scaleObj["adjacent_scales"].map((adjName) => Data.scales[adjName]);

    var adjacentPitches = [];
    for (var i = 0; i < primaryPitches.length; i++) {
        for (var j = 0; j < adjacentScales.length; j++) {
            let adjScalePitches = adjacentScales[j]["pitch_classes"];
            if (adjScalePitches[i] != primaryPitches[i]) {
                adjacentPitches.push({ pitch: adjScalePitches[i], scale: scaleObj["adjacent_scales"][j] });
                break;
            }
        }
        if (adjacentPitches.length <= i) {
            adjacentPitches.push({ pitch: primaryPitches[i], scale: scaleName });
        }
    }
    return adjacentPitches;
}

function getPrimaryRow(startScaleIdx, primaryPitches, gridWidth, startOctave, scaleName) {
    var row = [];
    let basePitch = (startOctave + 1) * 12;
    for (var col = 0; col < gridWidth; col++) {
        let octaveMult = Math.floor((startScaleIdx + col) / primaryPitches.length);
        let pitchClass = primaryPitches[(startScaleIdx + col) % primaryPitches.length];
        let entry = {
            pitch: basePitch + (octaveMult * 12) + pitchClass,
            scale: scaleName
        };
        row.push(entry);
    }
    return row;
}

function getSecondaryRow(index, adjacentPitches, gridWidth, startOctave) {
    var row = [];
    let basePitch = (startOctave + index + 1) * 12;
    for (var col = 0; col < gridWidth; col++) {
        let octaveMult = Math.floor(col / adjacentPitches.length);
        let pitchClass = adjacentPitches[col % adjacentPitches.length].pitch;
        let entry = {
            pitch: basePitch + (octaveMult * 12) + pitchClass,
            scale: adjacentPitches[col % adjacentPitches.length].scale
        };
        row.push(entry);
    }
    return row;
}

function getAdjacentScalesRow(scaleName, gridWidth) {
    let scaleObj = Data.scales[scaleName];
    let adjacentScales = scaleObj["adjacent_scales"].map((adjName) => Data.scales[adjName]);
    var row = [];
    var adjacentScaleIdx = 0;
    for (var col = 0; col < gridWidth; col++) {
        row.push({ pitch: 0, scale: scaleObj["adjacent_scales"][adjacentScaleIdx % adjacentScales.length] });
        adjacentScaleIdx++;
    }
    return row;
}

function getPitchMapRegular(scaleName, gridWidth, rowOffset, startOctave = 3) {
    let scaleObj = Data.scales[scaleName];
    let primaryPitches = scaleObj.pitch_classes;

    var pitchMap = [];
    var rowStartScaleIdx = 0;
    for (var row = 0; row < 8; row++) {
        if (row > 0) {
            pitchMap[row] = getPrimaryRow(rowStartScaleIdx, primaryPitches, gridWidth, startOctave, scaleName);
            rowStartScaleIdx = rowStartScaleIdx + rowOffset;
        } else {
            pitchMap[row] = getAdjacentScalesRow(scaleName, gridWidth);
        }
    }
    return pitchMap;
}

function getPitchMapAlternating(scaleName, gridWidth, rowOffset, startOctave = 3) {
    let scaleObj = Data.scales[scaleName];
    let primaryPitches = scaleObj.pitch_classes;
    let adjacentPitches = getAdjacentPitches(scaleName);

    var pitchMap = [];
    for (var row = 0; row < 8; row++) {
        if (row % 2 === 0) {
            pitchMap[row] = getPrimaryRow(row / 2, primaryPitches, gridWidth, startOctave, scaleName);
        } else {
            pitchMap[row] = getSecondaryRow((row - 1) / 2, adjacentPitches, gridWidth, startOctave);
        }
    }
    return pitchMap;
}

module.exports = {
    getPitchMapRegular,
    getPitchMapAlternating
};