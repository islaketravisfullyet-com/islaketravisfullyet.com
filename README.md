# Is Lake Travis Full Yet?

This is a [single-serving site](https://en.wikipedia.org/wiki/Single-serving_site) to display water levels for Lake Travis in Austin, TX.

It's hosted at: [islaketravisfullyet.com](https://islaketravisfullyet.com/)

It's intended to improve on a related project, [isthelakefullyet.com](https://isthelakefullyet.com/), which [was open-source](https://github.com/sophshep/isthelakefullyet) but has since been forked and gone private. This site adds historical data and uses data directly from [Water Data For Texas](https://waterdatafortexas.org/reservoirs), a product of the [Texas Water Development Board](http://www.twdb.texas.gov/).

Contributions are welcome. Just open a pull request.

## Development

Development is intended to be as light as possible. The repo requires no build process. It is based on static files.

The site is hosted for free on GitHub Pages. Data is refreshed by using a GitHub workflow intended to run within [the free limits of GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions#included-storage-and-minutes).

The domain is owned by [Trey Philips](https://www.treyp.com).

### Running locally

You can just launch the HTML file in your browser, but you'll run into CORS problems fetching data from the `file:///` protocol.

To get around that, just run a simple Python web server to host the files which requires no dependencies:

```sh
python3 -m http.server 8000
```

Then visit: http://localhost:8000/
