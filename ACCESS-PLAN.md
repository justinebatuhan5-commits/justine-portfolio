# Personal project access approval

Selected implementation: Beach Club stays public. Sound Diary and Evaluation Studio use Supabase email verification, private requests, and owner-only approval. The local interface, SQL migration, and setup guide are prepared. Creating/configuring the Supabase project and protecting Evaluation Studio at its host remain required before this is live. See `SUPABASE-SETUP.md` for the chosen setup; the manual-email phase below is an alternative, not the implemented request flow.

## Visitor experience

Keep project previews visible. Restricted projects show Request access instead of opening the app or downloading a file. Collect the visitor's name, email, project, and reason. Explain that Justine reviews each request personally and that requesting access does not grant it.

## Phase 1: Manual email requests

Use a request form that prepares an email addressed to Justinebatuhan017@gmail.com. The visitor reviews and sends it in their email app. Do not claim a request was received merely because a draft opened. Offer copyable request text when no email app is configured. Justine reviews the email and replies with a decision and, if approved, a private invitation or download link. Do not store visitor details in browser storage or count requests as uses or downloads.

This phase supports manual review but does not enforce access to an already-public app or file. Removing a portfolio link alone does not make a resource private.

## Phase 2: Enforced access

Choose and configure a backend before deploying this phase. Store requests with pending, approved, declined, revoked, and expired states. Verify the visitor's email before enabling access. Use a protected owner dashboard with server-side authorization for every approval action. Never put administrator credentials or service-role keys in public files.

Store the APK in a private bucket. Generate short-lived download links only after approval. Remove the publicly served APK and public repository copies once private delivery is verified; older public Git history may still expose the file. Do not claim previously published files can be recovered from visitors.

Evaluation Studio must check an authenticated visitor's approval at its own host. A redirect from this portfolio cannot protect a public external website. An expiring URL to that public site does not enforce approval.

Send approved invitations to the visitor's verified email through a configured mail service. Keep links short-lived, allow revocation, and protect request submission with server-side rate limits. Retain visitor details only as long as needed to administer access.

## Verification

Check form validation, keyboard navigation, cancel and reopen behavior, correct project selection, and fixed-recipient email encoding. Verify that requests do not increment uses or downloads. For enforced access, test unauthorized direct URLs, expired and revoked grants, owner-only approval, private storage permissions, and notification failures before publishing.

## Configuration decisions

Confirm which projects require approval and which backend or manual-email workflow to use. Email request drafts are usable on static hosting. Automatic submission, protected downloads, verified approvals, and an owner dashboard require backend configuration and control of the project hosting.
