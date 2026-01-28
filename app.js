/***********************  
 GLOBAL STATE  
************************/
let program = JSON.parse(localStorage.getItem("program")) || {
  currentWeek: 1,
  weeks: {},
  customHeaders: { h1: "", h2: "", h3: "", h4: "" }
};

let selectedWorkout = null;
let editState = { weekId: null, day: null };

const daySelect = document.getElementById("daySelect");
const upcoming = document.getElementById("upcoming");
const completed = document.getElementById("completed");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalTable = document.getElementById("modalTable");
const modalActions = document.querySelector(".modal-actions");

/***********************  
 INSPECTOR STATE  
************************/
let inspector = {
  weekId: null,
  day: null,
  index: null,
  row: null,
  intensity: "mid"
};

const exTitle = document.getElementById("exTitle");
const exSets = document.getElementById("exSets");
const exReps = document.getElementById("exReps");
const exWeight = document.getElementById("exWeight");
const exVolume = document.getElementById("exVolume");

/***********************  
 HELPERS  
************************/
function persist() {
  localStorage.setItem("program", JSON.stringify(program));
}

function showToast(msg) {
  const toast = document.createElement("div");
  toast.innerText = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#111";
  toast.style.color = "#fff";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity .3s";

  document.body.appendChild(toast);
  setTimeout(() => (toast.style.opacity = "1"), 10);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function getWeek(id = program.currentWeek) {
  if (!program.weeks[id]) {
    program.weeks[id] = {
      id,
      name: "Week " + id,
      startDate: null,
      daysPerWeek: 7,
      days: {}
    };
  }
  return program.weeks[id];
}

function todayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function getDayIndex(day) {
  return Number(day.replace("Day ", ""));
}

function getWeekDayForToday(week) {
  if (!week.startDate) return "Day 1";
  const start = new Date(week.startDate);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((todayMidnight() - start) / (1000 * 60 * 60 * 24));
  if (diff >= 0 && diff <= 6) return "Day " + (diff + 1);
  return "Day 1";
}

/***********************  
 WORKOUT TYPE  
************************/
function selectWorkout(type) {
  selectedWorkout = type;
  document.getElementById("selected").innerText = "Selected: " + type;

  const headers = ["h1", "h2", "h3", "h4"].map(id => document.getElementById(id));
  const editable = type === "Custom";

  headers.forEach(h => {
    h.disabled = !editable;
  });

  if (type === "Custom") {
    document.getElementById("h1").value = program.customHeaders.h1;
    document.getElementById("h2").value = program.customHeaders.h2;
    document.getElementById("h3").value = program.customHeaders.h3;
    document.getElementById("h4").value = program.customHeaders.h4;
  } else {
    document.getElementById("h1").value = "Exercise";
    document.getElementById("h2").value = "Sets";
    document.getElementById("h3").value = "Reps";
    document.getElementById("h4").value = "Weight";
  }
}

/***********************  
 TABLE  
************************/
function addRow() {
  if (!validateStartDate()) return;

  const tbody = document.getElementById("table");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input placeholder="Exercise"></td>
    <td><input placeholder="Sets"></td>
    <td><input placeholder="Reps"></td>
    <td><input placeholder="Weight"></td>
    <td><button onclick="removeRow(this)">X</button></td>
  `;
  tbody.appendChild(tr);
}

function removeRow(btn) {
  btn.closest("tr").remove();
}

function getRows() {
  return [...document.querySelectorAll("#table tr")].map(tr => {
    const i = tr.querySelectorAll("input");
    return {
      exercise: i[0].value,
      sets: i[1].value,
      reps: i[2].value,
      weight: i[3].value
    };
  });
}

function resetEditor() {
  document.getElementById("table").innerHTML = "";
  document.getElementById("time").value = "";
  document.getElementById("selected").innerText = "";
  selectedWorkout = null;
  editState = { weekId: null, day: null };
}

/***********************  
 DATE LOGIC  
************************/
function validateStartDate(weekId = program.currentWeek) {
  const start = document.getElementById("startDate").value;
  if (!start) {
    alert("Select a program start date.");
    return false;
  }

  const s = new Date(start);
  s.setHours(0, 0, 0, 0);

  if (s < todayMidnight()) {
    alert("Start date cannot be in the past.");
    return false;
  }

  const weekStart = new Date(s);
  const weekEnd = new Date(s);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const allWeeks = Object.values(program.weeks);

  for (let w of allWeeks) {
    if (!w.startDate) continue;
    if (w.id === weekId) continue;

    const ws = new Date(w.startDate);
    ws.setHours(0, 0, 0, 0);

    const we = new Date(w.startDate);
    we.setDate(we.getDate() + 6);
    we.setHours(0, 0, 0, 0);

    if (weekStart <= we && weekEnd >= ws) {
      alert("This date overlaps with an existing week.");
      return false;
    }
  }

  return true;
}

function computeWeekDates(week) {
  const start = new Date(week.startDate);
  const out = {};

  for (let i = 1; i <= 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + (i - 1));
    out[`Day ${i}`] = formatDate(d);
  }
  return out;
}

function formatDate(d) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/***********************  
 SAVE DAY  
************************/
function saveDay() {
  if (!validateStartDate()) return;

  if (!selectedWorkout) {
    alert("Select a workout type (program).");
    return;
  }

  const time = document.getElementById("time").value;
  if (!time) {
    alert("Set workout time.");
    return;
  }

  const week = getWeek(program.currentWeek);
  const day = daySelect.value;
  const rows = getRows();

  if (!rows.length) {
    alert("Add at least one exercise.");
    return;
  }

  const allowed = parseInt(document.getElementById("daysPerWeek").value);
  const used = Object.values(week.days).filter(d => d?.current).length;

  if (!week.days[day] && used >= allowed) {
    alert("Increase training days to add more workouts this week.");
    return;
  }

  week.startDate = document.getElementById("startDate").value;
  week.daysPerWeek = allowed;

  if (!week.days[day]) week.days[day] = { history: [], current: null };

  if (selectedWorkout === "Custom") {
    program.customHeaders = {
      h1: document.getElementById("h1").value,
      h2: document.getElementById("h2").value,
      h3: document.getElementById("h3").value,
      h4: document.getElementById("h4").value
    };
  }

  if (week.days[day].current && !editState.weekId) {
    if (!confirm("Overwrite existing workout for this day?")) return;
  }

  const dates = computeWeekDates(week);

  week.days[day].current = {
    type: selectedWorkout || "Custom",
    rows,
    time,
    date: dates[day],
    status: "upcoming"
  };

  if (editState.weekId && editState.day) {
    editState = { weekId: null, day: null };
  }

  showToast("Saved");
  resetEditor();
  persist();
  renderAll();

  // AUTO ADVANCE DAY
  autoAdvanceDay();
}

function autoAdvanceDay() {
  const current = getDayIndex(daySelect.value);
  const max = parseInt(document.getElementById("daysPerWeek").value);
  const next = current < max ? current + 1 : current;
  daySelect.value = "Day " + next;
  resetEditor();
}

/***********************  
 MODAL  
************************/
function openModal(weekId, day, index = null) {
  const week = getWeek(weekId);
  const slot = week.days[day];
  const data = index === null ? slot.current : slot.history[index];
  if (!data) return;

  modalTitle.innerText = `${week.name} • ${day} • ${data.date}`;

  modalTable.innerHTML = `
    <table>
      <tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Weight</th></tr>
      ${data.rows.map((r, i) => `
        <tr onclick="${index === null ? `openInspector(${weekId}, '${day}', ${i})` : ""}">
          <td>${r.exercise}</td>
          <td>${r.sets}</td>
          <td>${r.reps}</td>
          <td>${r.weight}</td>
        </tr>
      `).join("")}
    </table>
  `;

  if (index !== null) {
    modalActions.innerHTML = `<button onclick="closeModal()">Close</button>`;
  } else {
    modalActions.innerHTML = `
      <button class="mark-btn easy" onclick="completeDay(${weekId}, '${day}', 'easy')">Easy</button>
      <button class="mark-btn great" onclick="completeDay(${weekId}, '${day}', 'great')">Great</button>
      <button class="mark-btn hard" onclick="completeDay(${weekId}, '${day}', 'hard')">Hard</button>
      <button class="mark-btn failed" onclick="completeDay(${weekId}, '${day}', 'failed')">Failed</button>
      <button onclick="editDay(${weekId}, '${day}')">Edit</button>
      <button onclick="closeModal()">Close</button>
    `;
  }

  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

/***********************  
 INSPECTOR FUNCTIONS  
************************/
function openInspector(weekId, day, index) {
  const week = getWeek(weekId);
  const row = week.days[day].current.rows[index];

  inspector.weekId = weekId;
  inspector.day = day;
  inspector.index = index;
  inspector.row = row;
  inspector.intensity = row.intensity || "mid";

  exTitle.innerText = row.exercise || "Exercise";
  exSets.innerText = row.sets || 0;
  exReps.innerText = row.reps || 0;
  exWeight.innerText = row.weight || 0;

  // volume now displayed as sets/reps/weight not kg
  exVolume.innerText = `${row.sets || 0} sets • ${row.reps || 0} reps • ${row.weight || 0} max`;

  document.getElementById("exerciseInspector").classList.remove("hidden");
}

function closeInspector() {
  document.getElementById("exerciseInspector").classList.add("hidden");
}

function setIntensity(intensity) {
  inspector.intensity = intensity;
}

function saveExerciseIntensity() {
  const week = getWeek(inspector.weekId);
  const row = week.days[inspector.day].current.rows[inspector.index];
  row.intensity = inspector.intensity;
  persist();
  closeInspector();
  showToast("Intensity saved.");
}

/***********************  
 COMPLETE / EDIT  
************************/
function completeDay(weekId, day, result) {
  if (!confirm("completed this workout?")) return;

  const comment = prompt("Add comment (optional):");

  const week = getWeek(weekId);
  const slot = week.days[day];

  const rows = slot.current.rows.map(r => ({
    ...r,
    intensity: r.intensity || "mid"
  }));

  slot.history.push({
    ...slot.current,
    rows,
    result,
    comment: comment || "",
    completedOn: new Date().toLocaleString()
  });

  slot.current = null;

  persist();
  closeModal();
  renderAll();
}

function editDay(weekId, day) {
  const week = getWeek(weekId);
  const cur = week.days[day].current;
  if (!cur) return;

  editState = { weekId, day };

  daySelect.value = day;
  selectedWorkout = cur.type;
  document.getElementById("selected").innerText = "Selected: " + cur.type;
  document.getElementById("time").value = cur.time || "";

  const tbody = document.getElementById("table");
  tbody.innerHTML = "";

  cur.rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${r.exercise}"></td>
      <td><input value="${r.sets}"></td>
      <td><input value="${r.reps}"></td>
      <td><input value="${r.weight}"></td>
      <td><button onclick="removeRow(this)">X</button></td>
    `;
    tbody.appendChild(tr);
  });

  closeModal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/***********************  
 SAVE WEEK  
************************/
function saveWeek() {
  const week = getWeek(program.currentWeek);

  if (!week.startDate) {
    alert("Set start date first.");
    return;
  }

  if (!confirm("Save this week and start a new one?")) return;

  const lastDate = new Date(week.startDate);
  lastDate.setDate(lastDate.getDate() + 6);

  const newWeekId = program.currentWeek + 1;
  const nextStart = new Date(lastDate);
  nextStart.setDate(lastDate.getDate() + 1);

  program.currentWeek = newWeekId;
  program.weeks[newWeekId] = {
    id: newWeekId,
    name: "Week " + newWeekId,
    startDate: nextStart.toISOString().slice(0, 10),
    daysPerWeek: week.daysPerWeek,
    days: {}
  };

  persist();
  resetEditor();
  renderAll();
}

/***********************  
 WEEK CONTROL  
************************/
function setCurrentWeek(id) {
  program.currentWeek = id;
  const week = getWeek(id);

  // keep start date if exists, else use today
  document.getElementById("startDate").value = week.startDate || new Date().toISOString().slice(0, 10);

  // day picker should open current day in that week
  daySelect.value = getWeekDayForToday(week);

  persist();
  renderAll();
}

function deleteWeek(id) {
  if (!confirm("Delete this week?")) return;
  delete program.weeks[id];
  if (program.currentWeek === id) program.currentWeek = 1;
  persist();
  renderAll();
}

/***********************  
 RENDER  
************************/
function renderUpcoming() {
  upcoming.innerHTML = "";

  const weekIds = Object.keys(program.weeks).map(Number).sort((a, b) => b - a);

  weekIds.forEach(id => {
    const week = getWeek(id);
    const isCurrent = id === program.currentWeek;

    const weekDiv = document.createElement("div");
    weekDiv.className = "card";

    weekDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <input value="${week.name}" onchange="renameWeek(${id}, this.value)" />
        ${isCurrent ? '<span style="font-size:12px; opacity:.7;">CURRENT</span>' : ''}
        ${!isCurrent ? `<button onclick="setCurrentWeek(${id})">Open</button>` : ''}
        
      </div>
      <div id="week-${id}" class="${isCurrent ? '' : 'collapsed'}"></div>
    `;

    upcoming.appendChild(weekDiv);

    const container = weekDiv.querySelector(`#week-${id}`);

    Object.keys(week.days)
      .sort((a, b) => getDayIndex(a) - getDayIndex(b))
      .forEach(day => {
        const cur = week.days[day].current;
        if (!cur) return;

        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <b>${day}</b> • ${cur.date}<br>
          ${cur.type} • ${cur.time || "No time"}<br>
          <button onclick="openModal(${id}, '${day}')">Open</button>
        `;
        container.appendChild(div);
      });

    if (isCurrent && Object.values(week.days).some(d => d?.current)) {
      const btn = document.createElement("button");
      btn.textContent = "Save Week";
      btn.onclick = saveWeek;
      container.appendChild(btn);
    }
  });
}

function renameWeek(id, name) {
  program.weeks[id].name = name;
  persist();
  renderAll();
}

/***********************  
 COMPLETED EXERCISE TAB  
************************/
function renderCompletedExercises() {
  const list = document.getElementById("completedExerciseList");
  list.innerHTML = "";

  const weekIds = Object.keys(program.weeks).map(Number).sort((a, b) => b - a);

  weekIds.forEach(id => {
    const week = getWeek(id);

    const hasHistory = Object.values(week.days).some(d => d?.history?.length > 0);
    if (!hasHistory) return;

    const weekDiv = document.createElement("div");
    weekDiv.className = "completed-week";
    weekDiv.innerHTML = `<b>${week.name}</b>`;

    const exerciseMap = {};

    Object.keys(week.days).forEach(day => {
      week.days[day].history.forEach(h => {
        h.rows.forEach(r => {
          if (!exerciseMap[r.exercise]) {
            exerciseMap[r.exercise] = { volume: 0, max: 0, mid: 0, failed: 0, skipped: 0 };
          }

          if (r.intensity !== "skipped") {
            const volume = (Number(r.sets) || 0) * (Number(r.reps) || 0);
            exerciseMap[r.exercise].volume += volume;
          }

          exerciseMap[r.exercise][r.intensity || "mid"]++;
        });
      });
    });

    Object.keys(exerciseMap).forEach(ex => {
      const exData = exerciseMap[ex];
      const exDiv = document.createElement("div");
      exDiv.className = "completed-exercise";

      exDiv.innerHTML = `
        <b>${ex}</b>
        <div>Total Reps: ${exData.volume}</div>
        <div>MAX: ${exData.max} • MID: ${exData.mid} • FAILED: ${exData.failed} • SKIPPED: ${exData.skipped}</div>
      `;
      weekDiv.appendChild(exDiv);
    });

    list.appendChild(weekDiv);
  });
}

function renderCompleted() {
  completed.innerHTML = "";

  const weekIds = Object.keys(program.weeks).map(Number).sort((a, b) => b - a);

  weekIds.forEach((id, index) => {
    const week = getWeek(id);

    const hasHistory = Object.values(week.days).some(d => d?.history?.length > 0);
    if (!hasHistory) return;

    const isLatest = index === 0;

    const weekDiv = document.createElement("div");
    weekDiv.className = "card";

    weekDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <b>${week.name}</b>
        ${!isLatest ? `<button onclick="toggleCompWeek(${id})">Toggle</button>` : ''}
      </div>
      <div id="comp-week-${id}" class="${isLatest ? '' : 'collapsed'}"></div>
    `;

    completed.appendChild(weekDiv);

    const container = weekDiv.querySelector(`#comp-week-${id}`);

    Object.keys(week.days)
      .sort((a, b) => getDayIndex(a) - getDayIndex(b))
      .forEach(day => {
        week.days[day].history.forEach((h, i) => {
          const div = document.createElement("div");
          div.className = `card completed ${h.result}`;
          div.innerHTML = `
            <b>${day}</b> • ${h.date}<br>
            ${h.type} • ${h.result.toUpperCase()}<br>
            ${h.comment ? `<i>${h.comment}</i><br>` : ""}
            <small>${h.completedOn}</small><br>
            <button onclick="openModal(${id}, '${day}', ${i})">View</button>
          `;
          container.appendChild(div);
        });
      });

    container.innerHTML += `
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button onclick="exportWeek(${id})">Export Week</button>
        <button onclick="clearWeek(${id})">Clear Week</button>
      </div>
    `;
  });
}

function toggleCompWeek(id) {
  const el = document.getElementById(`comp-week-${id}`);
  if (!el) return;
  el.classList.toggle("collapsed");
}

function renderSummary() {
  let up = 0, done = 0, failed = 0;

  Object.values(program.weeks).forEach(w => {
    Object.values(w.days).forEach(d => {
      if (d?.current) up++;
      d?.history.forEach(h => h.result === "failed" ? failed++ : done++);
    });
  });

  document.getElementById("summary").innerText =
    `Completed: ${done}\nFailed: ${failed}\nUpcoming: ${up}\nTotal: ${done + failed + up}`;
}

function renderAll() {
  renderUpcoming();
  renderCompleted();
  renderSummary();
  renderCompletedExercises();
}

/***********************  
 EXPORT  
************************/
function exportProgram() {
  let out = "";

  const weekIds = Object.keys(program.weeks).map(Number).sort((a, b) => a - b);

  weekIds.forEach(id => {
    const w = program.weeks[id];
    out += `=== ${w.name} ===\n`;
    Object.keys(w.days).forEach(d => {
      w.days[d].history.forEach(h => {
        out += `${d} | ${h.date} | ${h.type} | ${h.result} | ${h.comment || "No comment"}\n`;
      });
    });
    out += "\n";
  });

  const blob = new Blob([out], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "workout_history.txt";
  a.click();
}

/***********************  
 WEEK EXPORT / CLEAR  
************************/
function exportWeek(id) {
  const week = getWeek(id);
  let out = `=== ${week.name} ===\n`;

  Object.keys(week.days).forEach(d => {
    week.days[d].history.forEach(h => {
      out += `${d} | ${h.date} | ${h.type} | ${h.result} | ${h.comment || "No comment"}\n`;
    });
  });

  const blob = new Blob([out], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${week.name}.txt`;
  a.click();
}

function clearWeek(id) {
  if (!confirm(`Clear ALL completed/failed for ${program.weeks[id].name}?`)) return;

  const week = getWeek(id);
  Object.keys(week.days).forEach(d => {
    week.days[d].history = [];
  });

  persist();
  renderAll();
}

/***********************  
 CLEAR FUNCTIONS  
************************/
function clearCompleted() {
  if (!confirm("Clear ALL completed workouts?")) return;

  Object.values(program.weeks).forEach(w => {
    Object.keys(w.days).forEach(d => {
      w.days[d].history = w.days[d].history.filter(h => h.result === "failed");
    });
  });

  persist();
  renderAll();
}

function clearFailed() {
  if (!confirm("Clear ALL failed workouts?")) return;

  Object.values(program.weeks).forEach(w => {
    Object.keys(w.days).forEach(d => {
      w.days[d].history = w.days[d].history.filter(h => h.result !== "failed");
    });
  });

  persist();
  renderAll();
}

function clearArchive() {
  if (!confirm("Clear all saved weeks except current?")) return;

  const current = program.currentWeek;
  Object.keys(program.weeks).forEach(id => {
    if (Number(id) !== current) delete program.weeks[id];
  });

  persist();
  renderAll();
}

function clearAll() {
  if (!confirm("Clear EVERYTHING?")) return;
  program = { currentWeek: 1, weeks: {}, customHeaders: { h1: "", h2: "", h3: "", h4: "" } };
  persist();
  renderAll();
}

/***********************  
 INIT  
************************/
renderAll();