# YD Online MBA mirror (optional)

To serve the **saved HTML + asset folder** from this repo (instead of the live-site iframe fallback on Vercel), copy:

- `YD Online MBA.html`
- the folder `YD Online MBA_files/`

into this directory:

`public/yd-online-mba-mirror/`

So you have:

- `public/yd-online-mba-mirror/YD Online MBA.html`
- `public/yd-online-mba-mirror/YD Online MBA_files/...`

Alternatively set on the host:

- `YD_ONLINE_MBA_HTML_PATH` — absolute path to the HTML file
- `YD_ONLINE_MBA_MIRROR_ROOT` — directory that contains both the HTML file and `YD Online MBA_files/`

If none of these exist, `/yd-online-mba` serves a full-page iframe to the public YourDegree Online MBA URL.
