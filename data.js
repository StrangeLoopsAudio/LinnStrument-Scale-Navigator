// LinnStrument color values (0-6)
// 0: Red, 1: Yellow, 2: Green, 3: Cyan, 4: Blue, 5: Magenta, 6: White

const scaleClassColors = {
    "acoustic": 2,           // Yellow
    "diatonic": 3,           // Green
    "harmonic_major": 4,     // Cyan
    "harmonic_minor": 5      // Blue
};

const scales = {
    "a_acoustic": {
        "root": 9,
        "adjacent_scales": [
            "e_diatonic",
            "e_harmonic_minor",
            "d_diatonic",
            "b_harmonic_major"
        ],
        "pitch_classes": [
            1,
            3,
            4,
            6,
            7,
            9,
            11
        ],
        "scale_class": "acoustic"
    },
    "a_diatonic": {
        "root": 9,
        "adjacent_scales": [
            "e_diatonic",
            "fs_harmonic_minor",
            "d_acoustic",
            "d_diatonic",
            "a_harmonic_major",
            "e_acoustic"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            6,
            8,
            9,
            11
        ],
        "scale_class": "diatonic"
    },
    "a_harmonic_major": {
        "root": 9,
        "adjacent_scales": [
            "a_diatonic",
            "fs_harmonic_minor",
            "g_acoustic",
            "a_harmonic_minor"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            5,
            8,
            9,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "a_harmonic_minor": {
        "root": 9,
        "adjacent_scales": [
            "c_diatonic",
            "a_harmonic_major",
            "d_acoustic",
            "c_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            5,
            8,
            9,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "as_acoustic": {
        "root": 10,
        "adjacent_scales": [
            "f_diatonic",
            "f_harmonic_minor",
            "ds_diatonic",
            "c_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            5,
            7,
            8,
            10
        ],
        "scale_class": "acoustic"
    },
    "as_diatonic": {
        "root": 10,
        "adjacent_scales": [
            "f_diatonic",
            "g_harmonic_minor",
            "ds_acoustic",
            "ds_diatonic",
            "as_harmonic_major",
            "f_acoustic"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            7,
            9,
            10
        ],
        "scale_class": "diatonic"
    },
    "as_harmonic_major": {
        "root": 10,
        "adjacent_scales": [
            "as_diatonic",
            "g_harmonic_minor",
            "gs_acoustic",
            "as_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            6,
            9,
            10
        ],
        "scale_class": "harmonic_major"
    },
    "as_harmonic_minor": {
        "root": 10,
        "adjacent_scales": [
            "cs_diatonic",
            "as_harmonic_major",
            "ds_acoustic",
            "cs_harmonic_major"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            5,
            6,
            9,
            10
        ],
        "scale_class": "harmonic_minor"
    },
    "b_acoustic": {
        "root": 11,
        "adjacent_scales": [
            "fs_diatonic",
            "fs_harmonic_minor",
            "e_diatonic",
            "cs_harmonic_major"
        ],
        "pitch_classes": [
            1,
            3,
            5,
            6,
            8,
            9,
            11
        ],
        "scale_class": "acoustic"
    },
    "b_diatonic": {
        "root": 11,
        "adjacent_scales": [
            "fs_diatonic",
            "gs_harmonic_minor",
            "e_acoustic",
            "e_diatonic",
            "b_harmonic_major",
            "fs_acoustic"
        ],
        "pitch_classes": [
            1,
            3,
            4,
            6,
            8,
            10,
            11
        ],
        "scale_class": "diatonic"
    },
    "b_harmonic_major": {
        "root": 11,
        "adjacent_scales": [
            "b_diatonic",
            "gs_harmonic_minor",
            "a_acoustic",
            "b_harmonic_minor"
        ],
        "pitch_classes": [
            1,
            3,
            4,
            6,
            7,
            10,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "b_harmonic_minor": {
        "root": 11,
        "adjacent_scales": [
            "d_diatonic",
            "b_harmonic_major",
            "e_acoustic",
            "d_harmonic_major"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            6,
            7,
            10,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "c_acoustic": {
        "root": 0,
        "adjacent_scales": [
            "g_diatonic",
            "g_harmonic_minor",
            "f_diatonic",
            "d_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            6,
            7,
            9,
            10
        ],
        "scale_class": "acoustic"
    },
    "c_diatonic": {
        "root": 0,
        "adjacent_scales": [
            "g_diatonic",
            "a_harmonic_minor",
            "f_acoustic",
            "f_diatonic",
            "c_harmonic_major",
            "g_acoustic"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            5,
            7,
            9,
            11
        ],
        "scale_class": "diatonic"
    },
    "c_harmonic_major": {
        "root": 0,
        "adjacent_scales": [
            "c_diatonic",
            "a_harmonic_minor",
            "as_acoustic",
            "c_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            5,
            7,
            8,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "c_harmonic_minor": {
        "root": 0,
        "adjacent_scales": [
            "ds_diatonic",
            "c_harmonic_major",
            "f_acoustic",
            "ds_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            7,
            8,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "cs_acoustic": {
        "root": 1,
        "adjacent_scales": [
            "gs_diatonic",
            "gs_harmonic_minor",
            "fs_diatonic",
            "ds_harmonic_major"
        ],
        "pitch_classes": [
            1,
            3,
            5,
            7,
            8,
            10,
            11
        ],
        "scale_class": "acoustic"
    },
    "cs_diatonic": {
        "root": 1,
        "adjacent_scales": [
            "gs_diatonic",
            "as_harmonic_minor",
            "fs_acoustic",
            "fs_diatonic",
            "cs_harmonic_major",
            "gs_acoustic"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            5,
            6,
            8,
            10
        ],
        "scale_class": "diatonic"
    },
    "cs_harmonic_major": {
        "root": 1,
        "adjacent_scales": [
            "cs_diatonic",
            "as_harmonic_minor",
            "b_acoustic",
            "cs_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            5,
            6,
            8,
            9
        ],
        "scale_class": "harmonic_major"
    },
    "cs_harmonic_minor": {
        "root": 1,
        "adjacent_scales": [
            "e_diatonic",
            "cs_harmonic_major",
            "fs_acoustic",
            "e_harmonic_major"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            4,
            6,
            8,
            9
        ],
        "scale_class": "harmonic_minor"
    },
    "d_acoustic": {
        "root": 2,
        "adjacent_scales": [
            "a_diatonic",
            "a_harmonic_minor",
            "g_diatonic",
            "e_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            6,
            8,
            9,
            11
        ],
        "scale_class": "acoustic"
    },
    "d_diatonic": {
        "root": 2,
        "adjacent_scales": [
            "a_diatonic",
            "b_harmonic_minor",
            "g_acoustic",
            "g_diatonic",
            "d_harmonic_major",
            "a_acoustic"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            6,
            7,
            9,
            11
        ],
        "scale_class": "diatonic"
    },
    "d_harmonic_major": {
        "root": 2,
        "adjacent_scales": [
            "d_diatonic",
            "b_harmonic_minor",
            "c_acoustic",
            "d_harmonic_minor"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            6,
            7,
            9,
            10
        ],
        "scale_class": "harmonic_major"
    },
    "d_harmonic_minor": {
        "root": 2,
        "adjacent_scales": [
            "f_diatonic",
            "d_harmonic_major",
            "g_acoustic",
            "f_harmonic_major"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            5,
            7,
            9,
            10
        ],
        "scale_class": "harmonic_minor"
    },
    "ds_acoustic": {
        "root": 3,
        "adjacent_scales": [
            "as_diatonic",
            "as_harmonic_minor",
            "gs_diatonic",
            "f_harmonic_major"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            5,
            7,
            9,
            10
        ],
        "scale_class": "acoustic"
    },
    "ds_diatonic": {
        "root": 3,
        "adjacent_scales": [
            "as_diatonic",
            "c_harmonic_minor",
            "gs_acoustic",
            "gs_diatonic",
            "ds_harmonic_major",
            "as_acoustic"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            7,
            8,
            10
        ],
        "scale_class": "diatonic"
    },
    "ds_harmonic_major": {
        "root": 3,
        "adjacent_scales": [
            "ds_diatonic",
            "c_harmonic_minor",
            "cs_acoustic",
            "ds_harmonic_minor"
        ],
        "pitch_classes": [
            2,
            3,
            5,
            7,
            8,
            10,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "ds_harmonic_minor": {
        "root": 3,
        "adjacent_scales": [
            "fs_diatonic",
            "ds_harmonic_major",
            "gs_acoustic",
            "fs_harmonic_major"
        ],
        "pitch_classes": [
            2,
            3,
            5,
            6,
            8,
            10,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "e_acoustic": {
        "root": 4,
        "adjacent_scales": [
            "b_diatonic",
            "b_harmonic_minor",
            "a_diatonic",
            "fs_harmonic_major"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            6,
            8,
            10,
            11
        ],
        "scale_class": "acoustic"
    },
    "e_diatonic": {
        "root": 4,
        "adjacent_scales": [
            "b_diatonic",
            "cs_harmonic_minor",
            "a_acoustic",
            "a_diatonic",
            "e_harmonic_major",
            "b_acoustic"
        ],
        "pitch_classes": [
            1,
            3,
            4,
            6,
            8,
            9,
            11
        ],
        "scale_class": "diatonic"
    },
    "e_harmonic_major": {
        "root": 4,
        "adjacent_scales": [
            "e_diatonic",
            "cs_harmonic_minor",
            "d_acoustic",
            "e_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            3,
            4,
            6,
            8,
            9,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "e_harmonic_minor": {
        "root": 4,
        "adjacent_scales": [
            "g_diatonic",
            "e_harmonic_major",
            "a_acoustic",
            "g_harmonic_major"
        ],
        "pitch_classes": [
            0,
            3,
            4,
            6,
            7,
            9,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "f_acoustic": {
        "root": 5,
        "adjacent_scales": [
            "c_diatonic",
            "c_harmonic_minor",
            "as_diatonic",
            "g_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            7,
            9,
            11
        ],
        "scale_class": "acoustic"
    },
    "f_diatonic": {
        "root": 5,
        "adjacent_scales": [
            "c_diatonic",
            "d_harmonic_minor",
            "as_acoustic",
            "as_diatonic",
            "f_harmonic_major",
            "c_acoustic"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            5,
            7,
            9,
            10
        ],
        "scale_class": "diatonic"
    },
    "f_harmonic_major": {
        "root": 5,
        "adjacent_scales": [
            "f_diatonic",
            "d_harmonic_minor",
            "ds_acoustic",
            "f_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            1,
            4,
            5,
            7,
            9,
            10
        ],
        "scale_class": "harmonic_major"
    },
    "f_harmonic_minor": {
        "root": 5,
        "adjacent_scales": [
            "gs_diatonic",
            "f_harmonic_major",
            "as_acoustic",
            "gs_harmonic_major"
        ],
        "pitch_classes": [
            0,
            1,
            4,
            5,
            7,
            8,
            10
        ],
        "scale_class": "harmonic_minor"
    },
    "fs_acoustic": {
        "root": 6,
        "adjacent_scales": [
            "cs_diatonic",
            "cs_harmonic_minor",
            "b_diatonic",
            "gs_harmonic_major"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            4,
            6,
            8,
            10
        ],
        "scale_class": "acoustic"
    },
    "fs_diatonic": {
        "root": 6,
        "adjacent_scales": [
            "cs_diatonic",
            "ds_harmonic_minor",
            "b_acoustic",
            "b_diatonic",
            "fs_harmonic_major",
            "cs_acoustic"
        ],
        "pitch_classes": [
            1,
            3,
            5,
            6,
            8,
            10,
            11
        ],
        "scale_class": "diatonic"
    },
    "fs_harmonic_major": {
        "root": 6,
        "adjacent_scales": [
            "fs_diatonic",
            "ds_harmonic_minor",
            "e_acoustic",
            "fs_harmonic_minor"
        ],
        "pitch_classes": [
            1,
            2,
            5,
            6,
            8,
            10,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "fs_harmonic_minor": {
        "root": 6,
        "adjacent_scales": [
            "a_diatonic",
            "fs_harmonic_major",
            "b_acoustic",
            "a_harmonic_major"
        ],
        "pitch_classes": [
            1,
            2,
            5,
            6,
            8,
            9,
            11
        ],
        "scale_class": "harmonic_minor"
    },
    "g_acoustic": {
        "root": 7,
        "adjacent_scales": [
            "d_diatonic",
            "d_harmonic_minor",
            "c_diatonic",
            "a_harmonic_major"
        ],
        "pitch_classes": [
            1,
            2,
            4,
            5,
            7,
            9,
            11
        ],
        "scale_class": "acoustic"
    },
    "g_diatonic": {
        "root": 7,
        "adjacent_scales": [
            "d_diatonic",
            "e_harmonic_minor",
            "c_acoustic",
            "c_diatonic",
            "g_harmonic_major",
            "d_acoustic"
        ],
        "pitch_classes": [
            0,
            2,
            4,
            6,
            7,
            9,
            11
        ],
        "scale_class": "diatonic"
    },
    "g_harmonic_major": {
        "root": 7,
        "adjacent_scales": [
            "g_diatonic",
            "e_harmonic_minor",
            "f_acoustic",
            "g_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            6,
            7,
            9,
            11
        ],
        "scale_class": "harmonic_major"
    },
    "g_harmonic_minor": {
        "root": 7,
        "adjacent_scales": [
            "as_diatonic",
            "g_harmonic_major",
            "c_acoustic",
            "as_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            6,
            7,
            9,
            10
        ],
        "scale_class": "harmonic_minor"
    },
    "gs_acoustic": {
        "root": 8,
        "adjacent_scales": [
            "ds_diatonic",
            "ds_harmonic_minor",
            "cs_diatonic",
            "as_harmonic_major"
        ],
        "pitch_classes": [
            0,
            2,
            3,
            5,
            6,
            8,
            10
        ],
        "scale_class": "acoustic"
    },
    "gs_diatonic": {
        "root": 8,
        "adjacent_scales": [
            "ds_diatonic",
            "f_harmonic_minor",
            "cs_acoustic",
            "cs_diatonic",
            "gs_harmonic_major",
            "ds_acoustic"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            5,
            7,
            8,
            10
        ],
        "scale_class": "diatonic"
    },
    "gs_harmonic_major": {
        "root": 8,
        "adjacent_scales": [
            "gs_diatonic",
            "f_harmonic_minor",
            "fs_acoustic",
            "gs_harmonic_minor"
        ],
        "pitch_classes": [
            0,
            1,
            3,
            4,
            7,
            8,
            10
        ],
        "scale_class": "harmonic_major"
    },
    "gs_harmonic_minor": {
        "root": 8,
        "adjacent_scales": [
            "b_diatonic",
            "gs_harmonic_major",
            "cs_acoustic",
            "b_harmonic_major"
        ],
        "pitch_classes": [
            1,
            3,
            4,
            7,
            8,
            10,
            11
        ],
        "scale_class": "harmonic_minor"
    }
};

module.exports = {
    scales,
    scaleClassColors
};