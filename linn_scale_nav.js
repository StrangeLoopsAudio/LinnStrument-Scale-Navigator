const Max = require('max-api');
const Data = require("./data.js");
const Utils = require("./utils.js");

// Output messages from script
const HANDLER_NRPN_PARAMETER_NUMBER = "NRPN_param";
const HANDLER_NRPN_CHANNEL = "NRPN_channel"; // any valid MIDI channel may be used for NRPN 245
const HANDLER_NRPN_VALUE = "NRPN_value";
const HANDLER_MIDI_NOTE = "midinote";
const HANDLER_MIDI_POLY_PRESSURE = "midipoly";
const HANDLER_MIDI_CC = "midicc";
const HANDLER_MIDI_PITCH_BEND = "midipitchbend";
const HANDLER_MIDI_AFTERTOUCH = "midiaftertouch";
const HANDLER_MIDI_CHANNEL = "midichannel"; // Used for configuration messages to the LinnStrument
const HANDLER_MPE_CHANNEL_GATE = "mpechannelgate"; // Used for note messages, needs to be reset to 0 to close gate after sending note messages
const HANDLER_SCALE_ROOT = "scaleroot";
const HANDLER_SCALE_CLASS = "scaleclass";
const HANDLER_ENABLE = "enable";
const HANDLER_ENABLE_X = "enableX";
const HANDLER_ENABLE_Y = "enableY";
const HANDLER_ENABLE_Z = "enableZ";
const HANDLER_GRID_WIDTH = "gridWidth";
const HANDLER_ROW_OFFSET = "rowOffset";
const HANDLER_START_OCTAVE = "startOctave";
const HANDLER_PB_RANGE = "pbRange";
const HANDLER_MODE = "mode";
const HANDLER_PRINT_PITCH_MAP = "printPitchMap";

// Max X position values for the 2 different grid widths for common LinnStruments
const MAX_X_POSITION_16_COL = 2736;
const MAX_X_POSITION_25_COL = 4265;

const secondaryColorMap = new Map();
secondaryColorMap.set(0, 7); // no change -> off
secondaryColorMap.set(1, 10); // 1 semitone up -> lime
secondaryColorMap.set(2, 3); // 2 semitones up -> green
secondaryColorMap.set(-1, 11); // 1 semitone down -> pink
secondaryColorMap.set(-2, 1); // 2 semitones down -> red

// State used for the contract of cell transitions, determines how to interpret note on/off messages
const MessageState = Object.freeze({
    NORMAL: 0,
    EXPECT_NOTE_ON: 1,
    EXPECT_NOTE_OFF: 2
});

class RowVoice {
    constructor() {
        this.sourceColumn = 0; // Column that triggered the note on
        this.currentColumn = 0; // Column the user is currently pressing
        // Raw X value from MIDI, 14-bit combining MSB and LSB
        // (between 0 and MAX_X_POSITION_16_COL or MAX_X_POSITION_25_COL depending on grid width)
        this.rawX = 0;
        this.pitchBend = 64; // Rescaled rawX after pitch bend calculation between 0 - 127
        this.y = 0; // Between 0 - 127
        this.z = 0; // Between 0 - 127
    }
}

var state = {
    isEnabled: true,
    isXEnabled: false,
    isYEnabled: false,
    isZEnabled: false,
    gridWidth: 16,
    rowOffset: 4,
    startOctave: 1,
    pbRangeOctaves: 2, // octaves
    yCC: 1, // MIDI CC used for Y data
    mode: "regular", // or "alternating"
    currentScale: "c_diatonic",
    pitchMap: [],
    voices: Array.from({ length: 8 }, () => new RowVoice()), // Array of active voices, indexed by row (distinct instances)
    playedNotes: new Map(), // Map of currently active pitches to the cells that represent them
    messageState: MessageState.NORMAL
};

// Converts a tuple of (row, col) to a string key for use in maps
// Unused as of now
// const cellKey = (tuple) => tuple.join('|'); 

updatePitchMap();

// ----- Handlers for incoming messages from Max -----
Max.addHandler(HANDLER_ENABLE, (v) => {
    state.isEnabled = v ? 1 : 0;
    updateUserFirmwareMode();
});

Max.addHandler(HANDLER_ENABLE_X, (v) => {
    state.isXEnabled = v ? 1 : 0;
    // CC 9        Configure User Firmware X-axis row slide, the channel specifies the row (0: disable, 1: enable)
    // CC 10       Configure User Firmware X-axis data, the channel specifies the row, default is off (0: disable, 1: enable)
    Max.post("X-axis enable: " + state.isXEnabled + "\n");
    for (var row = 0; row < 8; row++) {
        Max.outlet(HANDLER_MIDI_CHANNEL, row + 1); // Send the row number as the value to specify which row is used for X-axis sliding when enabled, send 0 to disable
        Max.outlet(HANDLER_MIDI_CC, 9, state.isXEnabled); // Enables row slide
        Max.outlet(HANDLER_MIDI_CC, 10, state.isXEnabled); // Enables X data
    }
});

Max.addHandler(HANDLER_ENABLE_Y, (v) => {
    state.isYEnabled = v ? 1 : 0;
    // CC 11       Configure User Firmware Y-axis data, the channel specifies the row, default is off (0: disable, 1: enable)
    Max.post("Y-axis enable: " + state.isYEnabled + "\n");
    for (var row = 0; row < 8; row++) {
        Max.outlet(HANDLER_MIDI_CHANNEL, row + 1); // Send the row number as the value to specify which row is used for X-axis sliding when enabled, send 0 to disable
        Max.outlet(HANDLER_MIDI_CC, 11, state.isYEnabled); // Send the row number as the value to specify which row is used for X-axis sliding when enabled, send 0 to disable
    }
});

Max.addHandler(HANDLER_ENABLE_Z, (v) => {
    state.isZEnabled = v ? 1 : 0;
    // CC 12       Configure User Firmware Z-axis data, the channel specifies the row, default is off (0: disable, 1: enable)
    Max.post("Z-axis enable: " + state.isZEnabled + "\n");
        for (var row = 0; row < 8; row++) {
        Max.outlet(HANDLER_MIDI_CHANNEL, row + 1); // Send the row number as the value to specify which row is used for X-axis sliding when enabled, send 0 to disable
        Max.outlet(HANDLER_MIDI_CC, 12, state.isZEnabled); // Send the row number as the value to specify which row is used for X-axis sliding when enabled, send 0 to disable
    }
});

Max.addHandler(HANDLER_GRID_WIDTH, (v) => {
    var width = (v === 25) ? 25 : 16;
    if (state.gridWidth !== width) {
        state.gridWidth = width;
        if (state.isEnabled) {
            displayNotes();
        }
    }
});

Max.addHandler(HANDLER_ROW_OFFSET, (v) => {
    var offset = Math.max(0, Math.floor(v));
    if (state.rowOffset !== offset) {
        state.rowOffset = offset;
        if (state.isEnabled) {
            updatePitchMap();
        }
    }
});

Max.addHandler(HANDLER_START_OCTAVE, (v) => {
    var octave = Math.max(0, Math.floor(v));
    if (state.startOctave !== octave) {
        state.startOctave = octave;
        if (state.isEnabled) {
            updatePitchMap();
        }
    }
});

Max.addHandler(HANDLER_MODE, (newMode) => {
    Max.post("Mode message received: " + newMode + "\n");
    if (newMode === "regular" || newMode === "alternating") {
        state.mode = newMode;
        updatePitchMap();
    } else {
        Max.post("Invalid mode: " + state.mode + ". Mode must be 'regular' or 'alternating'.\n");
    }
});

Max.addHandler(HANDLER_SCALE_ROOT, (v) => {
    // Translate note name (e.g, C, A#) to scale name equivalent (e.g., c, as) and update currentScale while keeping the same scale class if possible
    var noteName = v.toLowerCase();
    // Replace # with s for sharp notes to match scale naming convention in Data.js
    noteName = noteName.replace("#", "s");
    // Replace scale root in currentScale with new note name, keeping the same scale class
    state.currentScale = state.currentScale.replace(/^[a-g]s?/, noteName);
    Max.post("Scale root updated: " + state.currentScale + "\n");
    updatePitchMap();
});

Max.addHandler(HANDLER_SCALE_CLASS, (...v) => {
    // v might come in as multiple arguments if the scale class has spaces (e.g., "harmonic minor"), so join them together
    // Update currentScale to the specified scale class while keeping the same root
    var scaleClass = v.join("_").toLowerCase();
    var root = state.currentScale.match(/^[a-g]s?/);
    state.currentScale = root + "_" + scaleClass;
    Max.post("Scale class updated: " + state.currentScale + "\n");
    updatePitchMap();
});

Max.addHandler(HANDLER_PRINT_PITCH_MAP, (msg) => {
    updatePitchMap();
    Max.post("Current pitch map for scale " + state.currentScale + " with gridWidth " + state.gridWidth + " and rowOffset " + state.rowOffset + ":\n");
    for (var row = state.pitchMap.length - 1; row >= 0; row--) {
        let pitches = state.pitchMap[row].map((entry) => entry.pitch);
        Max.post(pitches.join(", ") + "\n");
    }
});

Max.addHandler(HANDLER_MIDI_NOTE, (...args) => {
    // Args: note, velocity, channel
    let column = args[0] - 1;
    let velocity = args[1];
    let row = args[2] - 1;
    //Max.post("Note event - row: " + row + ", column: " + column +  ", velocity: " + velocity + "\n");
    if (state.messageState == MessageState.NORMAL) {
        let mappedPitchEntry = state.pitchMap[row][column];

        // Note on/off behavior
        if (mappedPitchEntry.scale == state.currentScale) {
            // TODO: fix note on/off logic
            handleNoteOnOff(row, column, velocity);
        } else if (mappedPitchEntry.scale !== state.currentScale && velocity == 0) {
            handleAdjacentScaleChange(mappedPitchEntry.scale);
        }
    } else if (state.messageState == MessageState.EXPECT_NOTE_ON) {
        state.voices[row].currentColumn = column;
        Max.post("Slide to column: " + column + " on row: " + row + "\n");
        state.messageState = MessageState.EXPECT_NOTE_OFF;
    } else if (state.messageState == MessageState.EXPECT_NOTE_OFF) {
        state.messageState = MessageState.NORMAL;
    }
});

Max.addHandler(HANDLER_MIDI_POLY_PRESSURE, (note, value, channel) => {
    // Polyphonic Pressure        Z data,       Note Number: Column,  Channel: Row,      Data: Per Cell Z Position
    var row = channel - 1;
    var column = note;
    if (state.voices[row].currentColumn === column) {
        state.voices[row].z = value;
        // Send Z value
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, row + 1);
        Max.outlet(HANDLER_MIDI_AFTERTOUCH, state.voices[row].z);
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
    }
    Max.post("Updated Z position for row: " + row + " -> " + value + "\n");
});

Max.addHandler(HANDLER_MIDI_CC, (ccNum, ccValue, channel) => {
    if (state.isXEnabled) {
        var row = channel - 1;
        if (row < 0 || row > 7) { return; } // Invalid row, ignore message
        if (ccNum <= 25 || (ccNum >= 32 && ccNum <= 57)) {
            // CC 0-25  CC Number:    Column,  Channel: Row,      Data: Global X Position MSB
            // CC 32-57 CC Number-32: Column,  Channel: Row,      Data: Global X Position LSB
            var column = ccNum <= 25 ? ccNum : ccNum - 32;
            state.voices[row].currentColumn = column;
            var xPosition = state.voices[row].rawX;
            if (ccNum <= 25) {
                // MSB comes in second
                xPosition = (ccValue << 7) | (xPosition & 0x7F);
                // Calculate pitch bend around the voice's source column
                let sourceXNorm = (state.voices[row].sourceColumn + 0.5) / state.gridWidth;
                let curXNorm = xPosition / (state.gridWidth == 16 ? MAX_X_POSITION_16_COL : MAX_X_POSITION_25_COL);
                // Map the X position to a pitch bend value between 0 and 127 based on distance from source column,
                // scaled by the configured pitch bend range in octaves (where 1 octave = 7 cells of distance)
                // First calculate the max distance in normalized X from the source column that corresponds to the configured pitch bend range in octaves
                let maxDistanceNorm = (state.pbRangeOctaves * 7) / state.gridWidth;
                // Then calculate the distance from the source column in normalized X
                let distanceNorm = curXNorm - sourceXNorm;
                // Limit the distanceNorm to the maxDistanceNorm
                if (distanceNorm > maxDistanceNorm) {
                    distanceNorm = maxDistanceNorm;
                } else if (distanceNorm < -maxDistanceNorm) {
                    distanceNorm = -maxDistanceNorm;
                }
                // Finally, map the limited distanceNorm to a pitch bend value between 0 and 127, where 64 is centered (no pitch bend)
                let pbValue = Math.round((distanceNorm / maxDistanceNorm) * 64) + 64;
                state.voices[row].pitchBend = pbValue;
                // Send pitch bend MIDI message
                Max.outlet(HANDLER_MPE_CHANNEL_GATE, row + 1);
                Max.outlet(HANDLER_MIDI_PITCH_BEND, state.voices[row].pitchBend);
                Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
                Max.post("Updated Pitch Bend for row: " + row + " -> " + pbValue + "\n");
            } else {
                // LSB comes in first
                xPosition = ccValue;
            }
            state.voices[row].rawX = xPosition;
        } else if (ccNum == 119) {
            // CC 119                                                           Channel: Row,      Data: Transitioning Column
            //  - After CC 119 Note On    Target Cell,  Note Number: Column,    Channel: Row,  Velocity: First Slide Cell's Velocity
            // - After CC 119 Note Off   Source Cell,  Note Number: Column,     Channel: Row,  Velocity: Slide Target Column
            // Transitioning column, can be used to update the source column for the voice when sliding between columns
            //Max.post("Got cell transition for row: " + row + " from column: " + (ccValue - 1) + "\n");
            state.messageState = MessageState.EXPECT_NOTE_ON;
        }
    } else if (state.isYEnabled && ccNum >= 64 && ccNum <= 89) {
        var row = channel - 1;
        var column = ccNum - 64;
        state.voices[row].y = ccValue;
        // Send Y value
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, row + 1);
        Max.outlet(HANDLER_MIDI_CC, 1, state.voices[row].y);
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
        Max.post("Updated Y position for row: " + row + " -> " + state.voices[row].y + "\n");
    }
    // Z data comes in through poly pressure, not here
});

Max.addHandler(HANDLER_PB_RANGE, (value) => {
    state.pbRangeOctaves = value / 12;
});

function handleNoteOnOff(row, column, velocity) {
    let actualColumn = column;
    if (state.voices[row].sourceColumn !== column && velocity == 0) {
        // Send note off for source column instead of current one
        //Max.post("Note off for column: " + state.voices[row].sourceColumn + " on row: " + row + "\n");
        actualColumn = state.voices[row].sourceColumn;
    } else if (velocity > 0) {
        state.voices[row].sourceColumn = column;
    }
    let note = state.pitchMap[row][actualColumn].pitch;
    Max.post("Note " + (velocity > 0 ? "On: " : "Off: ") + note + "\n");
    Max.outlet(HANDLER_MPE_CHANNEL_GATE, row + 1); // Open MPE gate
    Max.outlet(HANDLER_MIDI_NOTE, note, velocity); // Send note message
    Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0); // Close MPE gate
    let cellsForPitch = getCellsForPitch(note);
    if (velocity > 0) {
        state.playedNotes.set(note, cellsForPitch);
        updatePlayedCellsForPitch(note, true);
    } else {
        updatePlayedCellsForPitch(note, false);
        state.playedNotes.delete(note);
    }
}

function handleAdjacentScaleChange(newScaleName) {
    Max.post("Scale change: " + state.currentScale + " -> " + newScaleName + "\n");
    state.currentScale = newScaleName;
    updatePitchMap();
    // Post scaleRoot and scaleClass to output to update UI
    // Extract root and scale class from currentScale
    var match = state.currentScale.match(/^([a-g]s?)_(.+)$/);
    if (match) {
        var root = match[1].toUpperCase().replace("S", "#");
        // Capitalize first letter of each word in scale class and replace underscores with spaces
        var scaleClass = match[2].replace(/_/g, " ");
        scaleClass = scaleClass.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        Max.outlet(SCALE_ROOT, root);
        Max.outlet(SCALE_CLASS, scaleClass);
    }
}

function updatePitchMap() {
    if (state.mode === "regular") {
        state.pitchMap = Utils.getPitchMapRegular(state.currentScale, state.gridWidth, state.rowOffset, state.startOctave);
    } else if (state.mode === "alternating") {
        state.pitchMap = Utils.getPitchMapAlternating(state.currentScale, state.gridWidth, state.rowOffset, state.startOctave);
    }
    if (state.isEnabled) {
        displayNotes();
    }
}

function updateUserFirmwareMode()
{
	var channel = 1; // any valid MIDI channel may be used for NRPN 245
	var value = state.isEnabled ? 1 : 0;

	if (!state.isEnabled) {
		clearNotes();
	}

	// Send NRPN 245 through nrpnout-connected outlets in inlet order:
	// outlet 7 -> nrpnout inlet 1 (value)
	// outlet 8 -> nrpnout inlet 3 (parameter number)
	// outlet 9 -> nrpnout inlet 4 (MIDI channel)
	Max.outlet(HANDLER_NRPN_PARAMETER_NUMBER, 245);
	Max.outlet(HANDLER_NRPN_CHANNEL, channel);
	Max.outlet(HANDLER_NRPN_VALUE, value); // Send the value last to ensure the parameter number and channel are set before the value is sent
	if (state.isEnabled) {
		displayNotes();
	}
    Max.post("User firmware mode updated: " + (state.isEnabled ? "Enabled" : "Disabled") + "\n");
}

function updatePlayedCellsForPitch(pitch, isPlayed) {
    var cells = getCellsForPitch(pitch);
    var color = isPlayed ? 8 : 7; // White if played, off if not
    var scale = Data.scales[state.currentScale];
    var scaleColor = Data.scaleClassColors[scale.scale_class];
    if (scaleColor === undefined) scaleColor = 8; // default to white if not found
    var rootPitchClass = scale.root;
    if (!isPlayed && pitch % 12 === rootPitchClass) {
        color = scaleColor;
    }
    cells.forEach(([row, col]) => {
        Max.outlet(HANDLER_MIDI_CC, 20, col + 1); // Add 1 to avoid coloring the settings column
        Max.outlet(HANDLER_MIDI_CC, 21, row);
        Max.outlet(HANDLER_MIDI_CC, 22, color);
    });
}

function getCellsForPitch(pitch) {
    var cells = [];
    for (var row = 0; row < state.pitchMap.length; row++) {
        for (var col = 0; col < state.pitchMap[row].length; col++) {
            if (state.pitchMap[row][col].pitch === pitch) {
                cells.push([row, col]);
            }
        }
    }
    return cells;
}

function displayNotes()
{
    // Use the following CCs to light up cells (one triplet per column):
    // CC 20: Column coordinate for cell color change (0-25)
    // CC 21: Row coordinate for cell color change (0-7)
    // CC 22: Color value (0-11)

    function displayNotesRegular(rootPitchClass, scaleColor, offColor) {
        for (var row = 0; row < 8; row++) {
            for (var col = 0; col < state.gridWidth; col++) {
                var mapEntry = state.pitchMap[row][col];
                var color = offColor;
                if (row === 0) {
                    // Bottom row, color using the scale color
                    color = Data.scaleClassColors[Data.scales[mapEntry.scale].scale_class];
                } else {
                    if (mapEntry.pitch % 12 === rootPitchClass) {
                        color = scaleColor;
                    }
                }

                Max.outlet(HANDLER_MIDI_CC, 20, col + 1); // Add 1 to avoid coloring the settings column
                Max.outlet(HANDLER_MIDI_CC, 21, row);
                Max.outlet(HANDLER_MIDI_CC, 22, color);
            }
        }
    }
    function displayNotesAlternating(rootPitchClass, scaleColor, offColor) {
        for (var row = 0; row < 8; row++) {
            for (var col = 0; col < state.gridWidth; col++) {
                var pitch = state.pitchMap[row][col].pitch;
                var color = offColor;
                if (row % 2 === 0) {
                    // Primary row, only color root note
                    if (pitch % 12 === rootPitchClass) {
                        color = scaleColor;
                    }
                } else {
                    // Secondary row, color notes according to difference from primary row
                    var primaryPitch = state.pitchMap[row - 1][col].pitch;
                    color = secondaryColorMap.get(pitch - primaryPitch) || offColor;
                }

                Max.outlet(HANDLER_MIDI_CC, 20, col + 1); // Add 1 to avoid coloring the settings column
                Max.outlet(HANDLER_MIDI_CC, 21, row);
                Max.outlet(HANDLER_MIDI_CC, 22, color);
                if (col == 0 && row == 0) {
                    Max.post(color + "\n");
                }
            }
        }
    }
    var scale = Data.scales[state.currentScale];
    var scaleColor = Data.scaleClassColors[scale.scale_class];
    if (scaleColor === undefined) scaleColor = 8; // default to white if not found
    var rootPitchClass = scale.root;
    var offColor = 7;
    if (state.mode === "regular") {
        displayNotesRegular(rootPitchClass, scaleColor, offColor);
    } else if (state.mode === "alternating") {
        displayNotesAlternating(rootPitchClass, scaleColor, offColor);
    }
}

function clearNotes()
{
	// Set every cell to default color (0) using one triplet per column
	var defaultColor = 0;
	for (var row = 0; row <= 7; row++) {
		for (var col = 0; col <= state.gridWidth; col++) {
			Max.outlet(HANDLER_MIDI_CC, 20, col);
			Max.outlet(HANDLER_MIDI_CC, 21, row);
			Max.outlet(HANDLER_MIDI_CC, 22, defaultColor);
		}
	}
}