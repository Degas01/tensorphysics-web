// Generated from TensorPhysics Software/actuatorfit/results/panda/results.json
// (ActuatorFit v0.1.0, run 2026-11-10 23:54, MuJoCo 3.10.0). Do not edit by hand: re-export from a new results.json.
// Margins: one per factor, same order as `factors`; null = did not fail within 5x the plausible range.
// Datasheet values are vendor claims (REPORTED); every result is model-based (INFERENCE).

export const panda = {
  "meta": {
    "mujoco": "3.10.0",
    "elapsed_s": 115.0,
    "sims": 291,
    "date": "2026-11-10 23:54",
    "actuators": 48,
    "excluded": 4
  },
  "factors": [
    {
      "key": "friction",
      "label": "Joint friction",
      "top": "+10% of joint peak torque as friction"
    },
    {
      "key": "armature",
      "label": "Rotor inertia (armature)",
      "top": "x2.00 rotor inertia (armature)"
    },
    {
      "key": "damping",
      "label": "Viscous damping",
      "top": "x3.00 viscous damping"
    },
    {
      "key": "payload",
      "label": "Payload mass",
      "top": "+25% payload mass"
    },
    {
      "key": "link_mass",
      "label": "Link mass and inertia",
      "top": "+10% link mass and inertia"
    },
    {
      "key": "torque_short",
      "label": "Available torque",
      "top": "-15% available torque"
    },
    {
      "key": "voltage",
      "label": "Bus voltage",
      "top": "-10% bus voltage"
    },
    {
      "key": "thermal",
      "label": "Continuous torque (thermal)",
      "top": "-20% continuous torque (thermal)"
    }
  ],
  "tasks": [
    {
      "key": "T1",
      "title": "Pick-and-place, 3 kg, 3 cycles"
    },
    {
      "key": "T2",
      "title": "Fast reach, 1 kg"
    },
    {
      "key": "T3",
      "title": "Extended hold, 3 kg, 5 s"
    }
  ],
  "combined": {
    "worstU": 0.933,
    "evals": 50,
    "passed": true
  },
  "checks": {
    "gravityErrPct": 2.0228771046566645e-14,
    "idWorstPct": 0.03661817377565556
  },
  "joints": [
    {
      "key": "joint1",
      "label": "J1 · base",
      "demand": {
        "peak_tau": 18.03,
        "rms_tau": 8.75,
        "peak_w": 2.06
      },
      "nFit": 23,
      "nFitMargin": 16,
      "recommended": {
        "id": "cm_ak60_39_v3",
        "name": "CubeMars AK60-39 V3.0 KV80",
        "mass_kg": 0.75,
        "price_usd": null,
        "u": 0.365,
        "u_corner": 0.686,
        "breaks_first": "thermal",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          null,
          null,
          null,
          4.162,
          null,
          3.097
        ]
      },
      "lightest": {
        "id": "ma_x4_36",
        "name": "MyActuator RMD-X4-P36-36 (V4)",
        "mass_kg": 0.36,
        "price_usd": null,
        "u": 0.833,
        "u_corner": 1.568,
        "breaks_first": "thermal",
        "fits_with_margin": false,
        "margins": [
          3.083,
          null,
          2.132,
          3.776,
          2.654,
          1.103,
          null,
          0.83
        ]
      }
    },
    {
      "key": "joint2",
      "label": "J2 · shoulder",
      "demand": {
        "peak_tau": 72.78,
        "rms_tau": 67.05,
        "peak_w": 0.94
      },
      "nFit": 2,
      "nFitMargin": 1,
      "recommended": {
        "id": "ma_x15_450",
        "name": "MyActuator RMD-X15-450 (V4)",
        "mass_kg": 3.6,
        "price_usd": null,
        "u": 0.462,
        "u_corner": 0.754,
        "breaks_first": "thermal",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          null,
          null,
          null,
          3.505,
          null,
          2.595
        ]
      },
      "lightest": {
        "id": "ma_x12_320",
        "name": "MyActuator RMD-X12-P20-320 (V4)",
        "mass_kg": 2.6,
        "price_usd": null,
        "u": 0.789,
        "u_corner": 1.287,
        "breaks_first": "thermal",
        "fits_with_margin": false,
        "margins": [
          null,
          null,
          null,
          3.252,
          3.972,
          1.401,
          null,
          1.05
        ]
      }
    },
    {
      "key": "joint3",
      "label": "J3 · upper arm",
      "demand": {
        "peak_tau": 16.58,
        "rms_tau": 6.25,
        "peak_w": 1.12
      },
      "nFit": 29,
      "nFitMargin": 18,
      "recommended": {
        "id": "rs_10p",
        "name": "RobStride 10P",
        "mass_kg": 0.46,
        "price_usd": null,
        "u": 0.446,
        "u_corner": 0.818,
        "breaks_first": "thermal",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          null,
          null,
          null,
          3.621,
          null,
          2.69
        ]
      },
      "lightest": {
        "id": "cm_ak45_36_v3",
        "name": "CubeMars AK45-36 V3.0 KV80",
        "mass_kg": 0.349,
        "price_usd": null,
        "u": 0.781,
        "u_corner": 1.432,
        "breaks_first": "thermal",
        "fits_with_margin": false,
        "margins": [
          2.818,
          null,
          2.96,
          3.701,
          3.684,
          1.457,
          null,
          1.086
        ]
      }
    },
    {
      "key": "joint4",
      "label": "J4 · elbow",
      "demand": {
        "peak_tau": 34.3,
        "rms_tau": 32.12,
        "peak_w": 1.07
      },
      "nFit": 9,
      "nFitMargin": 3,
      "recommended": {
        "id": "ma_x12_320",
        "name": "MyActuator RMD-X12-P20-320 (V4)",
        "mass_kg": 2.6,
        "price_usd": null,
        "u": 0.378,
        "u_corner": 0.675,
        "breaks_first": "thermal",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          null,
          null,
          null,
          4.098,
          null,
          3.059
        ]
      },
      "lightest": {
        "id": "cm_ak80_64",
        "name": "CubeMars AK80-64 KV80",
        "mass_kg": 0.85,
        "price_usd": 889.9,
        "u": 0.669,
        "u_corner": 1.196,
        "breaks_first": "thermal",
        "fits_with_margin": false,
        "margins": [
          null,
          null,
          null,
          4.631,
          null,
          2.17,
          null,
          1.639
        ]
      }
    },
    {
      "key": "joint5",
      "label": "J5 · wrist 1",
      "demand": {
        "peak_tau": 4.64,
        "rms_tau": 1.68,
        "peak_w": 2.25
      },
      "nFit": 43,
      "nFitMargin": 29,
      "recommended": {
        "id": "cm_ak45_36_v3",
        "name": "CubeMars AK45-36 V3.0 KV80",
        "mass_kg": 0.349,
        "price_usd": null,
        "u": 0.413,
        "u_corner": 0.841,
        "breaks_first": "damping",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          2.338,
          null,
          null,
          4.576,
          null,
          3.903
        ]
      },
      "lightest": {
        "id": "ma_x2_7",
        "name": "MyActuator RMD-X2-7 (V4)",
        "mass_kg": 0.17,
        "price_usd": null,
        "u": 0.733,
        "u_corner": 2.485,
        "breaks_first": "damping",
        "fits_with_margin": false,
        "margins": [
          2.372,
          2.84,
          0.416,
          null,
          null,
          1.77,
          null,
          1.622
        ]
      }
    },
    {
      "key": "joint6",
      "label": "J6 · wrist 2",
      "demand": {
        "peak_tau": 4.99,
        "rms_tau": 4.27,
        "peak_w": 1.18
      },
      "nFit": 32,
      "nFitMargin": 26,
      "recommended": {
        "id": "cm_ak45_36_v3",
        "name": "CubeMars AK45-36 V3.0 KV80",
        "mass_kg": 0.349,
        "price_usd": null,
        "u": 0.534,
        "u_corner": 0.933,
        "breaks_first": "thermal",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          null,
          null,
          null,
          3.081,
          null,
          2.248
        ]
      },
      "lightest": {
        "id": "rs_00",
        "name": "RobStride RS00",
        "mass_kg": 0.31,
        "price_usd": null,
        "u": 0.854,
        "u_corner": 1.493,
        "breaks_first": "thermal",
        "fits_with_margin": false,
        "margins": [
          null,
          null,
          3.047,
          1.135,
          4.324,
          0.971,
          null,
          0.728
        ]
      }
    },
    {
      "key": "joint7",
      "label": "J7 · flange",
      "demand": {
        "peak_tau": 2.55,
        "rms_tau": 0.9,
        "peak_w": 2.41
      },
      "nFit": 47,
      "nFitMargin": 32,
      "recommended": {
        "id": "rs_00",
        "name": "RobStride RS00",
        "mass_kg": 0.31,
        "price_usd": null,
        "u": 0.196,
        "u_corner": 0.817,
        "breaks_first": "damping",
        "fits_with_margin": true,
        "margins": [
          null,
          null,
          2.209,
          null,
          null,
          null,
          null,
          4.001
        ]
      },
      "lightest": {
        "id": "ma_x2_7",
        "name": "MyActuator RMD-X2-7 (V4)",
        "mass_kg": 0.17,
        "price_usd": null,
        "u": 0.416,
        "u_corner": 1.635,
        "breaks_first": "damping",
        "fits_with_margin": false,
        "margins": [
          null,
          null,
          0.757,
          null,
          null,
          3.859,
          null,
          3.114
        ]
      }
    }
  ]
} as const;

export type PandaJoint = (typeof panda.joints)[number];
