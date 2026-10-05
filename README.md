# Site Source Extractor

Extract front-end source code from any public website into a ZIP file.

Downloads:
- HTML
- CSS (linked stylesheets)
- JavaScript (linked scripts)
- Images
- Fonts

## Requirements

- Node.js 18+
- Google Chrome (or Chromium / Edge)

## Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/site-source-extractor.git
cd site-source-extractor
npm start
```

Open http://localhost:3001

1. Paste a public URL
2. Click Extract
3. Download the ZIP

## Project structure

```
├── package.json
├── README.md
├── .gitignore
├── server/
│   └── index.js
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## License

MIT
