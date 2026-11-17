# Madden Osherow — portfolio site

A one-page portfolio with a 3D dot animation. It is plain HTML, CSS, and
JavaScript: there is nothing to install and no build step.

Live at https://mosherow.github.io/ (first published Nov 16, 2026). GitHub
Pages serves whatever is on the `main` branch of the `mosherow.github.io`
repository, so pushing a change there updates the live site in about a minute.

## See it

The easiest way is to ask Claude: "start the portfolio preview".

To do it yourself, run this in Terminal from this folder, then open
http://localhost:4173 in a browser:

```bash
python3 tools/serve.py
```

Double-clicking `index.html` also opens the page, but browsers block the dot
animation for files opened that way, so you will see a plain photo instead.
Use the preview above to see the real thing.

## Where things are

| File | What it holds |
|---|---|
| `index.html` | All the words on the page. Each section is labeled with a comment. |
| `css/style.css` | Colors, fonts, and layout. Colors and fonts are at the very top. |
| `js/particles.js` | The 3D dot animation. Shape positions and sizes are in `SCENES` at the top. |
| `js/main.js` | Fade-in effects and the menu highlight. |
| `assets/img/` | Photos shown on the page. |
| `assets/shapes/` | Cut-out photos the dots are built from. |
| `tools/` | Helper scripts (preview server, photo cut-out tool). Not part of the site. |

## Common changes

- **Change wording:** edit the text in `index.html` and refresh the browser.
- **Change a color:** edit the values under `:root` at the top of `css/style.css`.
- **Swap a photo:** replace the file in `assets/img/` with a new one of the same name.
- **Update the résumé:** replace `assets/Madden-Osherow-Resume.pdf` with a new
  PDF of the same name.
- **Change the photo the dots form:** run the cut-out tool on a new photo.
  For the opening portrait:

  ```bash
  swift tools/make_shape.swift "path/to/photo.jpg" assets/shapes/portrait.png 720
  ```

  For the guitar figure, use `assets/shapes/guitarist.png` as the output name.

## Publishing a change

The easiest way is to ask Claude to make the change and publish it. By hand,
from this folder:

```bash
git add -A && git commit -m "Describe the change" && git push
```

## Still to do

- Confirm the short descriptions under Leadership.
- Make the job titles match between the site ("Job Shadow") and the résumé PDF ("Intern").
