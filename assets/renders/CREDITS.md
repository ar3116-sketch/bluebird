# Render credits

External data sources and licences used in site/assets/renders.

## Data figures (data_* scripts): card_planner, q_landing_sitl, q_tools

These are software outputs, not illustrations. No web map tiles were used; the maps are drawn from the ground
planner's own data cache (ground/data_cache), which was already on disk.

- **Copernicus DEM GLO-30** (hillshade in card_planner and q_landing_sitl): © DLR e.V. 2010–2014 and © Airbus
  Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA. AWS Open Data
  bucket `copernicus-dem-30m`.
- **ESA WorldCover 10 m 2021 v200** (land cover in card_planner and q_landing_sitl): © ESA WorldCover project 2021
  / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. CC BY 4.0. AWS Open
  Data bucket `esa-worldcover`.
- **OpenStreetMap** (roads, buildings, power lines, water in card_planner and q_landing_sitl): © OpenStreetMap
  contributors, ODbL 1.0, via the Overpass API.
- **ArduPilot** ArduPlane 4.7.1 SITL (q_landing_sitl, q_tools): GPLv3; the flight was simulated, not flown.
- **q_tools** tiles are project outputs made with FreeCAD (LGPL), SU2 (LGPL), CalculiX (GPL), AeroSandbox (MIT),
  ArduPilot SITL (GPLv3) and LaTeX; the white paper page is rendered with Apple PDFKit.
- **Font**: IBM Plex Mono, SIL Open Font License 1.1.

## Studio product renders (studio_* scripts): card_aircraft, card_phonebay, card_dolly, card_dolly_liftoff, q_exploded, q_phone_brain, q_breakdown, q_breakdown_case

Illustrations rendered in Blender 4.5 LTS (GPL) with Cycles. No external downloads: every model is the project's own
CAD (cad/, site/assets/bluebird*.glb, site/tools/_mesh) and the Rev C livery artwork (docs/livery/revC). The dolly
lift-off pose and trail come from the project's dolly simulation (cad/dolly/out/sim/design_trajectory.json). The
phone-screen UI and the battery label are drawn procedurally by site/tools/render/studio_textures.py.

- **Fonts** (burned into labels and the illustrative phone screen): IBM Plex Mono, SIL Open Font License 1.1 (local
  copy of the @fontsource latin subset); DejaVu Sans Mono for the arrow and ≈ glyphs (Bitstream Vera / DejaVu
  licence, bundled with matplotlib).

## Landscape renders and film (land_* scripts): use_conservation, use_conservation_laptop, use_agriculture, bluebird_film (+ poster, end frame)

Illustrations (renders, not photographs) made in Blender 4.5 LTS (GPL; Cycles for the stills, EEVEE for the film) from
the project's own CAD (site/assets/bluebird.glb + bluebird_rig.json, cad/dolly via FreeCAD), with procedural
vegetation, animals, people, props and materials. Terrain and imagery are real open data, read as windowed ranges of
Cloud-Optimised GeoTIFFs; every byte fetched is logged in site/tools/render/work/land/downloads.json.

- **Copernicus DEM GLO-30** (terrain of both sites): © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH
  2014–2018, provided under COPERNICUS by the European Union and ESA. AWS Open Data bucket `copernicus-dem-30m`,
  tiles N00_E036, N00_E037, S01_E036, S01_E037 (Laikipia) and N40_W075 (New Jersey).
- **Sentinel-2 L2A** true colour (Laikipia near/mid/far field; New Jersey far field): contains modified Copernicus
  Sentinel data 2025 (Laikipia, 2025-03-03) and 2022 (New Jersey, 2022-08-03). AWS Open Data bucket `sentinel-cogs`,
  found through the Earth Search STAC API (element84). The Laikipia dirt tracks were hand-digitised from this scene.
- **USDA NAIP 2022** 0.6 m (New Jersey near and mid field; the ground-station map in the film): USDA Farm Service
  Agency, public domain. Microsoft Planetary Computer STAC with an anonymous SAS token.
- **Ground planner output** (survey lines, landing sites and approaches in use_agriculture and the film): the project's
  own ground planner (ground/sparrow_ground, unmodified) run by land_plan.py on a farm polygon in Franklin
  Township, NJ; it used Copernicus GLO-30 and ESA WorldCover 10 m 2021 v200 windows (© ESA WorldCover project 2021 /
  contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium, CC BY 4.0) and
  OpenStreetMap obstacles from the planner's existing Overpass cache (© OpenStreetMap contributors, ODbL 1.0).
- **Fonts**: IBM Plex Mono (SIL OFL 1.1; local @fontsource copy for burned-in labels; Google Fonts in the headless
  Chrome screens) and Inter Tight (SIL OFL 1.1, Google Fonts) for the film title and the ground-station screens.
- **Ground-station screens in the film** are HTML pages drawn for the film in the site's style (land_ui.py): the
  planner map and the live-view layout follow the real planner output and core/video/LiveLayout.kt; the detection card
  with Confirm / Dismiss / Closer look is the planned workflow from the white paper (not built software).
- The Kenya scene uses a location in the Laikipia plateau for its terrain only; no affiliation with any conservancy
  is implied. Animals, the person and all vegetation are procedural stand-ins.
