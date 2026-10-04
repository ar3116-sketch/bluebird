// X-ray tour: after the flight sequence the skin turns transparent and the camera visits each subsystem.
// sys = node prefix in assets/bluebird_inside.glb (x_<sys>_<part>). dir = camera direction from the subsystem centre
// (glTF frame: x right wing, y up, z aft). pose = what the moving parts do while the stop is in focus.
// Numbers are from the white paper (docs/whitepaper), which cites the repo file behind each one.
export const STOPS = [
  {
    sys: "structure", title: "Structure", dir: [0.2, 0.92, 0.33], color: 0xe9eef3, zoom: 0.78,
    text: "Carbon tubes carry the wing bending into a machined 7075 aluminium node on a printed keel. The outer wings are EPP foam under two layers of iron-on film. The belly landing, not flight, sizes all of it.",
    specs: [["Outer spar", "14×12 roll-wrapped carbon"], ["Wing joint", "12×8 joiner; wings slide off, 1 bolt + 1 plug each"], ["Design load", "84.5 N·m landing vs 31.2 N·m flight"]],
  },
  {
    sys: "controls", title: "Control surfaces", dir: [0.06, 0.3, 0.95], color: 0x8dc4e6, zoom: 0.8,
    text: "Each elevon is split into an upper and a lower half on one hinge, each with its own servo. Together they pitch and roll the aircraft; opened like a clamshell they become the crow airbrake that steepens the approach.",
    specs: [["Servos", "4 × EMAX ES08MD II, 2.4 kg·cm"], ["Travel", "±25° pitch/roll; crow 31° up / 19° down"], ["Crow limit", "15 m/s (servo torque)"]],
  },
  {
    sys: "compute", title: "Compute", dir: [0.35, 0.85, -0.4], color: 0x7cf2c9,
    text: "The flight controller flies; the phone thinks. ArduPlane on the Matek H743 owns stabilisation, navigation and every failsafe. The phone rides under the flip-forward hatch and runs the cameras, geotagging and landing-site logic on its own battery.",
    specs: [["Autopilot", "Matek H743-WING, ArduPlane 4.7"], ["Companion", "Android phone, 150–240 g, own battery"], ["Link", "MAVLink2 over USB-UART, 921,600 baud"]],
  },
  {
    sys: "sensors", title: "Sensors + payload", dir: [0.82, 0.02, -0.57], color: 0xc7a4ff, beams: true, zoom: 0.9,
    text: "Two cameras look straight down through windows behind the skid lip: a 12 MP colour camera for mapping and a thermal core for animals and people (their fields of view are drawn shortened; at 100 m the colour frame covers 149 × 118 m). GPS, an airspeed probe and a downward rangefinder for the flare complete the set.",
    specs: [["RGB", "12 MP, 3.9 cm/px at 100 m"], ["Thermal", "256 × 192 radiometric"], ["Navigation", "u-blox M10 GPS, pitot, TF-Luna"]],
  },
  {
    sys: "comms", title: "Comms", dir: [-0.2, 0.9, 0.3], color: 0xffb86b,
    text: "A 915 MHz telemetry radio links the autopilot to the ground station, with its antenna in the right fin, and a 2.4 GHz receiver carries the safety pilot's sticks. A live preview streams from the phone's own Wi-Fi to a ground antenna; the full-resolution survey photos come home on the phone.",
    specs: [["Telemetry", "SiK 915 MHz, 100 mW, ~2 km+"], ["Live view", "phone Wi-Fi: 720p + thermal, ~2 km (planned)"], ["RC link", "ExpressLRS 2.4 GHz; phone LTE off in flight"]],
  },
  {
    sys: "compliance", title: "Compliance", dir: [0.35, 0.9, 0.3], color: 0xff7a9a, minDist: 0.95,
    text: "A broadcast Remote ID module sits under the avionics cover. Every transmitter carries an FCC ID, and the app will not pass preflight until the phone is in airplane mode: 47 CFR 22.925 bars operating a cellular phone aboard an airborne aircraft.",
    specs: [["Remote ID", "Dronetag BS broadcast module"], ["Radios", "FCC-authorised, granted before Dec 2025"], ["Operations", "FAA Part 107, visual line of sight"]],
  },
  {
    sys: "power", title: "Power", dir: [-0.35, 0.85, -0.3], color: 0xffd54a,
    text: "A 4S2P Li-ion pack slides on a tray to trim the centre of gravity for each phone. The flight controller's switched rail powers the cameras only when needed, and every rail runs at or below 60 % of its rating.",
    specs: [["Pack", "Molicel P45B 4S2P, 129.6 Wh"], ["Usable", "103.7 Wh, 20 % kept in reserve"], ["Avionics", "9.3 W; ESC 40 A"]],
  },
  {
    sys: "propulsion", title: "Propulsion", dir: [0.55, 0.42, 0.72], color: 0xa9c1d6,
    text: "A centre pusher keeps the prop out of the cameras' view and away from the belly. The blades swing out by centrifugal force when the motor runs and fold back in the airflow when the braked motor stops.",
    specs: [["Motor", "T-Motor AT2814, 900 KV"], ["Prop", "11×7 folding, 23 N static"], ["Cruise", "L/D 11.7 at 14 m/s, ~58 km range"]],
  },
  {
    sys: "landing", title: "Launch + landing", dir: [0.82, -0.3, 0.35], color: 0x5fd3a0,
    text: "The aircraft lands on a deep, replaceable TPU skid sled that holds the landing load to 40 g. Printed cones in the belly seat it on the launch dolly, which it simply flies off at about 11.4 m/s.",
    specs: [["Skid", "TPU-95A sled, 40 g design load"], ["Touchdown", "13 m/s approach, ~1 m/s sink, 60 m sites"], ["Launch", "passive dolly or hand / bungee"]],
  },
];
