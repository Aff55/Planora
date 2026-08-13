-- Drop PersonalProfile.allowProductAnalytics.
--
-- This was a consent toggle rendered to users on both web (profile page) and
-- mobile (profile screen), stored in the database, validated by the shared Zod
-- schema, and cited by name in the public privacy copy. What it never had was a
-- reader: no route, service, query filter or branch in apps/api/src ever looked
-- at the value. A user could switch it on or off and nothing changed.
--
-- For an app whose central claim is that consent is enforced rather than
-- decorative, a consent control that controls nothing is worse than no control
-- at all — it invites trust it has not earned. Removing it so every remaining
-- toggle (useForPersonalization, allowAnonymousTraining) is one that provably
-- gates behaviour.
--
-- If product analytics ever becomes real, reintroduce this with a fresh
-- migration at the same time as the code that actually honours it.

-- AlterTable
ALTER TABLE "PersonalProfile" DROP COLUMN IF EXISTS "allowProductAnalytics";
