# src_no → src: Change Log

Comparison between `src_no` (reference/design template) and `src` (production build).
Legend: ✅ Completed · ⚠️ Partial · ❌ Not done · ➕ Added in src (not in src_no)

---

## Layout & Navigation

### `components/layout/TopBar.tsx` ✅
- Applied responsive padding: `px-3 sm:px-6`
- Tamil subtitle hidden on mobile: `hidden sm:block`
- Constituency sub-line hidden on mobile: `hidden sm:block`

### `components/layout/NavTabs.tsx` ✅
- Added mobile hamburger menu (`ph-list` / `ph-x` toggle)
- Desktop tabs hidden on mobile (`hidden md:flex`)
- Mobile shows active page name + icon as breadcrumb
- Mobile dropdown lists all nav tabs with active highlight

### `components/entry/EntryTabBar.tsx` ✅
- Replaced horizontal scroll-with-arrows with **grouped tabs design**
- **Desktop**: Row 1 = group pills (Field Data, People, Campaign, Feedback, Activity Logs); Row 2 = sub-tab filter pills for active group with checkmark on active
- **Mobile**: Hamburger → accordion dropdown grouped by category, 2-column grid of sub-tabs
- All src tabs preserved (Attendance, Agent Log, Field Log, Vol. Log, Survey)

---

## New Pages

### `pages/SignupPage.tsx` ✅
- Created from src_no design
- Role selector: Volunteer / Booth Agent (no admin self-signup)
- Password strength bar (5-level)
- Confirm password with match indicator
- Calls `POST /api/v1/auth/users/register/` directly (no auth token needed)
- Shows success state after registration, prompts admin activation
- Wired into `App.tsx` via `showSignup` state; `LoginPage` shows "Create an account" link

### `pages/PublicPollPage.tsx` ✅
- Copied from src_no as-is (full bilingual Tamil/English design)
- "Makkal Kural" news-channel style with ticker, live poll, Q1+Q2
- Social sharing (WhatsApp, Facebook, LinkedIn, Copy Link)
- Accessible at `/#poll` without login (no auth check in App.tsx)
- **Note**: Currently uses `localStorage` for vote storage — backend API integration pending (see below)

---

## Pages: Already Ahead in `src` (Not in src_no)

### `pages/DashboardPage.tsx` ➕
- src replaced all dummy stat values with live API data via `useDashboardData`
- Activity feed renders real activity logs; empty state shown if none
- Events filtered by status and date from API

### `pages/entry-modules/VoterEntry.tsx` ➕
- Added: Education level select (6 choices), Occupation text, Preferred Party (from master API)
- Scheme and Issue changed to dynamic selects from master API
- Village/Ward changed from text input to select (from wards API)
- Phone validation (10-digit, starts 6–9), age ≥ 18 (from DOB)
- `editKey` counter fixes pre-fill when form stays open between edits

### `pages/entry-modules/BoothEntry.tsx` ➕
- Ward/block field now dynamic select from master API
- Agent name and status pre-fill on edit

### `pages/entry-modules/VolunteerEntry.tsx` ➕
- Form fully editable (removed admin-only restriction)
- Booth field is dynamic select
- Volunteer creation calls API

### `pages/entry-modules/ActivityEntryBase.tsx` ➕
- Village and Booth fields changed to dynamic selects
- Export and print wired to live data
- Activity type validation on save

### `pages/entry-modules/EventEntry.tsx` ➕
- Organiser pre-fills from `organized_by_name`

---

## Constants & Types

### `constants/nav.constants.ts` ✅ (partial)
- src_no icon for Dashboard: `ph-house` → src uses `ph-gauge` (kept src version)
- src removed Reports and Opinion Poll from TOP_NAV_TABS (as instructed)
- src added Dashboard tab in ENTRY_TABS
- src added Attendance tab in ENTRY_TABS
- Labels shortened: "Volunteer Activity" → "Vol. Log", "Agent Activity" → "Agent Log", "Field Activity" → "Field Log", "Voter Survey" → "Survey"
- src MASTER_TABS expanded with District, Constituency, Ward (not in src_no)

### `types/nav.types.ts` ➕
- Added `'attendance'`, `'district'`, `'constituency'`, `'ward'` to module ID types

---

## Authentication

### `hooks/useAuth.ts` ➕
- Added `UserRole` type export
- Added `signup()` function calling `/auth/users/register/`

### `context/AuthContext.tsx` ➕
- Exports `UserRole` type
- Exposes `signup` function through context

### `pages/LoginPage.tsx` ✅
- Added optional `onGoToSignup` prop
- "Create an account" link appears below form when prop is provided

---

## Backend-Only Changes (No src_no Equivalent)

| File | Change |
|------|--------|
| `settings.py` | `pymysql.install_as_MySQLdb()`, CORS headers, `CorsMiddleware` moved first, JWT rotation disabled |
| `accounts/serializers.py` | `CustomTokenObtainPairSerializer.validate()` returns `user` object in login response |
| `polls/models.py` | Added `voter_user` FK to `PollVote` for user-based deduplication |
| `polls/views.py` | Vote deduplication by user (authenticated) or IP (anonymous) |
| `polls/serializers.py` | `is_winner` hidden from non-admins |
| `.gitignore` | Ignores `__pycache__`, `.pyc`, `.venv`, `db.sqlite3`, migration `0*.py` files |

---

## Not Yet Completed / Pending

| Item | Reason |
|------|--------|
| `PublicPollPage` — backend vote storage | Page uses localStorage. Wiring to polls API needs a known Poll ID and matching option keys in DB |
| `VoterEntry` — caste field removed | src_no removed caste; src still has it in model. Backend model change needed to fully drop |
| `EventEntry` — organiser/budget/spent/materials | Backend model has no these fields; requires Django model change + migration |
| `OpinionPollPage` (internal) | Already replaced with backend API in src; src_no used localStorage — src is ahead |
| `ReportsPage` | Minor structural differences; both are essentially placeholder pages |
| Mobile: MastersConfigPage tab bar | No mobile-responsive grouped design applied yet (only EntryTabBar was done) |
| `UserEntry` (admin user management) | Extracted into separate file in src; CRUD operations need backend permission fixes |
| `AttendanceEntry` | New in src, not in src_no — no corresponding template to compare against |
