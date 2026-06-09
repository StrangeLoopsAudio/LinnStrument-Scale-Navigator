This project repurposes the Linnstrument's MPE grid to make a new pitch selection interface. 

For this project, only diatonic, acoustic, harmonic major, and harmonic minor scales are used because of their uniformity of all containing 7 pitches each.

This project utilizes the concept of the scale network, where all scales (e.g., C diatonic, G acoustic, etc.) have neighbors where each neighbor contains one note difference from the scale, with the rest being the same.

E.g., C diatonic contains the notes: C D E F G A B, while G acoustic contains C# D E F G A B. The root note of the scales may be different, but the pitches they contain are nearly the same.

The new pitch selection interface will let a user have one active scale at a time, where that scale's pitches will be positioned next to each other horizontally in primary rows, increasing the pitches and repeating the scale as it moves to the right so that one row will contain a bit over 2 octaves (assuming 16 columns for a Linnstrument 128 version). Above the primary row will be a secondary row, then another primary row, and so on.

Primary/Secondary Row Concept:
- Primary rows (0, 2, 4, 6) display the pitch class set of the selected scale as explained above, increasing towards the right.
- Secondary rows (1, 3, 5, 7) display the differing pitch class(es) from adjacent scales mapped to the nearest primary-column positions so players can dip into notes from adjacent scales while staying mostly in the primary scale.

How secondary rows are derived:
For a given current scale with pitch_classes = [p0, p1, ..., pN-1] and its list of adjacent_scales in data.js, each adjacent scale differs by typically one pitch class.
For each primary column (which represents a particular pitch class index in pitch_classes), the secondary row above it will show the pitch class from the adjacent scale that is the nearest chromatic neighbor to that primary pitch class (if present).

Example (C diatonic / G acoustic)
c_diatonic pitch classes: [0,2,4,5,7,9,11] (C major)
g_acoustic differs with: [1,2,4,5,7,9,11], so since the differing note is the 0th scale index (0->1), the note above the 0th scale index would represent pitch class 1 (C#).

- data.js contains the full scale adjacency graph plus scaleClassColors, so the app can compute adjacent-scale pitch differences and color cells by scale family.
- setup.js is the runtime glue: it sends NRPN 245 via nrpnout to toggle LinnStrument user firmware mode, and uses midiformat CC triplets (CC 20/21/22) to light individual cells.
- The interface supports runtime grid widths for both 16 and 25 columns, so it can work with Linnstrument 128 and Linnstrument 200 configurations.
- Primary rows remain the selected scale’s pitch-class set, while secondary rows show the nearest chromatic neighbor from adjacent scales.
- The rowOffset parameter determines the adjacent-scale index offset for each secondary row, with each row’s mapping built from the previous primary row’s starting scale index and assuming the first primary row starts at scale index 0 in its first column.
- The note-clear reset uses color 7 as the default clear/reset value.
- If two candidate secondary pitches are equally near, the system prefers the lower pitch.