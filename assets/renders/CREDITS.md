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


## Landscape look v2 (2026-09-28): CC0 assets, USGS 3DEP (land_* scripts)

The landscape stills and film use real vegetation, ground textures and skies from **Poly Haven** (polyhaven.com),
all **CC0 1.0** (public domain dedication, no attribution required; credited here anyway). Files were fetched from
api.polyhaven.com / dl.polyhaven.org by site/tools/render/land_assets.py into site/tools/render/work/assets/ (not
published); every file's URL and size is in work/assets/downloads.json (237 files, 1262 MB in total). The
umbrella thorns (Vachellia tortilis) are reshaped from jacaranda_tree by land_assets_prep.py (flat crown on a low
fork); the far-distance tree LODs are thinned copies of the same models.

  - `island_tree_01` (model, 11 files, 79.9 MB): https://polyhaven.com/a/island_tree_01
  - `island_tree_02` (model, 11 files, 60.6 MB): https://polyhaven.com/a/island_tree_02
  - `island_tree_03` (model, 11 files, 94.3 MB): https://polyhaven.com/a/island_tree_03
  - `tree_small_02` (model, 11 files, 84.1 MB): https://polyhaven.com/a/tree_small_02
  - `jacaranda_tree` (model, 11 files, 213.2 MB): https://polyhaven.com/a/jacaranda_tree
  - `shrub_02` (model, 6 files, 2.9 MB): https://polyhaven.com/a/shrub_02
  - `shrub_04` (model, 6 files, 3.2 MB): https://polyhaven.com/a/shrub_04
  - `searsia_lucida` (model, 5 files, 23.3 MB): https://polyhaven.com/a/searsia_lucida
  - `searsia_burchellii` (model, 5 files, 45.5 MB): https://polyhaven.com/a/searsia_burchellii
  - `dead_tree_trunk_02` (model, 4 files, 9.6 MB): https://polyhaven.com/a/dead_tree_trunk_02
  - `dead_quiver_branch_01` (model, 4 files, 4.0 MB): https://polyhaven.com/a/dead_quiver_branch_01
  - `namaqualand_boulder_02` (model, 4 files, 10.4 MB): https://polyhaven.com/a/namaqualand_boulder_02
  - `namaqualand_boulder_04` (model, 4 files, 7.1 MB): https://polyhaven.com/a/namaqualand_boulder_04
  - `namaqualand_boulder_05` (model, 4 files, 7.5 MB): https://polyhaven.com/a/namaqualand_boulder_05
  - `namaqualand_rocks_01` (model, 5 files, 10.1 MB): https://polyhaven.com/a/namaqualand_rocks_01
  - `namaqualand_stones_01` (model, 5 files, 7.5 MB): https://polyhaven.com/a/namaqualand_stones_01
  - `wild_rooibos_bush` (model, 5 files, 4.3 MB): https://polyhaven.com/a/wild_rooibos_bush
  - `grass_medium_01` (model, 6 files, 8.0 MB): https://polyhaven.com/a/grass_medium_01
  - `grass_medium_02` (model, 6 files, 2.0 MB): https://polyhaven.com/a/grass_medium_02
  - `grass_bermuda_01` (model, 5 files, 2.7 MB): https://polyhaven.com/a/grass_bermuda_01
  - `flower_heliophila` (model, 6 files, 8.2 MB): https://polyhaven.com/a/flower_heliophila
  - `leafy_grass` (texture, 4 files, 59.1 MB): https://polyhaven.com/a/leafy_grass
  - `withered_grass` (texture, 4 files, 63.2 MB): https://polyhaven.com/a/withered_grass
  - `sparse_grass` (texture, 4 files, 13.7 MB): https://polyhaven.com/a/sparse_grass
  - `aerial_grass_rock` (texture, 4 files, 8.4 MB): https://polyhaven.com/a/aerial_grass_rock
  - `forrest_ground_01` (texture, 4 files, 2.8 MB): https://polyhaven.com/a/forrest_ground_01
  - `farm_soil` (texture, 4 files, 3.1 MB): https://polyhaven.com/a/farm_soil
  - `dirt` (texture, 4 files, 2.6 MB): https://polyhaven.com/a/dirt
  - `red_laterite_soil_stones` (texture, 4 files, 14.5 MB): https://polyhaven.com/a/red_laterite_soil_stones
  - `dry_ground_01` (texture, 4 files, 5.6 MB): https://polyhaven.com/a/dry_ground_01
  - `dirt_aerial_02` (texture, 4 files, 5.8 MB): https://polyhaven.com/a/dirt_aerial_02
  - `cracked_red_ground` (texture, 4 files, 2.8 MB): https://polyhaven.com/a/cracked_red_ground
  - `red_dirt_mud_01` (texture, 4 files, 3.0 MB): https://polyhaven.com/a/red_dirt_mud_01
  - `brown_mud` (texture, 4 files, 2.1 MB): https://polyhaven.com/a/brown_mud
  - `kloofendal_38d_partly_cloudy_puresky` (hdri, 2 files, 78.6 MB): https://polyhaven.com/a/kloofendal_38d_partly_cloudy_puresky
  - `kloofendal_28d_misty_puresky` (hdri, 1 files, 1.2 MB): https://polyhaven.com/a/kloofendal_28d_misty_puresky
  - `kloppenheim_05_puresky` (hdri, 1 files, 1.1 MB): https://polyhaven.com/a/kloppenheim_05_puresky
  - `farm_field_puresky` (hdri, 1 files, 1.3 MB): https://polyhaven.com/a/farm_field_puresky
  - `rustig_koppie_puresky` (hdri, 2 files, 54.6 MB): https://polyhaven.com/a/rustig_koppie_puresky
  - `rocky_ridge_puresky` (hdri, 1 files, 1.3 MB): https://polyhaven.com/a/rocky_ridge_puresky
  - `table_mountain_1_puresky` (hdri, 2 files, 70.2 MB): https://polyhaven.com/a/table_mountain_1_puresky
  - `table_mountain_2_puresky` (hdri, 2 files, 68.7 MB): https://polyhaven.com/a/table_mountain_2_puresky
  - `hilly_terrain_01_puresky` (hdri, 1 files, 1.2 MB): https://polyhaven.com/a/hilly_terrain_01_puresky
  - `qwantani_dusk_1_puresky` (hdri, 1 files, 1.0 MB): https://polyhaven.com/a/qwantani_dusk_1_puresky
  - `qwantani_dusk_2_puresky` (hdri, 2 files, 70.5 MB): https://polyhaven.com/a/qwantani_dusk_2_puresky
  - `belfast_sunset_puresky` (hdri, 1 files, 1.2 MB): https://polyhaven.com/a/belfast_sunset_puresky
  - `citrus_orchard_puresky` (hdri, 1 files, 1.3 MB): https://polyhaven.com/a/citrus_orchard_puresky
  - `evening_road_01_puresky` (hdri, 1 files, 1.3 MB): https://polyhaven.com/a/evening_road_01_puresky
  - `qwantani_sunset_puresky` (hdri, 1 files, 1.1 MB): https://polyhaven.com/a/qwantani_sunset_puresky
  - `wasteland_clouds_puresky` (hdri, 1 files, 1.2 MB): https://polyhaven.com/a/wasteland_clouds_puresky
  - `drackenstein_quarry_puresky` (hdri, 1 files, 1.3 MB): https://polyhaven.com/a/drackenstein_quarry_puresky
  - `syferfontein_18d_clear_puresky` (hdri, 1 files, 1.1 MB): https://polyhaven.com/a/syferfontein_18d_clear_puresky
  - `gravel_road` (texture, 4 files, 8.8 MB): https://polyhaven.com/a/gravel_road
  - `worn_corrugated_iron` (texture, 4 files, 10.7 MB): https://polyhaven.com/a/worn_corrugated_iron
  - `corrugated_iron_02` (texture, 4 files, 2.1 MB): https://polyhaven.com/a/corrugated_iron_02
  - `weathered_plank_siding` (texture, 4 files, 1.8 MB): https://polyhaven.com/a/weathered_plank_siding
  - `dandelion_01` (model, 6 files, 3.5 MB): https://polyhaven.com/a/dandelion_01
  - `shrub_sorrel_01` (model, 5 files, 2.1 MB): https://polyhaven.com/a/shrub_sorrel_01

The HDRI 1k files under hdri/probe were only used to measure sun positions and as the (blurred) lighting / haze
source. Skies: rustig_koppie (New Jersey), table_mountain_1 (Laikipia aerials), table_mountain_2 (Laikipia dawn);
kloofendal_38d_partly_cloudy and qwantani_dusk_2 8k were fetched as candidates and are not used in the final renders.

- **USGS 3DEP 1/3 arc-second (~10 m) seamless DTM** (bare-earth terrain of the New Jersey near field): U.S.
  Geological Survey, public domain. Microsoft Planetary Computer STAC collection `3dep-seamless`, tile n41w075
  (item n41w075-13), windowed read with an anonymous SAS token (logged in work/land/downloads.json). The far field
  keeps Copernicus GLO-30 (notice above).
- **NJ Office of GIS / NJGIN 2020 orthophotography** (natural colour + NIR, 1 ft; flown spring 2020): the fine
  structure (drill rows, tramlines, wheel ruts, soil texture) of the New Jersey farm in the aerial shots, used as a
  high-pass layer on the late-summer NAIP colour. Public, no account: s3://njogis-imagery/2020/cog/ (tiles H9A2,
  H9A3, H9A6, H9A7; windowed COG reads, 446 MB over two fetches, logged in work/land/downloads.json).
- **OpenStreetMap** buildings, roads / farm tracks and power lines around the farm (from the ground planner's
  Overpass cache): buildings extruded with hipped roofs, roads rasterised as asphalt / gravel ground masks, lattice
  towers and conductors. © OpenStreetMap contributors, ODbL 1.0.
- Micro-relief below the DEM resolution (swales, hedgerow banks and ditches, luggas, kopjes), the Laikipia trails,
  bomas, lugga sand beds, bushland / glade zones, the bush airstrip and twin-track road, the per-field crop states
  (stubble, ploughed, cover crop) and grass margins, the harvested-field passes and windrows, silos and grain bins,
  the dry-season grass sward, the gravel lane, pole barn and dust are procedural (land_data.py, land_look.py,
  land_sites.py); no vehicle model was used (no CC0 model held up).
