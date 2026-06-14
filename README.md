<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9c05c15b-e871-4681-94f7-5dab4b0a11f1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set the `VITE_FIREBASE_*` values in [.env.local](.env.local) when using a Firebase project other than the bundled development config.
4. Run the app:
   `npm run dev`

## Firebase Auth on Netlify

Firebase Authentication rejects sign-in requests from domains that are not explicitly authorized in the Firebase project. For Netlify deploys, add the production hostname and any preview hostname used for testing in Firebase Console under Authentication > Settings > Authorized domains.

For this site, the default Netlify hostname is `magical-mermaid-03dfd0.netlify.app`. Custom domains must be added there too after DNS is configured.
