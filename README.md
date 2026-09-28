# BLUEBIRD

Website for **BLUEBIRD**, a 1.8 m blended-wing survey drone for conservation and agriculture. An ordinary Android
phone is its onboard computer, and ArduPlane flies it. This is design, analysis and simulation work: the aircraft
has not been built or flown yet.

Live site: https://ar3116-sketch.github.io/bluebird/

- `index.html`, `style.css`, `main.js`: a static page. three.js is loaded from jsDelivr, and there is no build step.
- `tour.js`: the x-ray tour. After the flight sequence the skin turns transparent and the camera visits nine subsystems
  (`assets/bluebird_inside.glb`, meshed from the CAD).
- `method.js`: the Methodology panel. Each design decision has its trade-offs, numbers and figures.
- `assets/bluebird.glb`: the web model, exported from the FreeCAD design with the Rev C livery.
- `assets/bluebird_whitepaper.pdf`: the technical white paper (revision A).

Contact: Advaith Renjith, ar3116@scarletmail.rutgers.edu
