# Member profiles and officer titles

**Answer first:** Members get a real profile card. Access roles (`member`, `officer`, `captain`, `board`) stay separate from the display titles people see in the directory.

On `members.html` after sign-in:

- A welcome card with photo, name, title, and Edit my profile
- **Shamrock Leaders** above the directory (Officers, Board Member, Committee Chair) from the current leadership roster
- Directory cards that open a profile, showing every title a person holds (joined with `·`)
- An Officer Desk for approving applications
- First-login questionnaire titles that match the directory (President, Vice President, Treasurer, Secretary, Board Member, Committee Chair of …)

Canonical titles and the role mapping live in `assets/kos-leadership.js`. The roster upsert + RBAC sync is `sql/kos_shamrock_leaders_roster_and_rbac.sql`.

Highest role wins when someone holds more than one title (officer > board > committee chair). Parade and Social chairs are vacant (`Open`) until a person is named — do not invent replacements. Technology is vacant unless a current roster title already names a chair; do not list Dayna Olmsted or Mandy Franklin.
