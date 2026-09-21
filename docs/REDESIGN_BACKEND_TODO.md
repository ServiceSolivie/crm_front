# Redesign — backend work

Parts of the approved mockup that needed backend changes. All items below are now built
(backend + frontend hook) except the two marked **Not planned**.

Mockup: https://claude.ai/artifact/6eFKrTxq1Lo6pCnpjxodez
Backend tests: `crm_assurance/tests/Feature/RedesignApiTest.php`, `LeadReviewStatusPermissionTest.php`
(run with `DB_CONNECTION=mysql DB_DATABASE=crm_assurance_test php artisan test`).

**Deploy notes:** run `php artisan migrate` (adds `leads.set_review_status` permission,
`appointments.duration_minutes`, `lead_status_histories.meta`), then users log in again so
their permission list is refreshed.

---

## Gestion-only statuses

- Agents can no longer set *Validé, Call2 OK/KO, PDG OK/KO, À corriger*: they send the lead to
  **Gestion**. Enforced by the `leads.set_review_status` permission (gestion, manager,
  team leader, super admin) through `App\Rules\ReviewStatusAllowed` on create, status change and bulk.
- Frontend: `LeadStatusDropdown` hides those statuses without the permission; the lead page's
  payments card shows *Envoyer en gestion* to agents instead of *Valider le lead*.

---

## DVC & payments

Two tracks next to the pipeline status of each lead (migration `2026_09_21_100000_add_dvc_and_payment_statuses`).

**DVC** (`leads.dvc_status`, computed by `LeadDvcStatus`, never set by hand)

| Status | When |
|---|---|
| `A_GENERER` · DVC à générer | nothing generated yet |
| `EN_ATTENTE_SIGNATURE` · En attente de signature | a DVC was generated for the lead (Contrats) |
| `SIGNE` · DVC signé | the signed copy was uploaded as the **DVC** document (first slot of every dossier) |

- Moving a lead to **Gestion** or **Validé** needs `SIGNE` (422 otherwise).
- Deleting the signed copy moves the lead back to `EN_ATTENTE_SIGNATURE`.

**Payments**: recorded by hand before or after the signature, no longer tied to Validé (not on lost leads).
- The first payment asks for the contract total.
- Validé only asks for the total if no payment gave it.

| One payment (`payments.status`) | Hand actions | Hyperswitch (later) |
|---|---|---|
| `REUSSI` Reçu | → Remboursé (needs `payments.delete`) | `succeeded` |
| `EN_ATTENTE` En attente | → Reçu / Échoué / Annulé | `processing`, `requires_*` |
| `ECHOUE` Échoué | final | `failed` |
| `ANNULE` Annulé | final | `cancelled` |
| `REMBOURSE` Remboursé | final | refund `succeeded` |

Lead `payment_status`, recalculated after each change (only `REUSSI` counts as received):
- `PAYE`: received ≥ total
- `PARTIELLEMENT_PAYE`: some received
- `EN_ATTENTE`: nothing received, one pending
- `REMBOURSE`: nothing received, one refunded
- `NON_PAYE`: otherwise

**Hyperswitch (not built yet):**
- `payments.source` (`MANUEL` / `HYPERSWITCH`), `external_id`, `provider_payload`, `failure_reason` are ready.
- The webhook plugs into `PaymentService::recordProviderEvent()`, using the mapping above.
- Revenue figures (dashboard, reports) only count received payments.

---

## Step 1 — Shell & sidebar

| # | Item | API | Frontend |
|---|------|-----|----------|
| 1.1 | Quick search (Ctrl/⌘ K) | `GET /leads/search?q=&limit=8` — name, phone (digits only, "06 12 34" matches), e-mail, reference; user scope | `components/layout/TheLeadSearch.vue` in the sidebar |
| 1.2 | Menu counters | `GET /me/counters` → `{ leads_total, appointments_overdue, appointments_today, follow_ups_due }` | `TheSidebar.vue` (refreshed on navigation and window focus, 30 s throttle) |

## Step 2 — Dashboard

| # | Item | API | Frontend |
|---|------|-----|----------|
| 2.1 | Change vs previous period | `/dashboard/kpis` → `leads.previous`, `appointments.previous` (same-length period just before) | `DashboardPage.vue` KPI hints (green / red) |
| 2.2 | "23 non assignés" | `leads.unassigned` in `/dashboard/kpis` | *Nouveaux aujourd’hui* hint |
| 2.3 | "3 en retard" | `appointments.overdue` in `/dashboard/kpis` | *Rendez-vous* hint |
| 2.4 | Ma journée | `GET /me/agenda?date=` → `{ overdue, today, tasks, counts }` (no 7-day cap; tasks = dossiers sent back by gestion) | `MyDayPanel.vue` |
| 2.5 | Pipeline stage → list | `GET /leads?stage=follow_up` (stage map in `LeadStatusEnum::stage()`, mirrors `utils/enums.js`) | stages are links to `/leads?stage=…` |
| 2.6 | Click-to-call with automatic logging | — | **Not planned**: needs a telephony provider; buttons stay `tel:` links |

## Step 3 — Leads list

| # | Item | API | Frontend |
|---|------|-----|----------|
| 3.1 | Views *À rappeler aujourd’hui*, *Non assignés*, *Doublons* | `due=today` (open appointment today or late), `unassigned=1`, `is_doublon=1` | `LeadsPage.vue` view tabs |
| 3.2 | Count on each view | `GET /leads/counts` → `{ all, mine, unassigned, doublons, due_today }` | tab counters |
| 3.3 | *Prochaine action* column | `next_action: { type: appointment\|missing_document, id, at, overdue }` on the list; `sort_by=next_action_at` (nothing planned sorts last) | new column, sortable; *À rappeler* view sorts on it |
| 3.4 | Bulk actions | `POST /leads/bulk { ids[], action: assign\|status\|delete, assigned_to?, status?, comment? }` → `{ done, failed, results[{ id, ok, error }] }`; each lead authorised on its own; *Validé* refused (revenue needed per lead) | one call instead of a loop; new *Changer le statut* |
| 3.5 | Multi-select filters | `status`, `insurance_type`, `source_id`, `assigned_to`, `team_id` accept `x[]=a&x[]=b` or `a,b` | `AppFilterChip` `multiple` mode on Statut / Assurance / Source, plus an *Étape* chip |

## Step 4 — Lead detail

| # | Item | API | Frontend |
|---|------|-----|----------|
| 4.1 | One activity feed | `GET /leads/{id}/activity?page=&per_page=&type=` — notes, calls, statuses, assignments, appointments, payments (if allowed), documents (if allowed), newest first | `LeadActivityFeed.vue` loads itself, *Afficher plus*, reloads after each action |
| 4.2 | Why gestion sent it back | `last_flag: { message, issue_types, documents, summary, by, at }` on `GET /leads/{id}`; the flag's details are stored in `lead_status_histories.meta` | banner on `A_CORRIGER` leads |
| 4.3 | Previous / next | `GET /leads/{id}/neighbours?<list filters>` → `{ prev_id, next_id, position, total }` | arrows work across list pages |

## Step 5 — Lead form

| # | Item | API | Frontend |
|---|------|-----|----------|
| 5.1 | Duplicate check | `GET /leads/duplicates?phone=&email=&exclude_id=` — last 9 digits of the phone or same e-mail, across all leads; leads outside the user’s scope come back without id (`can_open: false`) | `LeadForm.vue` (phone and e-mail) |

## Step 6 — Calendar

| # | Item | API | Frontend |
|---|------|-----|----------|
| 6.1 | Search by lead | `GET /appointments?search=` (lead name, phone, e-mail, reference) | search box in `CalendarPage.vue` |
| 6.2 | Appointment length | `appointments.duration_minutes` (default 30, 5–480), `ends_at` in the resource | events drawn with their real length; *Durée* on the create / edit forms |
| 6.3 | Lead status in the side panel | `lead.status` in `AppointmentResource` | side panel |

## Step 7 — Reports

| # | Item | API | Frontend |
|---|------|-----|----------|
| 7.1 | Calls and revenue | `calls.total`, `revenue.received` on `/reports/agents` and `/reports/teams` (payments by payment date in the period) | two columns + totals in `ReportPerformanceTable.vue`, CSV |
| 7.2 | Headline figures | `GET /reports/leads/summary`, `GET /reports/appointments/summary` (same filters as the lists, whole period) | KPI row on the Leads / Appointments reports |
| 7.3 | Team filter | `team_id` on `/reports/teams` and `/reports/conversion` | *Équipe* chip on those two reports |

## Step 10 — Remaining pages

| # | Item | Status |
|---|------|--------|
| 10.1 | Appointments list search | built with 6.1 (`AppointmentsPage.vue` search box) |
| 10.2 | WhatsApp / push reminders | **Not planned**: the panel offers the three channels the API accepts (in-app, e-mail, SMS) |

---

### Fixed along the way (frontend only)
- The calendar agent filter sent `assigned_to`, which the appointments API ignores — it now sends `agent_id`.
- CSV exports of the Agents / Teams reports read the real nested values; the Appointments export has lead, phone and agent; CSV files start with a UTF-8 BOM.
- Error toasts stay 8 s; search boxes wait for typing to pause; dates and numbers follow FR / EN.
- English-only and French-only screens and dialogs translated.
