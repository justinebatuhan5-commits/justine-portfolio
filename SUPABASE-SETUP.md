# Connect personal access approval

The interface and database migration are prepared. No Supabase project is connected yet, so requests are disabled. Beach Club stays public. Sound Diary and Evaluation Studio now show Request access.

## 1. Create your project

Open https://supabase.com/dashboard and create a project in your organization. Choose a database password and store it privately. Wait until the project is ready. In the project's connection/API settings, copy the project URL and publishable key (or legacy anon key). These two values are public. Do not copy a secret or service-role key into the website or chat.

Edit `access-config.js`:

```js
window.PortfolioAccessConfig=Object.freeze({
 url:'https://YOUR-PROJECT-REF.supabase.co',
 publicKey:'YOUR-PUBLIC-PUBLISHABLE-OR-ANON-KEY',
 evaluationUrl:''
});
```

Leave evaluationUrl empty until that application checks approval itself. A public URL cannot enforce permission just because it is hidden in the portfolio.

## 2. Configure email verification

Enable the email provider in Authentication. Configure production SMTP before opening requests to visitors; the default mail service has delivery restrictions. In the Magic Link email template, replace the sign-in link with a code using `{{ .Token }}`. This interface asks visitors to type that code; it does not use magic-link redirects. Keep the email rate limits enabled. Enable Supabase-supported CAPTCHA and add its frontend token integration before opening anonymous sign-up to a large audience if abuse occurs; the current interface does not include CAPTCHA.

Official guide: https://supabase.com/docs/guides/auth/auth-email-passwordless

## 3. Install the database and private bucket

Open SQL Editor and run `supabase/access.sql` once in a new project. The transaction creates the request tables, owner-only approval functions, request privacy policies, and a private storage bucket. Re-running it on the same project fails rather than silently changing existing policies.

Requests are tied to a verified account. Each account can submit one request per project; repeated submissions cannot reset a decision. Only the owner can approve, decline, or revoke. Approval lasts seven days. Visitors cannot read other visitors' details or update their own approval status.

Official guides: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/storage/security/access-control

## 4. Register yourself as the owner

Start the local server with `node server.cjs`. Open the portfolio and choose Manage access in the footer. Enter your own email, request a code, and verify it. In Supabase Authentication > Users, find that verified account and copy its user UUID. Run this in SQL Editor, replacing the placeholder:

```sql
insert into public.portfolio_access_owners(user_id)
values ('YOUR-OWNER-USER-UUID');
```

Sign out and sign in again on the portfolio. Manage access will now show all requests with Approve for 7 days, Decline, and Revoke buttons. The database checks your owner membership for every decision. The footer button alone grants no privileges.

## 5. Move Sound Diary to private delivery

In Storage, upload your existing `assets/downloads/Sound-Diary.apk` into the PRIVATE `portfolio-private` bucket, at its root with the exact name `Sound-Diary.apk`. Keep the bucket private. Do not add a public read policy.

After you approve a visitor, they sign in, check their request status, and click Download Sound Diary. The storage service checks their approval and expiry before returning the file. Downloads use authenticated requests; no service-role key or permanent public download link is exposed.

The local preview no longer serves the public APK path, but the APK remains in your local files and may already be available in the public GitHub repository/history. Remove it from public deployment and the current public repository before claiming new visitors must have approval. Older public history and copies already downloaded can remain accessible. A downloaded APK can be shared, and revoking approval cannot remove an installed app. In-app sign-in is needed to restrict installed usage.

## 6. Protect Evaluation Studio

At Evaluation Studio's own host, add Supabase email sign-in and call `portfolio_has_access` with `p_project: 'evaluation-studio'`. Protect its backend data/actions with authorization checks too. A client-only redirect check cannot secure a publicly downloadable static tool. Until the application can enforce access, keep evaluationUrl empty: approved requests show that project access is still being configured.

When enforcement is verified, set evaluationUrl to its HTTPS address. Visitors sign in separately there; do not place authentication tokens in its URL.

## 7. Verify before publishing

Use separate owner and visitor accounts. Test: unauthenticated requests fail; a pending visitor cannot download; visitors cannot approve themselves or read other requests; owner approval enables download; expiry/revocation blocks subsequent downloads; repeated requests do not create duplicates; Evaluation Studio denies direct access without an active approval.

The JavaScript and existing local security tests were checked. Live Supabase policies and email delivery still need testing after configuration. The owner inbox has no automatic email notifications yet: open Manage access to review requests. Visitors use Check status to retrieve your decision. To email decisions automatically, add a server-side mail integration after selecting a provider and configuring credentials.

## 8. Publish together

Deploy `index.html`, `styles.css`, `script.js`, `validation.js`, `access.js`, `access-config.js`, and public image assets together. Exclude the public APK, SQL, server files, tests, and setup documents. Configure the host's CSP to permit HTTPS connections to YOUR Supabase project. The local server permits `https://*.supabase.co`; narrow production connect-src to your specific project URL. GitHub Pages cannot apply server-side database access rules: Supabase enforces them.

Sessions are kept in page memory and cleared on refresh. Visitors sign in again when returning; personal request data is not saved in browser localStorage. Activity counts remain browser-local and are not global visitor analytics.
