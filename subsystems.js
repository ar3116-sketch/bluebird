// Navigation operates on whole aircraft systems; individual meshes are not pick targets.
export function createSubsystemFilter({ stage, stops, openInspection, isolateSubsystem }) {
  const panel = document.createElement("aside");
  panel.className = "subsystem-panel"; panel.hidden = true;
  panel.setAttribute("aria-label", "Subsystem filters");
  panel.innerHTML = `<h3>Explore the systems</h3>
    <label>Show only this subsystem<select aria-label="Show only this subsystem"><option value="">All subsystems</option></select></label>
    <p class="subsystem-summary" aria-live="polite">Choose a system to see how it fits into the aircraft.</p>
    <button type="button" data-show-all hidden>Show all systems</button>`;
  stage.append(panel);
  const filter = panel.querySelector("select");
  const summary = panel.querySelector(".subsystem-summary");
  const showAll = panel.querySelector("[data-show-all]");
  for (const stop of stops) {
    const option = document.createElement("option");
    option.value = stop.sys; option.textContent = stop.title; filter.append(option);
  }
  function update() {
    const stop = stops.find(s => s.sys === filter.value);
    summary.textContent = stop?.text ?? "Choose a system to see how it fits into the aircraft.";
    showAll.hidden = !stop;
  }
  function showSubsystem(sys) {
    if (sys && !stops.some(s => s.sys === sys)) return;
    openInspection(); filter.value = sys || "";
    isolateSubsystem(sys || null); update();
  }
  filter.addEventListener("change", () => showSubsystem(filter.value));
  showAll.addEventListener("click", () => showSubsystem(""));
  return {
    register(mesh, sys) {
      if (stops.some(s => s.sys === sys)) mesh.userData.subsystem = sys;
    },
    setActive(value) {
      panel.hidden = !value;
      if (!value) { filter.value = ""; update(); }
    },
    showSubsystem,
    get selectedSystem() { return filter.value || null; },
  };
}
