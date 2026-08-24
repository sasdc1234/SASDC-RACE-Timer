let startInterval = 15;
let competitors = [];
let raceStarted = false;
let raceStartPerformance = 0;
let raceStartDate = null;
let timer = null;
let finishOrder = [];

const STORAGE_KEY = "dogSledRaceTimerState_v1";
let resumePromptShown = false;


/* ================================
   LOCAL SAVE / RECOVERY
================================ */

function saveRaceState() {

  try {

    const state = {

      startInterval,

      competitors,

      raceStarted,

      raceStartPerformance,

      raceStartDate:
        raceStartDate
          ? raceStartDate.toISOString()
          : null,

      finishOrder,

      raceName:
        document.getElementById("raceName")?.value || "",

      raceClass:
        document.getElementById("raceClass")?.value || "",

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
   RESTORE SAVED RACE
================================ */

function restoreRaceState(state) {

  if (!state) return false;


  startInterval =
    Number(state.startInterval) || 15;


  competitors =
    Array.isArray(state.competitors)
      ? state.competitors
      : [];


  raceStarted =
    Boolean(state.raceStarted);


  raceStartPerformance =
    Number(state.raceStartPerformance) || 0;


  raceStartDate =
    state.raceStartDate
      ? new Date(state.raceStartDate)
      : null;


  finishOrder =
    Array.isArray(state.finishOrder)
      ? state.finishOrder
      : [];


  document
    .getElementById("raceName")
    .value =
    state.raceName || "";


  document
    .getElementById("raceClass")
    .value =
    state.raceClass || "4 Dog";


  document
    .getElementById("distance")
    .value =
    state.distance || "10";


  document
    .getElementById("distanceUnit")
    .value =
    state.distanceUnit || "km";


  document
    .getElementById("competitorCount")
    .value =
    competitors.length || 1;


  if (
    !competitors.length ||
    !raceStarted
  ) {

    createCompetitors();

    return false;
  }


  /*
     performance.now() resets when the
     page/browser is reopened.

     Reconstruct the performance timeline
     from the saved real-world start time.
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


  competitors.forEach(c => {

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

  });


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
    .classList.add("running");


  const raceClass =
    document
      .getElementById("raceClass")
      .value;


  const raceName =
    document
      .getElementById("raceName")
      .value
      .trim();


  document
    .getElementById("raceTitle")
    .textContent =
    `${raceName} — ${raceClass}`;


  document
    .getElementById("finishSection")
    .classList.remove("hidden");


  createFinishButtons();

  renderResults();

  updateClock();


  /*
     If everyone had already finished,
     don't restart the clock.
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


  if (resumePromptShown) return;

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

    restoreRaceState(saved);

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

  if (raceStarted) return;


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

  if (raceStarted) return;


  const count =
    parseInt(
      document
        .getElementById(
          "competitorCount"
        )
        .value
    ) || 1;


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


    container.appendChild(row);
  }
}


/* ================================
   START RACE
================================ */

function startRace() {

  if (raceStarted) return;


  const raceName =
    document
      .getElementById("raceName")
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
        .getElementById("distance")
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
     High accuracy race clock.
  */

  raceStartPerformance =
    performance.now();


  raceStartDate =
    new Date();


  /*
     Give every competitor their
     individual staggered start time.
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
     Show race information.
  */

  const raceClass =
    document
      .getElementById("raceClass")
      .value;


  document
    .getElementById("raceTitle")
    .textContent =
    `${raceName} — ${raceClass}`;


  /*
     Show finish buttons.
  */

  document
    .getElementById("finishSection")
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

  if (!raceStarted) return;


  const c =
    competitors[index];


  /*
     Don't allow the same competitor
     to be finished twice.
  */

  if (c.finished) return;


  const now =
    performance.now();


  c.finishPerformance =
    now;


  c.finishDate =
    new Date();


  /*
     Calculate race time from the
     competitor's own staggered
     start time.
  */

  c.elapsed =
    Math.max(
      0,
      now -
      c.startPerformance
    );


  c.finished = true;


  /*
     Remember finish order.
  */

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
     Stop the main clock once
     everyone has finished.
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

  if (
    !finishOrder.length
  ) {

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


  /*
     Restart clock if necessary.
  */

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

  if (!raceStarted) return;


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


  /*
     Sort by actual finish order.
  */

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

          Total time:

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
   EXPORT RESULTS
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
    document
      .getElementById(
        "raceClass"
      )
      .value;


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


  /*
     Race name appears once.
  */

  let csv = "";


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
     Column headings.
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
     Create CSV file.
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


  /*
     Delete the saved race.
  */

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


  /*
     Unlock setup controls.
  */

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


  createCompetitors();
}


/* ================================
   INITIALISE APP
================================ */

createCompetitors();

checkForSavedRace();
