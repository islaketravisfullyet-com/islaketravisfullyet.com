const CSV_URL = "./assets/data/travis-10year.csv";
const FULL_CSV_URL = "./assets/data/travis.csv";
const LIVE_JSON_URL = "./assets/data/travis-live.json";
const PRIMARY_COLOR = "#239bcf";
const ACCENT_COLOR = "#0791cc";
const WHITE_COLOR = "#ffffff";
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

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  const reservoirStorage = Number(row.reservoir_storage);
  const conservationCapacity = Number(row.conservation_capacity);
  const deadPoolCapacity = Number(row.dead_pool_capacity);
  return ((reservoirStorage - deadPoolCapacity) / conservationCapacity) * 100;
}

function mapRowToFeetRemaining(row) {
  const currentWaterLevel = Number(row.water_level);
  return FULL_WATER_LEVEL - currentWaterLevel;
}

// Only returns live data if it is more recent than the latest historical data point
function getRecentLiveData(historicalData, liveData) {
  if (!historicalData.length || !liveData) return null;

  const latestHistoricalData = historicalData[historicalData.length - 1];
  const latestHistoricalDate = parseDate(latestHistoricalData.date);
  const liveReadDate = parseDate(liveData.readDate);

  if (!latestHistoricalDate || !liveReadDate) return null;
  if (liveReadDate < latestHistoricalDate) return null;

  return liveData;
}

function answerQuestion(combinedData) {
  const latestData = combinedData[combinedData.length - 1];
  const percentFull = latestData.percentFull;
  const feetRemaining =
    latestData.waterLevel != null
      ? FULL_WATER_LEVEL - latestData.waterLevel
      : 0;

  const answerText = document.getElementById("answer-text");
  const answerDetails = document.getElementById("answer-details");
  if (percentFull >= 100) {
    answerText.textContent = "Yup 💦";
    answerDetails.textContent = "";
  } else {
    answerText.textContent = "Nope";
    answerDetails.textContent = `${(100 - percentFull).toFixed(
      2,
    )}% (${feetRemaining.toFixed(2)} ft) to go`;
  }
}

function renderChart(combinedData, rangeKey) {
  const ctx = document.getElementById("lake-chart").getContext("2d");
  if (chart) chart.destroy();

  const baseTickConfig = {
    color: WHITE_COLOR,
    textStrokeColor: PRIMARY_COLOR,
    textStrokeWidth: 4,
    z: 10, // ensure ticks are above data and grid lines
    font: {
      size: 14,
      weight: "bold",
    },
  };

  const latestData = combinedData[combinedData.length - 1] ?? null;
  const currentFullness = latestData?.percentFull ?? null;
  const currentWaterLevel = latestData?.waterLevel ?? null;

  const labels = combinedData.map((row) => row.date);
  const values = combinedData.map((row) => row.percentFull);

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Percent full",
          data: values,
          borderColor: ACCENT_COLOR,
          backgroundColor: PRIMARY_COLOR,
          fill: true,
          pointBackgroundColor: ACCENT_COLOR,
          pointBorderWidth: 0,
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
            autoSkipPadding: 30,
            padding: -26, // move tick labels into chart area, font is 14px
          },
          afterUpdate: function (scale) {
            // Fix for the first date tick adding padding to the left of the page
            scale.paddingLeft = 0;
            scale.ticks[0].label = ""; // Hide the first tick label;
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
              // Prepend space-based padding due to this bug:
              // https://github.com/chartjs/Chart.js/issues/11739
              // Also, append % to y-axis labels
              return "   " + value + "%";
            },
          },
          afterUpdate: function (scale) {
            // Fix for the first fill percent tick adding padding to the bottom of the page
            scale.paddingBottom = 0;
          },
        },
      },
      elements: {
        point: {
          radius: 0,
          hoverRadius: 10,
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
              const dataIndex = context.dataIndex;
              const row = combinedData[dataIndex];
              const lines = [`${value}% full`];

              if (row?.waterLevel != null) {
                lines.push(`${row.waterLevel.toFixed(2)} feet`);
              }

              return lines;
            },
          },
          titleFont: {
            size: 16,
          },
          bodyFont: {
            size: 16,
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
                        `${currentFullness.toFixed(2)}% full`,
                        currentWaterLevel
                          ? `${currentWaterLevel.toFixed(2)} feet`
                          : "",
                      ].filter(Boolean),
                      position: "end",
                      yAdjust: 30,
                      textAlign: "end",
                      font: {
                        size: 20,
                      },
                      color: WHITE_COLOR,
                      backgroundColor: "transparent",
                      textStrokeColor: PRIMARY_COLOR,
                      textStrokeWidth: 6,
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

// Returns basic data for a combined data set, using historical data and including live data if available and recent
function buildCombinedData(historicalData, recentLiveData) {
  const combinedData = historicalData.map((row) => ({
    date: row.date,
    percentFull: mapRowToFullness(row),
    waterLevel: row.water_level ? Number(row.water_level) : null,
  }));

  if (recentLiveData) {
    const lastHistoricalDate = combinedData[combinedData.length - 1]?.date;
    const recentLiveDate = recentLiveData.readDate?.slice(0, 10);

    const recentLiveDataEntry = {
      date: recentLiveDate,
      percentFull: recentLiveData.percentFull,
      waterLevel: recentLiveData.waterLevel,
    };

    if (lastHistoricalDate === recentLiveDate) {
      combinedData[combinedData.length - 1] = recentLiveDataEntry;
    } else {
      combinedData.push(recentLiveDataEntry);
    }
  }

  return combinedData;
}

let isFullDataLoaded = false;

async function init() {
  let [historicalCsvString, liveData] = await Promise.all([
    fetchCSV(CSV_URL),
    fetchJSON(LIVE_JSON_URL),
  ]);

  let historicalData = parseCSV(historicalCsvString);
  let currentRange = DEFAULT_RANGE;
  let recentLiveData = getRecentLiveData(historicalData, liveData);
  let combinedData = buildCombinedData(historicalData, recentLiveData);

  setActiveButton(currentRange);
  renderChart(filterDataByRange(combinedData, currentRange), currentRange);
  answerQuestion(combinedData);

  document.querySelectorAll("#controls button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      currentRange = btn.dataset.range;

      // If "all" is selected, fetch the full dataset
      if (currentRange === "all" && !isFullDataLoaded) {
        btn.classList.add("loading");
        historicalCsvString = await fetchCSV(FULL_CSV_URL);
        historicalData = parseCSV(historicalCsvString);
        btn.classList.remove("loading");
        isFullDataLoaded = true;
      }

      setActiveButton(currentRange);
      recentLiveData = getRecentLiveData(historicalData, liveData);
      combinedData = buildCombinedData(historicalData, recentLiveData);
      renderChart(filterDataByRange(combinedData, currentRange), currentRange);
      answerQuestion(combinedData);
    });
  });
}

window.addEventListener("DOMContentLoaded", init);
