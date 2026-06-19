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
const HANDLER_SCALE = "scale";
const HANDLER_SCALE_ROOT = "scaleroot";
const HANDLER_SCALE_CLASS = "scaleclass";
const HANDLER_ENABLE = "enable";
const HANDLER_ENABLE_X = "enableX";
const HANDLER_QUANTIZE_X = "quantize";
const HANDLER_QUANTIZE_X_HOLD = "quantizeHold";
const HANDLER_ENABLE_Y = "enableY";
const HANDLER_CC_Y = "ccY";
const HANDLER_ENABLE_Z = "enableZ";
const HANDLER_GRID_WIDTH = "gridWidth";
const HANDLER_ROW_OFFSET = "rowOffset";
const HANDLER_START_OCTAVE = "startOctave";
const HANDLER_PB_RANGE = "pbRange";
const HANDLER_MODE = "mode";
const HANDLER_BOTTOM_ROW = "bottomRow"
const HANDLER_PRINT_PITCH_MAP = "printPitchMap";
const HANDLER_DEBUG = "debug";

// Max X position values for the 2 different grid widths for common LinnStruments
const MAX_X_POSITION_16_COL = 2741;
const MAX_X_POSITION_25_COL = 4265;

const HOLD_TIMER_MS = 200;

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

class Voice {
    constructor(channel, row, column, velocity) {
        this.channel = channel;
        this.row = row;
        this.sourceColumn = column; // Column that triggered the note on
        this.currentColumn = column; // Column the user is currently pressing
        this.velocity = velocity; // Velocity of the note, between 0 and 127, used for matching when sliding
        // Raw X value from MIDI, 14-bit combining MSB and LSB
        // (between 0 and MAX_X_POSITION_16_COL or MAX_X_POSITION_25_COL depending on grid width)
        // X movement fields
        this.rawX = 0;
        this.initialX = -1;
        this.lastActualX = -1;
        this.quantizationOffsetX = 0;
        this.rateX = 0;
        this.rateCount = 1;
        this.lastTimestamp = performance.now();
        this.pitchBend = 64; // Rescaled rawX after pitch bend calculation between 0 - 127
        this.y = 0; // Between 0 - 127
        this.z = 0; // Between 0 - 127
    }
}

var state = {
    isEnabled: true,
    isXEnabled: false,
    isXQuantizeEnabled: false,
    isXQuantizeHoldEnabled: false,
    isYEnabled: false,
    isZEnabled: false,
    gridWidth: 16,
    rowOffset: 4,
    startOctave: 1,
    pbRangeOctaves: 2.0, // octaves
    ccY: 74, // MIDI CC used for Y data
    mode: "regular", // or "alternating"
    bottomRowActive: false,
    currentScale: "c_diatonic",
    pitchMap: [],
    voices: new Map(), // Map of MPE channel to Voice object
    playedNotes: new Map(), // Map of currently active pitches to the cells that represent them
    messageState: MessageState.NORMAL,
    transitioningColumn: 0 // Used when message state is EXPECT_NOTE_ON to signify the originating column for the slide
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

Max.addHandler(HANDLER_QUANTIZE_X, (v) => {
    state.isXQuantizeEnabled = v ? 1 : 0;
    Max.post("X-axis quantize: " + state.isXQuantizeEnabled + "\n");
});

Max.addHandler(HANDLER_QUANTIZE_X_HOLD, (v) => {
    state.isXQuantizeHoldEnabled = v ? 1 : 0;
    Max.post("X-axis quantize hold: " + state.isXQuantizeHoldEnabled + "\n");
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

Max.addHandler(HANDLER_CC_Y, (v) => {
    state.ccY = v;
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

Max.addHandler(HANDLER_BOTTOM_ROW, (v) => {
    if (state.bottomRowActive !== v) {
        state.bottomRowActive = v;
        if (state.isEnabled) {
            updatePitchMap();
        }
    }
});

Max.addHandler(HANDLER_SCALE, (v) => {
    handleAdjacentScaleChange(v);
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
    // Clear message state if there's no voices left
    if (state.voices.size === 0) {
        state.messageState = MessageState.NORMAL;
    }
    //Max.post("Note event - row: " + row + ", column: " + column +  ", velocity: " + velocity + "\n");
    if (state.messageState == MessageState.NORMAL) {
        if (row >= 8 || column >= state.gridWidth) return;
        let mappedPitchEntry = state.pitchMap[row][column];

        // Note on/off behavior
        if (mappedPitchEntry.scale == state.currentScale) {
            // TODO: fix note on/off logic
            handleNoteOnOff(row, column, velocity);
        } else if (mappedPitchEntry.scale !== state.currentScale && velocity == 0) {
            handleAdjacentScaleChange(mappedPitchEntry.scale);
        }
    } else if (state.messageState == MessageState.EXPECT_NOTE_ON) {
        var voice = findVoice(row, state.transitioningColumn);
        if (voice != null) {
            voice.currentColumn = column;
            let centerX = (voice.sourceColumn + 0.5) / state.gridWidth;
            voice.initialX = centerX; // Reset center strike to actual center of source column
            //Max.post("Slide on channel: " + voice.channel + " to column: " + column + " on row: " + row + "\n");
            state.messageState = MessageState.EXPECT_NOTE_OFF;
        }
    } else if (state.messageState == MessageState.EXPECT_NOTE_OFF) {
        //Max.post("Received note off for row: " + row + " and column: " + column + " and velocity: " + velocity + "\n");
        state.messageState = MessageState.NORMAL;
    }
});

Max.addHandler(HANDLER_MIDI_POLY_PRESSURE, (note, value, channel) => {
    // Polyphonic Pressure        Z data,       Note Number: Column,  Channel: Row,      Data: Per Cell Z Position
    var row = channel - 1;
    var column = note - 1;
    var voice = findVoice(row, column);
    if (voice != null) {
        voice.z = value;
        // Send Z value
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, voice.channel);
        Max.outlet(HANDLER_MIDI_AFTERTOUCH, voice.z);
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
        //Max.post("Updated Z position for channel: " + voice.channel + " -> " + value + "\n");
    } else {
        Max.post("No active voice found for row: " + row + " and column: " + column + "\n");
    }
});

Max.addHandler(HANDLER_MIDI_CC, (ccNum, ccValue, channel) => {
    if (state.isXEnabled) {
        var row = channel - 1;
        if (row < 0 || row > 7) { return; } // Invalid row, ignore message
        if (ccNum <= 25 || (ccNum >= 32 && ccNum <= 57)) {
            // CC 0-25  CC Number:    Column,  Channel: Row,      Data: Global X Position MSB
            // CC 32-57 CC Number-32: Column,  Channel: Row,      Data: Global X Position LSB
            var column = (ccNum <= 25 ? ccNum : ccNum - 32) - 1; // Subtract one to skip settings column
            var voice = findVoice(row, column);
            if (voice == null) {
                Max.post("No active voice found for row: " + row + " and column: " + column + "\n");
                return;
            }
            var xPosition = voice.rawX;
            if (ccNum <= 25) {
                // MSB comes in second
                xPosition = (ccValue << 7) | (xPosition & 0x7F);
                // Calculate pitch bend around the voice's source column
                let sourceXNorm = (voice.sourceColumn + 0.5) / state.gridWidth;
                let curXNorm = xPosition / (state.gridWidth == 16 ? MAX_X_POSITION_16_COL : MAX_X_POSITION_25_COL);
                //Max.post("curX: " + curXNorm);
                // If this is the initial strike, set the initialX and lastActualX
                if (voice.initialX === -1) {
                    voice.initialX = curXNorm;
                    voice.lastActualX = curXNorm;
                }

                curXNorm = calculateQuantizedX(voice, curXNorm);
                voice.pitchBend = calculatePitchBend(curXNorm, sourceXNorm, voice.row);

                // Send pitch bend MIDI message
                Max.outlet(HANDLER_MPE_CHANNEL_GATE, voice.channel);
                Max.outlet(HANDLER_MIDI_PITCH_BEND, voice.pitchBend);
                Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
                //Max.post("Updated Pitch Bend for channel: " + voice.channel + " -> " + pbValue + "\n");
            } else {
                // LSB comes in first
                xPosition = ccValue;
            }
            voice.rawX = xPosition;
        } else if (ccNum == 119) {
            // CC 119                                                           Channel: Row,      Data: Transitioning Column
            //  - After CC 119 Note On    Target Cell,  Note Number: Column,    Channel: Row,  Velocity: First Slide Cell's Velocity
            // - After CC 119 Note Off   Source Cell,  Note Number: Column,     Channel: Row,  Velocity: Slide Target Column
            // Transitioning column, can be used to update the source column for the voice when sliding between columns
            //Max.post("Got cell transition for row: " + row + " from column: " + (ccValue - 1) + "\n");
            state.messageState = MessageState.EXPECT_NOTE_ON;
            state.transitioningColumn = ccValue - 1;
        }
    } else if (state.isYEnabled && ccNum >= 64 && ccNum <= 89) {
        var row = channel - 1;
        var column = ccNum - 64 - 1; // Subtract 1 to skip settings column
        var voice = findVoice(row, column);
        if (voice == null) {
            Max.post("No active voice found for row: " + row + " and column: " + column + "\n");
            return;
        }
        voice.y = ccValue;
        // Send Y value
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, voice.channel);
        Max.outlet(HANDLER_MIDI_CC, state.ccY, voice.y);
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0);
       //Max.post("Updated Y position for channel: " + voice.channel + " -> " + voice.y + "\n");
    }
    // Z data comes in through poly pressure, not here
});

Max.addHandler(HANDLER_PB_RANGE, (value) => {
    state.pbRangeOctaves = value / 12;
});

function findVoice(row, column) {
    // Find the voice that matches the given row and column, return null if not found
    for (let voice of state.voices.values()) {
        if (voice.row === row && voice.currentColumn === column) {
            return voice;
        }
    }
    return null;
}

function handleNoteOnOff(row, column, velocity) {
    let actualColumn = column;
    var voice = findVoice(row, column);
    if (voice != null && voice.sourceColumn !== column && velocity == 0) {
        // Send note off for source column instead of current one
        //Max.post("Note off for column: " + voice.sourceColumn + " on row: " + row + "\n");
        actualColumn = voice.sourceColumn;
    } else if (velocity > 0) {
        // Create new voice for note on
        if (voice != null) {
            Max.post("Unexpected.. there's an active voice already here.");
            return;
        }
        // Find next available channel for new voice
        var newChannel = 1;
        while (state.voices.has(newChannel) && newChannel < 8) {
            newChannel++;
        }
        voice = new Voice(newChannel, row, column, velocity);
        Max.post("Creating new voice for channel: " + voice.channel + " with row: " + voice.row + " , column: " + voice.currentColumn + " and velocity: " + voice.velocity + "\n");
        state.voices.set(newChannel, voice);
    }

    // Send MPE message
    let note = state.pitchMap[row][actualColumn].pitch;
    //Max.post("Note " + (velocity > 0 ? "On: " : "Off: ") + note + "\n");
    if (voice != null) {
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, voice.channel); // Open MPE gate
        Max.outlet(HANDLER_MIDI_NOTE, note, velocity); // Send note message
        Max.outlet(HANDLER_MPE_CHANNEL_GATE, 0); // Close MPE gate

        if (velocity == 0) {
            // Note off, remove voice
            Max.post("Deleting voice for channel: " + voice.channel + "\n");
            state.voices.delete(voice.channel);
        }
    }

    let cellsForPitch = getCellsForPitch(note);
    if (velocity > 0) {
        state.playedNotes.set(note, cellsForPitch);
        updatePlayedCellsForPitch(note, true);
    } else {
        updatePlayedCellsForPitch(note, false);
        state.playedNotes.delete(note);
    }
}

/**
 * Calculates the exact quantized X position for a voice based on LinnStrument code mechanics.
 * 
 * @param {Object} voice - The per-voice state state tracker.
 * @param {number} actualX - The X coordinate detected this frame.
 * @returns {number} The expression X coordinate used directly for generating pitch output.
 */
function calculateQuantizedX(
    voice,
    actualX
) {
    // Tunable parameters
    const SNAP_DEADBAND = 0.01; // Deadband for quantizing
    const SPEED_THRESHOLD = 0.003; // coordinate units
    const HOLD_TIME = 0.15;        // seconds to fully snap
    const RELEASE_TIME = 0.05;     // seconds to fully release

    let centerX = (voice.currentColumn + 0.5) / state.gridWidth;

    // INITIAL QUANTIZE COMPUTE
    if (state.isXQuantizeEnabled) {
        // Measure absolute distance from where the note originally struck
        const distanceFromStrike = Math.abs(actualX - voice.initialX);

        if (distanceFromStrike < SNAP_DEADBAND) {
            // Finger remains inside the lock zone: force output precisely to center
            // Offset tracks how far the user is pulling away from perfect center mapping
            voice.quantizationOffsetX = actualX - centerX;
        }
        //Max.post("distance: " + distanceFromStrike.toFixed(3) + ", in?: " + (distanceFromStrike < SNAP_DEADBAND));
    }

    // QUANTIZE HOLD COMPUTE
    if (state.isXQuantizeHoldEnabled) {
        // Compute dt
        const nowTs = performance.now();
        const dt = Math.max(0.001, (nowTs - voice.lastTimestamp) / 1000.0);
        voice.lastTimestamp = nowTs;

        const deltaX = Math.abs(actualX - voice.lastActualX);
        voice.lastActualX = actualX;

        // 5-sample equivalent exponential smoothing
        const tau = 5.0 / 200.0; // ~5 samples at ~200 Hz LinnStrument scan rate
        const k = 1 - Math.exp(-dt / tau);
        voice.rateX += (deltaX - voice.rateX) * k;
        //Max.post("rateX: " + voice.rateX);
        //Max.outlet(HANDLER_DEBUG, voice.rateX);

        // Update stability
        if (voice.rateX <= SPEED_THRESHOLD) {
            voice.rateCount = Math.min(1, voice.rateCount + dt / HOLD_TIME);
        } else {
            voice.rateCount = Math.max(0, voice.rateCount - dt / RELEASE_TIME);
        }
        //Max.post("rateCount: " + voice.rateCount);
        //Max.outlet(HANDLER_DEBUG, voice.rateCount);

        // Blend between actual and quantized positions
        const alpha = 1 - voice.rateCount;
        const actualPosition = actualX - voice.quantizationOffsetX;
        const ret = alpha * actualPosition + (1 - alpha) * centerX;

        //Max.post("ret: " + ret);

        // Return early with quantized X here
        return ret;
    }

    // Absolute position tracking minus the active quantization correction profile offset
    return actualX - voice.quantizationOffsetX;
}

/**
 * Calculates pitch bend given the current X and source X (both normalized), taking
 * into account irregular spacing of semitones between cells due to scales.
 * 
 * @param {number} curX - The current X coordinate detected this frame.
 * @param {number} sourceX - The starting X coordinate of the drag.
 * @param {number} row - The row this X movement is applied on.
 * @returns {number} The pitch bend value between 0 and 127.
 */
function calculatePitchBend(curX, sourceX, row) {
    // Calculate the distance between the current and source positions
    const sourceSemitones = interpolatePitchArray(state.pitchMap[row], sourceX * state.gridWidth);
    const curSemitones = interpolatePitchArray(state.pitchMap[row], curX * state.gridWidth);
    const dxSemitones = curSemitones - sourceSemitones;

    // Finally, map the limited distanceNorm to a pitch bend value between 0 and 127, where 64 is centered (no pitch bend)
    let pbValue = Math.round((dxSemitones / (state.pbRangeOctaves * 12)) * 64) + 64;
    pbValue = Math.min(127, Math.max(0, pbValue)); // Clamp to MIDI range
    Max.outlet(HANDLER_DEBUG, pbValue);
    //Max.post("pitch bend: " + pbValue);
    return pbValue;
}

function interpolatePitchArray(arr, index) {
    // Shift so that n + 0.5 lands exactly on arr[n].
    index -= 0.5;

    if (index <= 0)
        return arr[0].pitch;

    if (index >= arr.length - 1)
        return arr[arr.length - 1].pitch;

    const i = Math.floor(index);
    const t = index - i;

    return arr[i].pitch + (arr[i + 1].pitch - arr[i].pitch) * t;
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
        Max.outlet(HANDLER_SCALE_ROOT, root);
        Max.outlet(HANDLER_SCALE_CLASS, scaleClass);
    }
}

function updatePitchMap() {
    if (state.mode === "regular") {
        state.pitchMap = Utils.getPitchMapRegular(state.currentScale, state.gridWidth, state.rowOffset, state.startOctave, state.bottomRowActive);
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
                if (state.bottomRowActive && row === 0) {
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