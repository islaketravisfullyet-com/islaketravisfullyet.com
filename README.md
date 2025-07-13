# Is Lake Travis Full Yet?

This is a simple page to display water levels for Lake Travis.

## Running locally

You can just launch the HTML file in your browser, but you'll run into CORS issues fetching the data.

To get around that, just run a simple Python web server to host the files which requires no dependencies:

```sh
python3 -m http.server 8000
```

Then visit: http://localhost:8000/
