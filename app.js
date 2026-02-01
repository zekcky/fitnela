/***********************  
 GLOBAL STATE  
************************/

let program = JSON.parse(localStorage.getItem("program")) || {
  currentWeek: 1,
  weeks: {},
  customHeaders: { h1: "", h2: "", h3: "", h4: "" }
};
 const exerciseLibrary = {
  Upper: [
    "Bench Press", "Incline Bench Press", "Push Ups", "Dumbbell Fly", "Overhead Press",
    "Lateral Raise", "Bicep Curl", "Tricep Pushdown", "Pull Up", "Dumbbell Row",
    // Additions:
    "Decline Bench Press", "Chest Dip", "Close-Grip Bench Press", "Arnold Press",
    "Front Raise", "Rear Delt Fly", "Face Pull", "Upright Row", "Chin Up",
    "Lat Pulldown", "Seated Cable Row", "T-Bar Row", "Hammer Curl", "Preacher Curl",
    "Tricep Overhead Extension", "Skull Crusher", "Diamond Push Up", "Inverted Row"
  ],
  Lower: [
    "Squat", "Front Squat", "Lunge", "Deadlift", "Romanian Deadlift",
    "Leg Press", "Calf Raise", "Hamstring Curl", "Step Up", "Glute Bridge", "Hip Thrust", "Bulgarian Split Squat",
    // Additions:
    "Goblet Squat", "Hack Squat", "Sumo Deadlift", "Trap Bar Deadlift", "Good Morning",
    "Walking Lunge", "Reverse Lunge", "Leg Extension", "Seated Leg Curl", "Standing Calf Raise",
    "Donkey Calf Raise", "Single-Leg Glute Bridge", "Cable Kickback", "Adductor Machine", "Abductor Machine"
  ],
  Abs: [
    "Crunch", "Sit Up", "Leg Raise", "Plank", "Russian Twist",
    "Bicycle Crunch", "Mountain Climber", "Hanging Knee Raise", "Side Plank", "V-Up",
    // Additions:
    "Decline Crunch", "Cable Crunch", "Ab Wheel Rollout", "Dead Bug", "Hollow Hold",
    "Flutter Kick", "Scissor Kick", "Reverse Crunch", "Bird Dog", "Bear Crawl",
    "Woodchopper", "Pallof Press", "Dragon Flag", "Toe Touch", "Windshield Wiper"
  ],
  
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
const preMadeTemplates = [
  {
    name: "Beginner Full Body",
    type: "Full",
    rows: [
      { exercise: "Push Ups", sets: 3, reps: 10, weight: 0 },
      { exercise: "Squat", sets: 3, reps: 12, weight: 0 },
      { exercise: "Plank", sets: 3, reps: 1, weight: 0 }
    ]
  },
  {
    name: "Upper Body Strength",
    type: "Upper",
    rows: [
      { exercise: "Bench Press", sets: 4, reps: 8, weight: 40 },
      { exercise: "Pull Up", sets: 3, reps: 6, weight: 0 },
      { exercise: "Bicep Curl", sets: 3, reps: 12, weight: 10 }
    ]
  },
  {
    name: "Lower Body Power",
    type: "Lower",
    rows: [
      { exercise: "Squat", sets: 4, reps: 6, weight: 60 },
      { exercise: "Deadlift", sets: 4, reps: 5, weight: 70 },
      { exercise: "Calf Raise", sets: 3, reps: 15, weight: 20 }
    ]
  },
  {
    name: "Abs Focus",
    type: "Abs",
    rows: [
      { exercise: "Crunch", sets: 3, reps: 20, weight: 0 },
      { exercise: "Leg Raise", sets: 3, reps: 15, weight: 0 },
      { exercise: "Plank", sets: 3, reps: 1, weight: 0 }
    ]
  }
];
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
    function computeWeeklyVolumeDetailed(weekId = program.currentWeek) {
  const week = getWeek(weekId);

  const groupVolume = { Upper: 0, Lower: 0, Abs: 0, Custom: 0 };
  const groupExercises = { Upper: {}, Lower: {}, Abs: {}, Custom: {} };

  Object.keys(week.days).forEach(day => {
    const slot = week.days[day];

    // Only include completed workouts (history)
    if (slot.history && slot.history.length) {
      slot.history.forEach(h => {
        h.rows.forEach(r => {
          const sets = Number(r.sets) || 0;
          const reps = Number(r.reps) || 0;
          const weight = Number(r.weight) || 0;

          // Volume calculation: weighted if weight>0, else reps only
          const volume = weight > 0 ? sets * reps * weight : sets * reps;

          let group = Object.keys(exerciseLibrary).find(g => exerciseLibrary[g].includes(r.exercise)) || "Custom";

          // Accumulate total group volume
          groupVolume[group] += volume;

          // Accumulate per exercise volume and intensity counts
          if (!groupExercises[group][r.exercise]) {
            groupExercises[group][r.exercise] = {
              volume: 0,
              easy: 0,
              mid: 0,
              great: 0,
              failed: 0,
              skipped: 0
            };
          }

          groupExercises[group][r.exercise].volume += volume;
          const intensity = r.intensity || "mid";
          if (groupExercises[group][r.exercise][intensity] !== undefined) {
            groupExercises[group][r.exercise][intensity]++;
          }
        });
      });
    }
  });

  return { groupVolume, groupExercises };
}
function computeUpperLowerBalance(weekId = program.currentWeek) {
  const { groupVolume } = computeWeeklyVolumeDetailed(weekId);

  const upper = groupVolume.Upper || 0;
  const lower = groupVolume.Lower || 0;

  const total = upper + lower;

  if (total === 0) {
    return {
      upper,
      lower,
      imbalance: 0,
      verdict: "No data"
    };
  }

  const imbalance = Math.round(
    Math.abs(upper - lower) / total * 100
  );

  let verdict = "Balanced";

  if (upper > lower + total * 0.15) verdict = "Upper dominant";
  if (lower > upper + total * 0.15) verdict = "Lower dominant";

  return {
    upper,
    lower,
    imbalance,
    verdict
  };
}function getExerciseComparison(weekId = program.currentWeek) {
  const { groupExercises } = computeWeeklyVolumeDetailed(weekId);

  const exercises = [];

  Object.keys(groupExercises).forEach(group => {
    Object.keys(groupExercises[group]).forEach(name => {
      exercises.push({
        name,
        group,
        volume: groupExercises[group][name]
      });
    });
  });

  return exercises
    .sort((a, b) => b.volume - a.volume);
}
   function showSuggestions(input) {
  const row = input.closest("tr");
  const suggestionsDiv = row.querySelector(".suggestions");

  const value = input.value.toLowerCase().trim();
  suggestionsDiv.innerHTML = "";

  if (!value) {
    suggestionsDiv.style.display = "none";
    return;
  }

  // Determine the list of exercises to search
  let list = [];

  if (selectedWorkout === "Full") {
    // Full = all exercises except Home (removed)
    list = [
      ...exerciseLibrary.Upper,
      ...exerciseLibrary.Lower,
      ...exerciseLibrary.Abs
    ];
  } else if (exerciseLibrary[selectedWorkout]) {
    // Normal category
    list = exerciseLibrary[selectedWorkout];
  } else if (selectedWorkout === "Custom") {
    // Custom = can match everything
    list = [
      ...exerciseLibrary.Upper,
      ...exerciseLibrary.Lower,
      ...exerciseLibrary.Abs
    ];
  } else {
    // Fallback empty
    list = [];
  }

  // Filter by input value (case-insensitive)
  const matches = list.filter(ex => ex.toLowerCase().includes(value));

  if (matches.length === 0) {
    suggestionsDiv.style.display = "none";
    return;
  }

  // Render suggestions
  matches.forEach(match => {
    const div = document.createElement("div");
    div.innerText = match;
    div.style.padding = "4px 8px";
    div.style.cursor = "pointer";

    div.addEventListener("mousedown", e => {
      e.preventDefault(); // prevent input blur
      input.value = match;
      suggestionsDiv.style.display = "none";
    });

    suggestionsDiv.appendChild(div);
  });

  suggestionsDiv.style.display = "block";
}
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
function loadTemplateUnified(template) {
  if (!template || !template.rows) return;

  // 1️⃣ Set workout type
  selectWorkout(template.type || "Custom");

  // 2️⃣ Clear current editor
  document.getElementById("table").innerHTML = "";

  // 3️⃣ Determine exercise group for each row
  template.rows.forEach(r => {
    let group = Object.keys(exerciseLibrary).find(g => exerciseLibrary[g].includes(r.exercise)) || "Custom";
    addRow(r.exercise, r.sets, r.reps, r.weight, group);
  });

  showToast(`Loaded template: ${template.name}`);
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
document.addEventListener("click", e => {
  if (!e.target.matches(".arrows span")) return;

  const step = Number(e.target.dataset.step);
  const input = e.target.closest(".input-shell").querySelector("input");

  let val = parseFloat(input.value) || 0;
  input.value = Math.max(0, val + step);
});
   function addRow() {
  if (!validateStartDate()) return;

  const tbody = document.getElementById("table");
  const tr = document.createElement("tr");
       tr.innerHTML = `
  <td style="position: relative;">
    <input placeholder="Exercise"
           oninput="showSuggestions(this)"
           autocomplete="off"
           style="width:100%; color:#fff; background:#111; border:1px solid #333;">
    <div class="suggestions" style="display:none; position:absolute; top:100%; left:0; background:#111; border:1px solid #333; z-index:10; width:100%; max-height:150px; overflow-y:auto; color:#fff;"></div>
  </td>

  <td>
    <input placeholder="Sets" style="width:100%; color:#fff; background:#111; border:1px solid #333;">
  </td>

  <td>
    <input placeholder="Reps" style="width:100%; color:#fff; background:#111; border:1px solid #333;">
  </td>

  <td>
    <input placeholder="Weight" style="width:100%; color:#fff; background:#111; border:1px solid #333;">
  </td>

  <td>
    <button onclick="removeRow(this)">X</button>
  </td>
`;
tbody.appendChild(tr);
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
  alert("Start date cannot be before today.");
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
  if (editState.weekId) return; // Do not auto-advance if editing old workout

  const week = getWeek(program.currentWeek);
  const daysPerWeek = parseInt(document.getElementById("daysPerWeek").value);

  // Find the next day that does NOT have a current workout
  for (let i = getDayIndex(daySelect.value) + 1; i <= daysPerWeek; i++) {
    const dayKey = `Day ${i}`;
    if (!week.days[dayKey].current) {
      daySelect.value = dayKey;
      resetEditor();
      return;
    }
  }

  // If all remaining days are assigned, stay on last day
  daySelect.value = `Day ${daysPerWeek}`;
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
  
/***********************  
 COMPLETE / EDIT  
************************/
  
function completeDay(weekId, day, result) {
  if (!confirm("Completed this workout?")) return;

  const comment = prompt("Add comment (optional):");

  const week = getWeek(weekId);
  const slot = week.days[day];

  if (!slot.current || !slot.current.rows.length) {
    alert("No exercises to complete!");
    return;
  }

  // Convert all values to numbers here
  const numericRows = slot.current.rows.map(r => ({
    exercise: r.exercise,
    sets: Number(r.sets) || 0,
    reps: Number(r.reps) || 0,
    weight: Number(r.weight) || 0,
    intensity: r.intensity || "mid"
  }));

  // Save to history
  slot.history.push({
    type: slot.current.type,
    rows: numericRows,
    time: slot.current.time,
    date: slot.current.date,
    status: "completed",
    result,
    comment: comment || "",
    completedOn: new Date().toLocaleString()
  });

  // Clear current
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

  // <-- ADD THIS LINE
  setCurrentWeek(newWeekId);
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
 function renderVolumeBarsDetailed() {
  const container = document.getElementById("volumeBars");
  if (!container) return;
  container.innerHTML = "";

  renderUpperLowerComparison(); // keep summary

  const { groupVolume, groupExercises } = computeWeeklyVolumeDetailed();
  const maxVolume = Math.max(...Object.values(groupVolume), 1); // prevent divide by 0

  const intensityColors = {
    easy: "#0b0",
    mid: "#0aa",
    great: "#0ff",
    failed: "#f00",
    skipped: "#555"
  };

  for (let group in groupVolume) {
    const groupDiv = document.createElement("div");
    groupDiv.style.marginBottom = "16px";

    const groupLabel = document.createElement("div");
    let label = group === "Custom" ? program.customHeaders.h1 || "Custom Exercises" : group;
    groupLabel.innerText = `${label} — Week ${program.currentWeek}: ${groupVolume[group]} vol`;
    groupDiv.appendChild(groupLabel);

    const barContainer = document.createElement("div");
    barContainer.style.position = "relative";
    barContainer.style.background = "#222";
    barContainer.style.height = "20px";
    barContainer.style.width = "100%";
    barContainer.style.borderRadius = "8px";
    barContainer.style.overflow = "hidden";

    let accumulated = 0;

    Object.keys(groupExercises[group]).forEach((ex, idx) => {
      const exData = groupExercises[group][ex];
      if (exData.volume === 0) return;

      const totalGroupVolume = groupVolume[group] || 1;

      // Add segments per intensity
      Object.keys(intensityColors).forEach(intensity => {
        const count = exData[intensity];
        if (!count) return;

        const vol = exData.volume * (count / (exData.easy + exData.mid + exData.great + exData.failed + exData.skipped));
        const pct = (vol / totalGroupVolume) * 100;

        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${accumulated}%`;
        div.style.width = `${pct}%`;
        div.style.height = "100%";
        div.style.background = intensityColors[intensity];
        div.title = `${ex} — ${vol} vol\nEASY:${exData.easy} MID:${exData.mid} GREAT:${exData.great} FAILED:${exData.failed} SKIPPED:${exData.skipped}`;
        barContainer.appendChild(div);

        accumulated += pct;
      });
    });

    groupDiv.appendChild(barContainer);
    container.appendChild(groupDiv);
  }
}
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
function renderUpperLowerComparison() {
  const container = document.getElementById("comparisonBox");
  if (!container) return;

  const balance = computeUpperLowerBalance();
  const exercises = getExerciseComparison();

  container.innerHTML = `
    <h3>Upper vs Lower Balance</h3>
    <p><strong>Upper:</strong> ${balance.upper} kg</p>
    <p><strong>Lower:</strong> ${balance.lower} kg</p>
    <p><strong>Imbalance:</strong> ${balance.imbalance}%</p>
    <p><strong>Status:</strong> ${balance.verdict}</p>

    <hr>

    <h3>Top Exercises</h3>
    <ul>
      ${exercises.slice(0, 6).map(e =>
        `<li>${e.name} (${e.group}) — ${e.volume} kg</li>`
      ).join("")}
    </ul>
  `;
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
  renderVolumeBarsDetailed(); // Add this line
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
// Load templates from localStorage
let workoutTemplates = JSON.parse(localStorage.getItem("workoutTemplates")) || [];

// Show/Hide templates list
function showTemplateList() {
  const list = document.getElementById("templateList");
  list.style.display = list.style.display === "block" ? "none" : "block";
  renderTemplates();
}

// Save current editor as template
function saveCurrentAsTemplate() {
  const rows = getRows();
  if (!rows.length) {
    alert("Add at least one exercise to save as template.");
    return;
  }

  const templateName = prompt("Template Name:");
  if (!templateName) return;

  workoutTemplates.push({
    name: templateName,
    type: selectedWorkout || "Custom",
    rows
  });

  localStorage.setItem("workoutTemplates", JSON.stringify(workoutTemplates));
  renderTemplates();
  showToast("Template saved!");
}

// Render templates in the dropdown
 function renderTemplates() {
  const container = document.getElementById("templatesContainer");
  container.innerHTML = "";

  // ===== PRE-MADE TEMPLATES =====
  if (preMadeTemplates.length) {
    const title = document.createElement("div");
    title.innerHTML = "<b>Pre-Made Templates</b>";
    title.style.marginBottom = "4px";
    container.appendChild(title);

    preMadeTemplates.forEach((t, i) => {
      const div = document.createElement("div");
      div.style.cursor = "pointer";
      div.style.padding = "4px 0";
      div.innerText = `${t.name} (${t.type})`;

        div.onclick = () => loadTemplateFromObject(t);
      container.appendChild(div);
    });
  }

  // ===== SAVED TEMPLATES =====
  if (workoutTemplates.length) {
    const title = document.createElement("div");
    title.innerHTML = "<b>Your Templates</b>";
    title.style.margin = "8px 0 4px";
    container.appendChild(title);

    workoutTemplates.forEach((t, i) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.cursor = "pointer";

      const name = document.createElement("span");
      name.innerText = `${t.name} (${t.type})`;
      name.onclick = () => loadTemplate(i);

      const del = document.createElement("button");
      del.innerText = "X";
      del.onclick = e => {
        e.stopPropagation();
        workoutTemplates.splice(i, 1);
        localStorage.setItem("workoutTemplates", JSON.stringify(workoutTemplates));
        renderTemplates();
      };

      row.appendChild(name);
      row.appendChild(del);
      container.appendChild(row);
    });
  }

  if (!preMadeTemplates.length && !workoutTemplates.length) {
    container.innerHTML = "<i>No templates available</i>";
  }
}function loadTemplateFromObject(template) {
  const target = document.getElementById("templateTarget").value;

  resetEditor();
  selectWorkout(target);

  template.rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${r.exercise}"></td>
      <td><input value="${r.sets}"></td>
      <td><input value="${r.reps}"></td>
      <td><input value="${r.weight}"></td>
      <td><button onclick="removeRow(this)">X</button></td>
    `;
  document.getElementById("table").appendChild(tr);
  });

  document.getElementById("templateList").style.display = "none";
  showToast(`Loaded: ${template.name}`);
}function showTemplateList() {
  const list = document.getElementById("templateList");
  const open = list.style.display === "block";
  list.style.display = open ? "none" : "block";

  if (!open) renderTemplates();
}

// Load a template into editor
function loadTemplate(index) {
  const t = workoutTemplates[index];
  if (!t) return;

  resetEditor();
  selectWorkout(t.type);

  t.rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input value="${r.exercise}"></td>
      <td><input value="${r.sets}"></td>
      <td><input value="${r.reps}"></td>
      <td><input value="${r.weight}"></td>
      <td><button onclick="removeRow(this)">X</button></td>
    `;
    document.getElementById("table").appendChild(tr);
  });

  showToast(`Loaded template: ${t.name}`);
}let templateToPreview = null;
function previewTemplate(template) {
  templateToPreview = template;
function confirmLoadTemplate() {
  if (!templateToPreview) return;
  loadTemplateUnified(templateToPreview);
  closeTemplatePreview();
}
  document.getElementById("previewTitle").innerText =
    `${template.name} (${template.type})`;

  const tbody = document.getElementById("previewTable");
  tbody.innerHTML = "";

  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;

  template.rows.forEach(r => {
    totalSets += Number(r.sets);
    totalReps += Number(r.sets) * Number(r.reps);
    totalVolume += Number(r.sets) * Number(r.reps) * Number(r.weight);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.exercise}</td>
      <td>${r.sets}</td>
      <td>${r.reps}</td>
      <td>${r.weight}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("previewStats").innerHTML = `
    <b>Sets:</b> ${totalSets} |
    <b>Total Reps:</b> ${totalReps} |
    <b>Volume:</b> ${totalVolume} kg
  `;

  document.getElementById("templatePreviewModal").style.display = "block";
}function confirmLoadTemplate() {
  if (!templateToPreview) return;

  // Use your existing logic
  if (templateToPreview.type) {
    selectWorkout(templateToPreview.type);
  } else {
    selectWorkout("Custom");
  }

  document.getElementById("table").innerHTML = "";

  templateToPreview.rows.forEach(r => {
    addRow(r.exercise, r.sets, r.reps, r.weight);
  });

  closeTemplatePreview();
}function closeTemplatePreview() {
  document.getElementById("templatePreviewModal").style.display = "none";
  templateToPreview = null;
}  
 /***********************
 PROGRESS GALLERY (STABLE)
***********************/
let progressImages = JSON.parse(localStorage.getItem("progressImages")) || [];
let galleryVisible = true;

/* Toggle gallery */
function toggleGallery() {
  const controls = document.getElementById("galleryControls");
  const gallery = document.getElementById("progressGallery");

  galleryVisible = !galleryVisible;
  controls.style.display = galleryVisible ? "block" : "none";
  gallery.style.display = galleryVisible ? "grid" : "none";
}

/* Add image */
function addProgressImage() {
  const fileInput = document.getElementById("galleryFile");
  const noteInput = document.getElementById("galleryNote");

  if (!fileInput.files.length) {
    alert("Please select an image");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    progressImages.push({
      src: reader.result,
      note: noteInput.value.trim(),
      date: Date.now()
    });

    localStorage.setItem("progressImages", JSON.stringify(progressImages));
    renderProgressGallery();

    fileInput.value = "";
    noteInput.value = "";
  };

  reader.readAsDataURL(fileInput.files[0]);
}

/* Render gallery */
function renderProgressGallery() {
  const container = document.getElementById("progressGallery");
  if (!container) return;

  container.innerHTML = "";

  progressImages.forEach((img, index) => {
    const tile = document.createElement("div");
    tile.style.background = "#111";
    tile.style.borderRadius = "10px";
    tile.style.padding = "6px";

    tile.innerHTML = `
      <img src="${img.src}" style="width:100%; border-radius:6px;">
      ${img.note ? `<div style="font-size:11px; opacity:.8;">${img.note}</div>` : ""}
      <button style="margin-top:6px; width:100%;" onclick="deleteProgressImage(${index})">
        Delete
      </button>
    `;

    container.appendChild(tile);
  });
}

/* Delete image */
function deleteProgressImage(index) {
  if (!confirm("Delete this image?")) return;
  progressImages.splice(index, 1);
  localStorage.setItem("progressImages", JSON.stringify(progressImages));
  renderProgressGallery();
}

/* Sort by date */
function sortGalleryByDate() {
  progressImages.sort((a, b) => b.date - a.date);
  localStorage.setItem("progressImages", JSON.stringify(progressImages));
  renderProgressGallery();
}

/* Init */
document.addEventListener("DOMContentLoaded", renderProgressGallery);

 // ===== MEASUREMENT MODAL WITH GRID & SCALE =====
let currentIndex = null;
let points = [];
let pxPerUnit = 10; // default scale: 10 pixels = 1 cm

const measureModal = document.getElementById("measureModal");
const measureImg = document.getElementById("measureImg");
const measureCanvas = document.getElementById("measureCanvas");
const ctx = measureCanvas.getContext("2d");

// OPEN MODAL
function openMeasureModal(index) {
  currentIndex = index;
  points = [];
  measureImg.src = progressImages[index].src;

  measureImg.onload = () => {
    const maxWidth = window.innerWidth - 20;
    const maxHeight = window.innerHeight * 0.8;
    const ratio = Math.min(maxWidth / measureImg.naturalWidth, maxHeight / measureImg.naturalHeight, 1);

    measureImg.width = measureImg.naturalWidth * ratio;
    measureImg.height = measureImg.naturalHeight * ratio;

    measureCanvas.width = measureImg.width;
    measureCanvas.height = measureImg.height;
    measureCanvas.style.top = measureImg.offsetTop + "px";
    measureCanvas.style.left = measureImg.offsetLeft + "px";

    drawGrid();
  };

  measureModal.style.display = "flex";
}

// CLOSE MODAL
document.getElementById("closeModal").onclick = () => {
  measureModal.style.display = "none";
};

// APPLY SCALE
function applyScale() {
  const val = parseFloat(document.getElementById("scaleInput").value);
  if (val > 0) {
    pxPerUnit = val;
    drawGrid();
  } else {
    alert("Scale must be greater than 0");
  }
}

// DRAW GRID AND POINTS
function drawGrid() {
  ctx.clearRect(0, 0, measureCanvas.width, measureCanvas.height);

  // Grid lines
  const step = 50; // pixels between grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= measureCanvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, measureCanvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= measureCanvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(measureCanvas.width, y);
    ctx.stroke();
  }

  // Draw points
  points.forEach(p => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw line + distance
  if (points.length === 2) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();

    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    const distancePx = Math.sqrt(dx * dx + dy * dy);
    const distanceUnit = (distancePx / pxPerUnit).toFixed(1);

    ctx.fillStyle = "yellow";
    ctx.font = "16px Arial";
    ctx.fillText(distanceUnit + " cm", (points[0].x + points[1].x) / 2 + 5, (points[0].y + points[1].y) / 2 - 5);
  }
}

// CLICK TO SELECT POINTS
measureCanvas.onclick = (e) => {
  const rect = measureCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (points.length < 2) points.push({ x, y });
  else points = [{ x, y }];

  drawGrid();
};

// SAVE MEASUREMENT
function saveMeasurements() {
  if (points.length < 2) return alert("Select two points first");

  const dx = points[1].x - points[0].x;
  const dy = points[1].y - points[0].y;
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  const distanceUnit = (distancePx / pxPerUnit).toFixed(1);

  if (!progressImages[currentIndex].measurements) progressImages[currentIndex].measurements = [];
  progressImages[currentIndex].measurements.push({
    points: [...points],
    distancePx,
    distanceUnit
  });

  localStorage.setItem("progressImages", JSON.stringify(progressImages));
  alert("Measurement saved: " + distanceUnit + " cm");
  points = [];
  drawGrid();
}

 
/***********************  
 INIT  
************************/
document.addEventListener("DOMContentLoaded", () => {
  const startInput = document.getElementById("startDate");
  if (startInput && !startInput.value) {
    startInput.value = new Date().toISOString().slice(0, 10);
  }
});
renderAll();

