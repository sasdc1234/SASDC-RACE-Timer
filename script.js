let startInterval = 15;
let competitors = [];
let raceStarted = false;
let raceStartPerformance = 0;
let raceStartDate = null;
let timer = null;
let finishOrder = [];

const STORAGE_KEY = "dogSledRaceTimerState_v2";

let resumePromptShown = false;


/* ================================
   LOCAL SAVE
================================ */

function saveRaceState() {

  try {

    const state = {

      startInterval: startInterval,

      competitors: competitors,

      raceStarted: raceStarted,

      raceStartPerformance:
        raceStartPerformance,

      raceStartDate:
        raceStartDate
          ? raceStartDate.toISOString()
          : null,

      finishOrder: finishOrder,

      raceName:
        document.getElementById("raceName")?.value || "",

      raceClass:
        document.getElementById("raceClass")?.value || "",

      customClass:
        document.getElementById("customClass")?.value || "",

      distance:
        document.getElementById("distance")?.value || "",

      distanceUnit:
        document.getElementById("distanceUnit")?.value || "km"

    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  } catch (error) {

    console.warn(
      "Could not save race locally:",
      error
    );

  }
}


/* ================================
   LOAD SAVED RACE
================================ */

function getSavedRaceState() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    return saved
      ? JSON.parse(saved)
      : null;

  } catch (error) {

    console.warn(
      "Could not read saved race:",
      error
    );

    return null;
  }
}


/* ================================
   CLEAR SAVED RACE
================================ */

function clearSavedRaceState() {

  try {

    localStorage.removeItem(
      STORAGE_KEY
    );

  } catch (error) {

    console.warn(
      "Could not clear saved race:",
      error
    );

  }
}


/* ================================
   GET RACE CLASS
================================ */

function getRaceClass() {

  const selected =
    document
      .getElementById("raceClass")
      .value;


  if (selected === "Custom") {

    const custom =
      document
        .getElementById("customClass")
        .value
        .trim();


    return custom || "Custom";
  }


  return selected;
}


/* ================================
   CUSTOM CLASS
================================ */

function toggleCustomClass() {

  const classSelect =
    document
      .getElementById("raceClass");


  const customContainer =
    document
      .getElementById(
        "customClassContainer"
      );


  if (
    classSelect.value === "Custom"
  ) {

    customContainer
      .classList
      .remove("hidden");

  } else {

    customContainer
      .classList
      .add("hidden");

  }


  saveRaceState();
}


/* ================================
   RESTORE SAVED RACE
================================ */

function restoreRaceState(state) {

  if (!state) return false;


  startInterval =
    Number(state.startInterval) || 15;


  competitors =
    Array.isArray(
      state.competitors
    )
      ? state.competitors
      : [];


  raceStarted =
    Boolean(
      state.raceStarted
    );


  raceStartDate =
    state.raceStartDate
      ? new Date(
          state.raceStartDate
        )
      : null;


  finishOrder =
    Array.isArray(
      state.finishOrder
    )
      ? state.finishOrder
      : [];


  document
    .getElementById("raceName")
    .value =
    state.raceName || "";


  document
    .getElementById("raceClass")
    .value =
    state.raceClass ||
    "1 Dog Scooter";


  document
    .getElementById("customClass")
    .value =
    state.customClass || "";


  document
    .getElementById("distance")
    .value =
    state.distance || "3";


  document
    .getElementById("distanceUnit")
    .value =
    state.distanceUnit || "km";


  document
    .getElementById("competitorCount")
    .value =
    competitors.length || 2;


  toggleCustomClass();


  if (
    !competitors.length ||
    !raceStarted ||
    !raceStartDate
  ) {

    createCompetitors();

    return false;
  }


  /*
     Reconstruct the performance clock.

     performance.now() resets when the
     browser/page is reopened.

     We rebuild it using the saved
     real-world start date.
  */

  const nowDate =
    Date.now();


  const savedStartDate =
    raceStartDate.getTime();


  raceStartPerformance =
    performance.now()
    -
    (
      nowDate -
      savedStartDate
    );


  competitors.forEach(
    c => {

      if (c.startDate) {

        const startDateMs =
          new Date(
            c.startDate
          ).getTime();


        c.startPerformance =
          raceStartPerformance
          +
          (
            startDateMs -
            savedStartDate
          );
      }


      if (c.finishDate) {

        const finishDateMs =
          new Date(
            c.finishDate
          ).getTime();


        c.finishPerformance =
          raceStartPerformance
          +
          (
            finishDateMs -
            savedStartDate
          );
      }

    }
  );


  /*
     Lock setup.
  */

  document
    .querySelectorAll(
      "#setup input, #setup select, #setup button"
    )
    .forEach(
      el => {
        el.disabled = true;
      }
    );


  /*
     Update selected interval.
  */

  document
    .querySelectorAll(".interval")
    .forEach(
      button => {

        button.classList.remove(
          "selected"
        );


        const text =
          button.textContent
            .trim();


        if (
          (
            startInterval === 15 &&
            text.includes("15")
          )
          ||
          (
            startInterval === 30 &&
            text.includes("30")
          )
          ||
          (
            startInterval === 60 &&
            text.includes("1 min")
          )
        ) {

          button.classList.add(
            "selected"
          );
        }

      }
    );


  document
    .getElementById("startButton")
    .textContent =
    "● RACE RUNNING";


  document
    .getElementById("startButton")
    .classList.add(
      "running"
    );


  const raceName =
    document
      .getElementById("raceName")
      .value
      .trim();


  const raceClass =
    getRaceClass();


  document
    .getElementById("raceTitle")
    .textContent =
    `${raceName} — ${raceClass}`;


  document
    .getElementById("finishSection")
    .classList.remove(
      "hidden"
    );


  createFinishButtons();

  renderResults();

  updateClock();


  /*
     If everyone has finished,
     don't restart the timer.
  */

  if (
    competitors.every(
      c => c.finished
    )
  ) {

    document
      .getElementById("status")
      .textContent =
      "🏁 ALL COMPETITORS FINISHED";


    timer = null;

  } else {

    timer =
      setInterval(
        updateClock,
        50
      );

  }


  return true;
}


/* ================================
   CHECK FOR SAVED RACE
================================ */

function checkForSavedRace() {

  const saved =
    getSavedRaceState();


  if (
    !saved ||
    !saved.raceStarted ||
    !saved.competitors?.length
  ) {

    return;
  }


  if (resumePromptShown)
    return;


  resumePromptShown = true;


  const raceName =
    saved.raceName ||
    "Unnamed race";


  const finished =
    saved.competitors
      .filter(
        c => c.finished
      )
      .length;


  const resume =
    confirm(

      `A saved race was found: "${raceName}".\n\n`
      +
      `${finished} of `
      +
      `${saved.competitors.length} `
      +
      `competitors finished.\n\n`
      +
      `Press OK to resume this race, `
      +
      `or Cancel to start fresh.`

    );


  if (resume) {

    restoreRaceState(
      saved
    );

  } else {

    clearSavedRaceState();

    createCompetitors();

  }
}


/* ================================
   START INTERVAL
================================ */

function setIntervalTime(
  seconds,
  button
) {

  if (raceStarted)
    return;


  startInterval =
    seconds;


  document
    .querySelectorAll(".interval")
    .forEach(
      b =>
        b.classList.remove(
          "selected"
        )
    );


  button.classList.add(
    "selected"
  );


  saveRaceState();
}


/* ================================
   CREATE COMPETITORS
================================ */

function createCompetitors() {

  if (raceStarted)
    return;


  const count =
    parseInt(
      document
        .getElementById(
          "competitorCount"
        )
        .value
    ) || 2;


  const container =
    document.getElementById(
      "competitors"
    );


  container.innerHTML = "";


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "competitor";


    row.innerHTML = `

      <input
        class="bib"
        value="${i + 1}"
        placeholder="Bib">

      <input
        class="name"
        placeholder="Competitor ${i + 1}">

    `;


    container.appendChild(
      row
    );

  }
}


/* ================================
   START RACE
================================ */

function startRace() {

  if (raceStarted)
    return;


  const raceName =
    document
      .getElementById(
        "raceName"
      )
      .value
      .trim();


  if (!raceName) {

    alert(
      "Please enter a race name."
    );

    return;
  }


  const distance =
    parseFloat(
      document
        .getElementById(
          "distance"
        )
        .value
    );


  if (
    !distance ||
    distance <= 0
  ) {

    alert(
      "Please enter the race distance."
    );

    return;
  }


  const rows =
    document.querySelectorAll(
      ".competitor"
    );


  if (!rows.length) {

    alert(
      "Create your competitors first."
    );

    return;
  }


  competitors = [];


  rows.forEach(
    (row, index) => {

      competitors.push({

        bib:
          row
            .querySelector(".bib")
            .value
            .trim()
          ||
          String(index + 1),


        name:
          row
            .querySelector(".name")
            .value
            .trim()
          ||
          `Competitor ${index + 1}`,


        startPerformance: 0,

        startDate: null,

        finishPerformance: null,

        finishDate: null,

        elapsed: null,

        finished: false

      });

    }
  );


  /*
     Start high-accuracy clock.
  */

  raceStartPerformance =
    performance.now();


  raceStartDate =
    new Date();


  /*
     Give every competitor their
     staggered start time.
  */

  competitors.forEach(
    (c, i) => {

      const offset =
        i *
        startInterval *
        1000;


      c.startPerformance =
        raceStartPerformance +
        offset;


      c.startDate =
        new Date(
          raceStartDate.getTime()
          +
          offset
        );

    }
  );


  raceStarted = true;

  finishOrder = [];


  /*
     Lock setup controls.
  */

  document
    .querySelectorAll(
      "#setup input, #setup select, #setup button"
    )
    .forEach(
      el => {
        el.disabled = true;
      }
    );


  document
    .getElementById("startButton")
    .textContent =
    "● RACE RUNNING";


  document
    .getElementById("startButton")
    .classList.add(
      "running"
    );


  /*
     Race title.
  */

  const raceClass =
    getRaceClass();


  document
    .getElementById("raceTitle")
    .textContent =
    `${raceName} — ${raceClass}`;


  /*
     Show finish line.
  */

  document
    .getElementById(
      "finishSection"
    )
    .classList.remove(
      "hidden"
    );


  createFinishButtons();

  updateClock();

  renderResults();

  saveRaceState();


  timer =
    setInterval(
      updateClock,
      50
    );
}


/* ================================
   FINISH BUTTONS
================================ */

function createFinishButtons() {

  const container =
    document.getElementById(
      "finishButtons"
    );


  container.innerHTML = "";


  competitors.forEach(
    (c, i) => {

      const button =
        document.createElement(
          "button"
        );


      button.className =
        "finish";


      button.id =
        `finish-${i}`;


      button.innerHTML = `

        FINISH ${escapeHTML(c.bib)}

        <small>
          ${escapeHTML(c.name)}
        </small>

      `;


      button.onclick =
        () =>
          finishCompetitor(i);


      container.appendChild(
        button
      );

    }
  );
}


/* ================================
   RECORD FINISH
================================ */

function finishCompetitor(index) {

  if (!raceStarted)
    return;


  const c =
    competitors[index];


  if (c.finished)
    return;


  const now =
    performance.now();


  c.finishPerformance =
    now;


  c.finishDate =
    new Date();


  /*
     Time is calculated from that
     competitor's own start time.
  */

  c.elapsed =
    Math.max(
      0,
      now -
      c.startPerformance
    );


  c.finished = true;


  finishOrder.push(
    index
  );


  const button =
    document.getElementById(
      `finish-${index}`
    );


  button.classList.add(
    "done"
  );


  button.innerHTML = `

    ✓ FINISHED
    ${escapeHTML(c.bib)}

    <small>
      ${formatTime(c.elapsed)}
    </small>

  `;


  renderResults();

  updateStatus();

  saveRaceState();


  /*
     Stop clock once everyone
     has finished.
  */

  if (
    competitors.every(
      c => c.finished
    )
  ) {

    clearInterval(timer);

    timer = null;


    document
      .getElementById("status")
      .textContent =
      "🏁 ALL COMPETITORS FINISHED";

  }
}


/* ================================
   UNDO LAST FINISH
================================ */

function undoFinish() {

  if (!finishOrder.length) {

    alert(
      "There is no finish to undo."
    );

    return;
  }


  const index =
    finishOrder.pop();


  const c =
    competitors[index];


  c.finished = false;

  c.finishPerformance = null;

  c.finishDate = null;

  c.elapsed = null;


  const button =
    document.getElementById(
      `finish-${index}`
    );


  button.classList.remove(
    "done"
  );


  button.innerHTML = `

    FINISH ${escapeHTML(c.bib)}

    <small>
      ${escapeHTML(c.name)}
    </small>

  `;


  if (!timer) {

    timer =
      setInterval(
        updateClock,
        50
      );

  }


  renderResults();

  updateStatus();

  saveRaceState();
}


/* ================================
   MAIN RACE CLOCK
================================ */

function updateClock() {

  if (!raceStarted)
    return;


  const elapsed =
    performance.now()
    -
    raceStartPerformance;


  document
    .getElementById(
      "raceClock"
    )
    .textContent =
    formatTime(elapsed);


  updateStatus();
}


/* ================================
   STATUS
================================ */

function updateStatus() {

  const finished =
    competitors.filter(
      c => c.finished
    ).length;


  document
    .getElementById(
      "status"
    )
    .textContent =
    `${finished} of `
    +
    `${competitors.length} `
    +
    `finished`;
}


/* ================================
   RESULTS
================================ */

function renderResults() {

  const container =
    document.getElementById(
      "results"
    );


  const finished =
    competitors
      .filter(
        c => c.finished
      )
      .sort(
        (a, b) =>
          a.finishPerformance -
          b.finishPerformance
      );


  if (!finished.length) {

    container.innerHTML = `

      <div class="empty">
        Results will appear here.
      </div>

    `;

    return;
  }


  container.innerHTML = "";


  finished.forEach(
    (c, index) => {

      const div =
        document.createElement(
          "div"
        );


      div.className =
        "result";


      div.innerHTML = `

        <div class="result-name">

          ${index + 1}.
          ${escapeHTML(c.bib)}
          —
          ${escapeHTML(c.name)}

        </div>

        <div class="result-details">

          Finished elapsed time:

          <span class="result-time">
            ${formatTime(c.elapsed)}
          </span>

          &nbsp; | &nbsp;

          Average speed:

          <span class="speed">
            ${averageSpeed(c.elapsed)}
          </span>

        </div>

      `;


      container.appendChild(
        div
      );

    }
  );
}


/* ================================
   AVERAGE SPEED
================================ */

function averageSpeed(milliseconds) {

  if (!milliseconds)
    return "-";


  const distance =
    parseFloat(
      document
        .getElementById(
          "distance"
        )
        .value
    );


  const unit =
    document
      .getElementById(
        "distanceUnit"
      )
      .value;


  const hours =
    milliseconds /
    3600000;


  if (hours <= 0)
    return "-";


  const speed =
    distance /
    hours;


  return (
    speed.toFixed(2)
    +
    " "
    +
    (
      unit === "km"
        ? "km/h"
        : "mph"
    )
  );
}


/* ================================
   FORMAT RACE TIME
================================ */

function formatTime(ms) {

  let total =
    Math.max(
      0,
      Math.floor(ms)
    );


  const hours =
    Math.floor(
      total /
      3600000
    );


  total %=
    3600000;


  const minutes =
    Math.floor(
      total /
      60000
    );


  total %=
    60000;


  const seconds =
    Math.floor(
      total /
      1000
    );


  const hundredths =
    Math.floor(
      (total % 1000) /
      10
    );


  return (

    String(hours)
      .padStart(2, "0")

    +

    ":"

    +

    String(minutes)
      .padStart(2, "0")

    +

    ":"

    +

    String(seconds)
      .padStart(2, "0")

    +

    "."

    +

    String(hundredths)
      .padStart(2, "0")

  );
}


/* ================================
   CLOCK TIME
================================ */

function clockTime(date) {

  if (!date)
    return "";


  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}


/* ================================
   EXPORT CSV
================================ */

function exportCSV() {

  if (!competitors.length) {

    alert(
      "There are no competitors."
    );

    return;
  }


  const raceName =
    document
      .getElementById(
        "raceName"
      )
      .value
      .trim();


  const raceClass =
    getRaceClass();


  const distance =
    document
      .getElementById(
        "distance"
      )
      .value;


  const unit =
    document
      .getElementById(
        "distanceUnit"
      )
      .value;


  const finished =
    competitors
      .filter(
        c => c.finished
      )
      .sort(
        (a, b) =>
          a.finishPerformance -
          b.finishPerformance
      );


  let csv = "";


  /*
     Race name.
  */

  csv +=
    csvValue(
      raceName
    )
    +
    "\n";


  /*
     Class and distance.
  */

  csv +=
    csvValue(
      raceClass
      +
      " — "
      +
      distance
      +
      " "
      +
      unit
    )
    +
    "\n";


  csv += "\n";


  /*
     Results columns.
  */

  csv +=
    "Place,Bib,Name,Finished Elapsed Time,Average Speed\n";


  finished.forEach(
    (c, index) => {

      csv += [

        index + 1,

        csvValue(
          c.bib
        ),

        csvValue(
          c.name
        ),

        csvValue(
          formatTime(
            c.elapsed
          )
        ),

        csvValue(
          averageSpeed(
            c.elapsed
          )
        )

      ].join(",")
      +
      "\n";

    }
  );


  /*
     Create downloadable CSV.
  */

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href = url;


  const safeName =
    raceName
      .replace(
        /[^a-z0-9]/gi,
        "_"
      );


  link.download =
    (
      safeName ||
      "dog_sled_race"
    )
    +
    "_results.csv";


  document
    .body
    .appendChild(
      link
    );


  link.click();


  document
    .body
    .removeChild(
      link
    );


  URL.revokeObjectURL(
    url
  );
}


/* ================================
   CSV FORMATTING
================================ */

function csvValue(value) {

  return (
    '"'
    +
    String(value)
      .replace(
        /"/g,
        '""'
      )
    +
    '"'
  );
}


/* ================================
   HTML SECURITY
================================ */

function escapeHTML(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}


/* ================================
   RESET RACE
================================ */

function resetRace() {

  if (
    raceStarted &&
    !confirm(
      "Reset this race? All results will be lost."
    )
  ) {

    return;
  }


  clearInterval(timer);

  timer = null;


  clearSavedRaceState();


  raceStarted = false;

  competitors = [];

  finishOrder = [];


  document
    .getElementById(
      "raceClock"
    )
    .textContent =
    "00:00:00.00";


  document
    .getElementById(
      "status"
    )
    .textContent =
    "Ready";


  document
    .getElementById(
      "raceTitle"
    )
    .textContent =
    "Ready";


  document
    .getElementById(
      "finishSection"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "startButton"
    )
    .textContent =
    "▶ START RACE";


  document
    .getElementById(
      "startButton"
    )
    .classList.remove(
      "running"
    );


  document
    .querySelectorAll(
      "#setup input, #setup select, #setup button"
    )
    .forEach(
      el => {
        el.disabled = false;
      }
    );


  document
    .getElementById(
      "results"
    )
    .innerHTML = `

      <div class="empty">
        Results will appear here.
      </div>

    `;


  document
    .getElementById(
      "customClass"
    )
    .value = "";


  document
    .getElementById(
      "raceClass"
    )
    .value =
    "1 Dog Scooter";


  toggleCustomClass();


  createCompetitors();
}


/* ================================
   SAVE SETUP CHANGES
================================ */

function setupChanged() {

  if (!raceStarted) {
    saveRaceState();
  }
}


/* ================================
   SERVICE WORKER
================================ */

function registerOfflineApp() {

  if (
    "serviceWorker" in navigator
  ) {

    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register(
            "./sw.js"
          )
          .then(
            registration => {

              console.log(
                "Offline mode ready.",
                registration
              );

            }
          )
          .catch(
            error => {

              console.warn(
                "Offline mode could not be registered:",
                error
              );

            }
          );

      }
    );

  }
}


/* ================================
   INITIALISE APP
================================ */

function initialiseApp() {

  /*
     Make sure the custom class box
     starts hidden.
  */

  toggleCustomClass();


  /*
     Create the default competitor
     list.
  */

  createCompetitors();


  /*
     Check for an unfinished race.
  */

  checkForSavedRace();


  /*
     Enable offline operation.
  */

  registerOfflineApp();
}


initialiseApp();
