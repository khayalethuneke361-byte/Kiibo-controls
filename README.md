# Kiibo Control

The platform owner app for Kiibo Studios. It signs in with your owner account and talks to the same Supabase project as Kiibo Studios. No secret key is stored in the app: every action runs through database functions that check you are a platform owner.

## Set up (once)
1. In Supabase, run `supabase/supabase-7-admin.sql`, then `supabase/supabase-8-delete-and-password.sql`, in the SQL Editor.
2. Make sure your account is a platform owner (see the Kiibo Studios README, the `platform_admins` step).
3. Create a new GitHub repository, upload this zip, then create the two workflow files (copies are in `.github/workflows/` inside this zip): `unzip.yml` and `android.yml`.
4. Open Actions, wait for **Build Android APK**, download **kiibo-control-apk** and install `app-debug.apk`.

## What it does
- Accounts: email, name, club, role, last seen, ban or unban, remove from a club, set a new password, delete the account for good.
- Clubs: close or reopen a club, add 7 or 30 days to how long it stays open.
- Phones: accounts that share the same phone are linked and flagged.
- Activity: the latest 100 events across all clubs.

## Notes
- The phone ID is a random code the Kiibo Studios app saves on the phone. It starts showing once people update the app, and a new ID is made if someone clears the app data or reinstalls.
- Banning stops that email only. Banned people are signed out of every phone.
