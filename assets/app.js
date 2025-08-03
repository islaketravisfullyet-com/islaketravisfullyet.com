const CSV_URL = "./assets/data/travis-10year.csv";
const FULL_CSV_URL = "./assets/data/travis.csv";
const PRIMARY_COLOR = "#239bcf";
const ACCENT_COLOR = "#0791cc";
const DEFAULT_RANGE = "1m"; // Default range to show on initial load
const FULL_WATER_LEVEL = 681.0; // Full water level in feet
const chartRanges = {
  "1m": 30,
  "1y": 365,
  "10y": 365 * 10,
  all: Infinity,
};

let chart;

async function fetchCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return text;
}

// Parse CSV text into structured data
// Assumes CSV has comment lines preceded by a # character, then a header row, then the data rows
function parseCSV(text) {
  const lines = text
    .split("\n")
    .filter((line) => !line.startsWith("#") && line.trim());
  const columnHeaders = lines[0].split(",");
  const data = [];
  // Iterate over each line after the header, creating an object for each row with properties based on column headers
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== columnHeaders.length) continue; // Skip malformed rows
    const row = {};
    for (let j = 0; j < columnHeaders.length; j++) {
      row[columnHeaders[j].trim()] = cols[j] ? cols[j].trim() : null;
    }
    data.push(row);
  }
  return data;
}

function filterDataByRange(data, rangeKey) {
  if (rangeKey === "all") return data;
  const days = chartRanges[rangeKey];
  const endDate = new Date(data[data.length - 1].date);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - days);
  return data.filter((row) => new Date(row.date) >= startDate);
}

function mapRowToFullness(row) {
  const { reservoir_storage, conservation_capacity, dead_pool_capacity } = row;
  const reservoir = Number(reservoir_storage);
  const conservation = Number(conservation_capacity);
  const deadPool = Number(dead_pool_capacity);
  return ((reservoir - deadPool) / conservation) * 100;
}

function mapRowToFeetRemaining(row) {
  const { water_level } = row;
  const currentWaterLevel = Number(water_level);
  return FULL_WATER_LEVEL - currentWaterLevel;
}

function answerQuestion(data) {
  const latestData = data[data.length - 1];
  const percentFull = mapRowToFullness(latestData);
  const feetRemaining = mapRowToFeetRemaining(latestData);

  const answerText = document.getElementById("answer-text");
  const answerDetails = document.getElementById("answer-details");
  if (percentFull >= 100) {
    answerText.textContent = "Yep 🎉";
    answerDetails.textContent = "";
  } else {
    answerText.textContent = "Nope";
    answerDetails.textContent = `${(100 - percentFull).toFixed(
      2
    )}% (${feetRemaining.toFixed(2)} ft) to go`;
  }
}

function renderChart(data, rangeKey) {
  const ctx = document.getElementById("lake-chart").getContext("2d");
  if (chart) chart.destroy();

  const baseTickConfig = {
    color: ACCENT_COLOR,
    textStrokeColor: "#ffffff",
    textStrokeWidth: 3,
    z: 10, // ensure ticks are above data and grid lines
    font: {
      size: 14,
      weight: "bold",
    },
  };

  // Get the current fullness value
  const currentFullness =
    data.length > 0 ? mapRowToFullness(data[data.length - 1]) : null;
  const currentWaterLevel =
    data.length > 0 && data[data.length - 1].water_level
      ? data[data.length - 1].water_level
      : null;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((row) => row.date),
      datasets: [
        {
          label: "Percent full",
          data: data.map(mapRowToFullness),
          borderColor: ACCENT_COLOR,
          backgroundColor: PRIMARY_COLOR,
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "yyyy-MM-dd",
          },
          title: {
            display: false,
          },
          grid: {
            drawTicks: false,
            display: false, // Hide x-axis grid lines
          },
          ticks: {
            ...baseTickConfig,
            maxRotation: 0,
            maxTicksLimit: rangeKey === "1y" ? 12 : 10,
            padding: -20, // move tick labels into chart area
          },
          afterUpdate: function (scale) {
            // Fix for the first date tick adding padding to the left of the page
            scale.paddingLeft = 0;
          },
        },
        y: {
          min: 0,
          suggestedMax: 100, // prefer a max of 100%, but allow autoscaling
          title: {
            display: false,
          },
          grid: {
            drawTicks: false,
          },
          ticks: {
            ...baseTickConfig,
            mirror: true,
            padding: 0,
            callback: function (value, index, ticks) {
              // Hide the first tick
              if (index === 0) return null;
              // Append % to y-axis labels
              return " " + value + "%";
            },
          },
          afterUpdate: function (scale) {
            // Fix for the first fill percent tick adding padding to the bottom of the page
            scale.paddingBottom = 0;
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: "index",
          intersect: false,
          displayColors: false,
          callbacks: {
            label: function (context) {
              const value = context.parsed.y.toFixed(2);
              // Find the original data row for this index
              const dataIndex = context.dataIndex;
              const row = data[dataIndex];
              let lines = [`${value}% full`];
              if (row && row.water_level) {
                lines.push(`${row.water_level} feet`);
              }
              return lines;
            },
          },
        },
        annotation: {
          annotations:
            currentFullness !== null
              ? {
                  fullnessLine: {
                    type: "line",
                    yMin: currentFullness,
                    yMax: currentFullness,
                    borderColor: ACCENT_COLOR,
                    borderWidth: 1,
                    borderDash: [10, 10],
                    label: {
                      display: true,
                      content: [
                        `Now: ${currentFullness.toFixed(2)}%`,
                        currentWaterLevel ? `${currentWaterLevel} ft` : "",
                      ].filter(Boolean),
                      position: "end",
                      textAlign: "end",
                      color: ACCENT_COLOR,
                      backgroundColor: "transparent",
                      textStrokeColor: "#ffffff",
                      textStrokeWidth: 3,
                    },
                  },
                }
              : {},
        },
        decimation: {
          enabled: true,
          algorithm: "min-max",
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
    plugins: [
      window["ChartAnnotation"],
      {
        // Custom plugin to add DOM element above the fullnessLine
        id: "fullnessWave",
        afterLayout: function (chartInstance) {
          // Get chart canvas position
          const canvas = chartInstance.canvas;
          const rect = canvas.getBoundingClientRect();

          let box = document.getElementById("fullness-wave");

          if (currentFullness === null) return;

          // Find the pixel y position of the fullnessLine
          const yScale = chartInstance.scales.y;
          if (!yScale) return;
          const y = yScale.getPixelForValue(currentFullness);

          // Position the bottom of the box at the annotation line
          box.style.top = rect.top + window.scrollY + y + "px";
        },
      },
    ].filter(Boolean),
  });
}

function setActiveButton(rangeKey) {
  document.querySelectorAll("#controls button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.range === rangeKey);
  });
}

let isFullDataLoaded = false;

async function init() {
  let csvText = await fetchCSV(CSV_URL);
  let rawData = parseCSV(csvText);
  let currentRange = DEFAULT_RANGE;
  setActiveButton(currentRange);
  renderChart(filterDataByRange(rawData, currentRange), currentRange);
  answerQuestion(rawData);
  document.querySelectorAll("#controls button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentRange = btn.dataset.range;
      if (currentRange === "all" && !isFullDataLoaded) {
        // If "all" is selected, fetch the full dataset
        btn.classList.add("loading");
        csvText = await fetchCSV(FULL_CSV_URL);
        rawData = parseCSV(csvText);
        btn.classList.remove("loading");
        isFullDataLoaded = true;
      }
      setActiveButton(currentRange);
      renderChart(filterDataByRange(rawData, currentRange), currentRange);
      answerQuestion(rawData);
    });
  });
}

window.addEventListener("DOMContentLoaded", init);
