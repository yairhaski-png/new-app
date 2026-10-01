# Look Max

Mobile web app (installable on iPhone) that rates your look from a photo, suggests haircuts, and estimates calories and weight change from meal photos.

Plain HTML, CSS and JS with no build step. Accounts, data and the AI call run on Supabase.
Until `js/config.js` is filled in, the app runs in **demo mode**: data stays on the device and AI results are samples.

## Setup (about 15 minutes)

1. **Supabase project.** Create a free project at supabase.com.
2. **Tables.** SQL Editor > paste `supabase/schema.sql` > Run.
3. **Auth settings.** Authentication > Providers > Email: turn off "Confirm email" (so sign-up logs you straight in) and set minimum password length to 6.
   The extra rules (2 numbers, 1 capital letter) are enforced by the app's sign-up form.
4. **AI function.** Install the Supabase CLI, then:
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set ANTHROPIC_API_KEY=<your key from console.anthropic.com>
   supabase functions deploy analyze
   ```
   The key stays on Supabase and is never in this repo or the browser.
5. **Connect the app.** Put the Project URL and anon key (Project Settings > API) into `js/config.js` and commit.
6. **Publish.** Merge this branch into your default branch, then GitHub repo Settings > Pages > deploy from branch (root).
   The site is at `https://<user>.github.io/new-app/`.
7. **iPhone.** Open the link in Safari > Share > Add to Home Screen.

## Notes

- Weight estimate = starting weight + (calories eaten − maintenance calories) / 7700 per kg, over finished days where most meals were logged.
- Calorie values come from the AI's knowledge of typical foods, not a live web lookup.
- Reminders are shown inside the app when it is opened. Real background notifications would need a server job and web push (possible later; iOS requires the app added to the Home Screen).
- Anyone with an account can call the AI function and spend your API credit. Keep sign-up to people you trust, or turn sign-ups off in Supabase after creating your accounts.
