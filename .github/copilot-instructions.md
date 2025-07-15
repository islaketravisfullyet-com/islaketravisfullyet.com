This is a simple webpage for displaying information about the current water levels for a lake, Lake Travis. The website is called “Is Lake Travis Full Yet?”

This is a static website hosted on GitHub Pages. We fetch data about current water levels from remote data sources. Keep this page simple by using HTML, CSS, and JavaScript, each in a separate file, avoiding a build process if possible.

This page has an interactive line chart taking up the full width and height of the page. Chart.js is used to render the chart. The chart displays how full Lake Travis is over time, with the x-axis showing dates and the y-axis showing the percent full. The chart should be responsive and adapt to different screen sizes.

Users are able to customize the amount of time displayed in the chart with options for 1 month, 1 year, 5 years, 10 years, and all. The default should be 10 years. The selected time range should stand out.

The chart data is sourced from a CSV originally located here: https://waterdatafortexas.org/reservoirs/individual/travis.csv. Ignore the comments at the top (lines preceded with a #). The percent full is calculated by the following formula: ((reservoir_storage - dead_pool_capacity) / conservation_capacity). We cannot use the percent_full column because it refers to conservation capacity only, not the entire reservoir.
