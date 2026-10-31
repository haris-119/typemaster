# TypeMaster – Typing Speed Test

A fully client-side typing speed test application built with HTML, CSS, and Vanilla JavaScript.  
No backend, no build tools, no framework — open `index.html` and start typing.

---

## Project Structure

```
typemaster-typing-speed-test/
├── index.html    Main application shell
├── style.css     All styles (dark theme, responsive)
├── script.js     Typing test engine, timer, LocalStorage
└── README.md     This file
```

---

## How to Run

1. **Open directly in a browser**

   Double-click `index.html` — no server required.  
   All features work immediately.

2. **Optional: serve with a local HTTP server**

   ```bash
   # Node.js
   npx serve .

   # Python
   python -m http.server 8080
   ```

   Then open `http://localhost:8080` in your browser.

---

## Features

| Feature | Details |
|---|---|
| 10 varied text passages | A new random passage is chosen on each test |
| Duration selector | 30 s / 60 s / 120 s — change at any time |
| Character highlighting | Green = correct · Red = wrong · Underline cursor |
| Timer | Starts on first keystroke · Pulses red at ≤ 5 s |
| Auto-finish | Test ends when the full passage is typed |
| Live stats | WPM, Accuracy, Correct characters, Errors — updated every keystroke |
| Result screen | Final WPM, Accuracy, Errors, evaluation message |
| Best Score | Saved in LocalStorage — survives page refresh and browser close |
| Try Again / Restart | Resets timer, passage, and all stats |
| Responsive layout | Desktop, tablet, and mobile |

---

## LocalStorage

| Key | Value | Notes |
|---|---|---|
| `typemaster_best_score` | Integer (WPM) | Persists across sessions and page refreshes |

To clear your best score, open the browser console and run:
```js
localStorage.removeItem('typemaster_best_score');
```

---

## Browser Compatibility

Works in all modern browsers:  
Chrome 60+, Firefox 55+, Safari 10.1+, Edge 16+
