# IntellEducare website — production deployment package

A responsive, cinematic education website based on the approved student-focused design direction. The hero uses the supplied student artwork, with layered orbit effects, holographic panels, motion depth, program cards, learning approach, FAQs, centre enquiry and a counselling form.

## What's included

- `index.html` — complete public website
- `assets/site.css` — responsive layout, visual design, reduced-motion support and mobile styles
- `assets/site.js` — mobile navigation, accessible FAQ accordion, subtle pointer depth, scroll reveals, and form submission
- `assets/students-hero-wide.jpg` and `assets/students-hero-mobile.jpg` — responsive hero artwork
- `assets/program-*.jpg` — individually cropped learning-program card images
- `assets/hero-3d.js` — Three.js-powered interactive WebGL scene
- `api/enquiry.js` — server-side form validation and email delivery endpoint
- `privacy.html` and `terms.html` — starter legal pages, requiring IntellEducare's review before launch
- `vercel.json` — Vercel static hosting settings and basic security headers
- `.env.example` — names of the required environment variables; contains no real credentials

The hero includes a real-time WebGL scene powered by Three.js 0.186.1 (loaded as a pinned ES module from jsDelivr): 3D orbital rings, depth-layered particles, glowing nodes, and floating glass education panels. Pointer movement and page scroll subtly alter the scene for a 4D-inspired sense of depth and immersion (4D is a design description here, not literal four-dimensional rendering). A static CSS/image fallback remains if WebGL or the CDN is unavailable. The hero uses a separately art-directed 4:3 student image on mobile so both students stay in frame. It is optimised for desktop, tablet and phone layouts.

## Production email setup (required)

The website sends counselling enquiries to `Info@intelleducare.com` through a server-side Vercel Function and the Resend email API. The API key is never placed in browser JavaScript.

1. Create or sign in to a Resend account.
2. Add and verify `intelleducare.com` (or another domain you control) in Resend. Publish the DNS records Resend requests.
3. Create a Resend API key with permission to send emails.
4. In the Vercel project, open **Settings → Environment Variables** and add:
   - `RESEND_API_KEY` — your private Resend API key
   - `CONTACT_FROM_EMAIL` — a sender on the domain you verified, e.g. `IntellEducare Website <website@intelleducare.com>`
   - `CONTACT_TO_EMAIL` — `Info@intelleducare.com` (optional; this is the code default)
5. Set these variables for Production (and Preview if you test enquiry emails on preview deployments). Redeploy after changing variables.
6. Submit a real test enquiry on the deployed domain. Confirm delivery, reply-to behaviour and spam-folder handling before advertising the site.

Do not commit a real `.env` file, API key or other credentials to Git. `.env.example` is only a template. A sender address will not deliver in production until its sending domain/address is verified with your mail provider.

## Deploy to Vercel

### Dashboard / Git deployment

1. Extract this folder and put its **contents** at the root of a Git repository.
2. Import the repository in Vercel.
3. Select the **Other** framework preset. Use the project root as the root directory, leave the build command blank and set the output directory to `.`. The included `vercel.json` defines the output directory and headers.
4. Add the environment variables from the email setup section.
5. Deploy to Production, then map `intelleducare.com` (and optionally `www.intelleducare.com`) under the Vercel project's Domains settings and follow Vercel's DNS instructions.

### Vercel CLI

Install Node.js LTS and the Vercel CLI, log in, and run these commands from this directory:

```bash
npm install --global vercel
vercel login
vercel
```

The first command links/configures a preview deployment. Add the required Environment Variables in the Vercel dashboard, then deploy production:

```bash
vercel --prod
```

## Local preview

For a local preview, open this folder in VS Code, start Live Server, and use its `http://127.0.0.1:5500` URL. The immersive WebGL effect loads Three.js 0.186.1 from jsDelivr, so an internet connection and WebGL-capable browser are needed for the full motion layer. If it is unavailable, the local student artwork and CSS orbit fallback remain visible. The form API will not work on Live Server alone because `/api/enquiry` requires a serverless runtime.

To test the whole site and API locally, install the Vercel CLI as shown above, copy `.env.example` to `.env.local`, replace the example values with real credentials, and run:

```bash
vercel dev
```

Do not test production email delivery until Resend's sending domain is verified. Never use a real production API key in a repository.

## Before going live — business approval checklist

- Confirm current program names, class/standard ranges, boards, exam pathways and the courses available in each location.
- Confirm any official statistics, outcomes, testimonials, student photos, logo and brand wording before adding them. This starter deliberately does **not** publish unverified result percentages, student counts, addresses or rankings.
- Review `privacy.html` and `terms.html` with the business owner/legal advisor against real data retention and processing practices.
- Confirm the correct domain (`intelleducare.com`), its DNS, and email sending setup.
- Submit a test enquiry from a real phone and desktop browser; check the received email, reply address, spam filtering and form validation.
- Test the deployed site with keyboard navigation, mobile navigation, and an accessibility/SEO audit.

## Security notes

The API validates field lengths and formats, checks same-host request origins, uses a hidden honeypot, applies an in-process best-effort request limit, never exposes provider credentials to the browser and avoids logging enquiry content. The in-memory limit is not a distributed abuse-prevention system. For larger traffic or public promotion, add a managed bot challenge/rate limiter and monitor provider usage.

The website loads fonts from Google Fonts and the pinned Three.js 0.186.1 ES module from jsDelivr. If a fully self-contained deployment is required, vendor the Three.js library into local assets and update the CSP so the site no longer relies on third-party CDNs.
