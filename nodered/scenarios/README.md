# Scenario definitions

Scenario JSON files are source-controlled inputs to the Node-RED simulator.
They describe initial conditions and events; mutable run state belongs in
Node-RED context while a run is active.

## Coordinates and headings

- `origin.lat` and `origin.lon` are decimal degrees at the firebreak center.
- `offsetEastM` and `offsetNorthM` are local meters from that origin.
- Headings use navigation bearings: `0` is north and `90` is east.
- `windDirectionDeg` uses the meteorological "from" direction. A value of
  `270` means wind arriving from the west and moving toward the east.
- `firebreak.normalHeadingDeg` points from the approach side toward the crossed
  side. The firebreak occupies half its width on either side of the origin.

## Units and ranges

| Field | Unit or range |
| --- | --- |
| `tickSeconds`, `maxDurationSeconds` | seconds, greater than zero |
| east/north offsets and bounds | meters |
| `altitudeM` | meters |
| heading and wind direction | degrees in `[0, 360)` |
| `baseSpreadRateMps` | meters per second, nonnegative |
| `windSpeedMps` | meters per second, nonnegative |
| `baseFlameLengthM` | meters, nonnegative |
| `baseBurnTimeS` | seconds, nonnegative |
| `fuelFactor`, `qualityScore` | normalized value in `[0, 1]` |
| noise magnitudes | maximum absolute deviation in the field's unit |

## Run behavior

`scenario-engine.js` validates every definition before use. A run is identified
by its scenario key, simulator version, seed, run ID, and start time. The same
definition, seed, run ID, and start time produce the same telemetry sequence.

Scripted and manually triggered events use the same `events` entries. An event
is applied at most once per run. The current supported event type is
`wind_shift`, whose `changes` may set wind speed, wind direction, heading, and
spread multiplier.

The crossing outcome is independent of the Method 2 prediction. The engine
advances a fire-front point in local coordinates and computes a simple
physics-inspired intensity proxy from flame length, spread rate, wind, and
fuel. A front that reaches the near edge of the firebreak below the configured
threshold is contained. A sufficiently intense front may continue across and
is marked crossed after it reaches the far edge. A run that reaches its maximum
duration without crossing is marked contained.

This is a deterministic demonstration simulator, not a validated wildfire
forecast. Every emitted observation must remain labeled `simulated`.
