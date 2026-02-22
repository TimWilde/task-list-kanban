# Cancel Task Enhancements

Status: DRAFT

## Feature Request Summary

We need to enhance the task cancellation functionality introduced in `SPEC_0007__COMPLETE__CANCEL_TASK_DESIGN.md` and `SPEC_0008__COMPLETE__CONFIGURABLE_CANCEL_STATUS_MARKERS.md`. The existing functionality works exactly as desired, and this work extends it further to provide better visual feedback and organization for cancelled tasks.

Specifically, we need to change the glyph used for cancelled tasks, automatically manage a "cancelled" tag when tasks are cancelled or restored, and correct task-move semantics so moving tasks does not unintentionally rewrite cancellation state.

## User Requirements

1. **Task Glyph Update**: When a task is in the cancelled state, the glyph used on the task must be `lucide-circle-off` (replacing the current `lucide-circle` or `lucide-circle-check` icons).
2. **Tag Addition on Cancel**: When marking a task as cancelled, the task must have the `#cancelled` tag added to it.
3. **Tag Removal on Restore**: When restoring a cancelled task, the `#cancelled` tag must be removed from the task.
4. **Preserve Existing Behavior by Default**: Existing functionality from `SPEC_0007` and `SPEC_0008` remains unchanged except where this spec explicitly defines new behavior.
5. **Normal Tag Semantics**: `#cancelled` behaves as a normal task tag for visibility/filtering/column-tag matching. No new special-case logic is added to tag filtering or column assignment.
6. **Case-Insensitive Tag Matching**: Tag detection for add/remove must be case-insensitive for manually edited source lines.
7. **Standalone Token Matching Only**: Restore must remove only standalone `#cancelled` tag tokens, not substrings inside larger tags or text.
8. **Glyph Precedence**: Task glyph selection must follow `cancelled > done > normal`.
9. **Selection Mode Unchanged**: In selection mode, existing square selection glyphs remain unchanged and cancelled glyph semantics do not apply.
10. **State Source of Truth**: Cancelled state is derived only from checkbox marker matching (`cancelledStatusMarkers`), not from the presence of `#cancelled`.
11. **Cancelled-Column Restore Safety**: If a column is mapped by `cancelled` tag naming, restoring a cancelled task must still remove `#cancelled` tokens so the task does not remain in that column due to stale tag mapping.
12. **Move State Preservation**: Moving tasks between non-Done columns must preserve existing status marker state.
13. **Done Transition Rules**:
    - Moving a task into Done sets the done marker as existing behavior.
    - Moving a task out of Done clears done state to incomplete, except for the cancelled-column case below.
14. **Done -> Cancelled Transition**: Moving a task from Done to a cancelled-mapped column sets cancelled marker state (first configured cancelled marker) and ensures a cancelled tag is present if absent.
15. **Cancelled Tag Case Preservation**: If any case variant of cancelled tag already exists (e.g., `#Cancelled`), it must be kept as-is and not replaced.
16. **Consistent Move Semantics Across UI Paths**: The same move/state behavior must apply for drag-drop and all Move-to menu paths (single and bulk).
17. **Column Resolution Semantics Unchanged**: For multiple candidate column tags, existing column organization logic remains unchanged (first matching column tag in source order).

---

## High-Level Design

### UI Changes

#### Task Rendering
- During the rendering of a task card in the Kanban board, evaluate if the task is cancelled (using the existing `cancelledStatusMarkers` matching logic).
- In non-selection mode, task glyph selection order is:
  1. Cancelled -> `lucide-circle-off`
  2. Done -> `lucide-circle-check`
  3. Otherwise -> `lucide-circle`
- No other visual styling changes are required beyond the glyph replacement.
- Selection mode continues to use existing selection glyphs (`lucide-square` / `lucide-check-square`) and is out of scope for cancelled glyph logic.

### Data Model and Action Layer

#### Cancelling a Task
- Extend the cancel action logic (for both single and bulk actions):
  - In addition to updating the checkbox marker to the configured cancelled marker, ensure exactly one `#cancelled` tag token exists on the task.
  - Matching for existing cancelled tags is case-insensitive (`#cancelled`, `#Cancelled`, etc.).
  - Do not duplicate the tag if a case variant already exists.
  - `#cancelled` remains a normal tag and should continue to flow through existing tag parsing/filtering/column-tag behavior.

#### Restoring a Task
- Extend the restore action logic (for both single and bulk actions):
  - In addition to resetting the checkbox marker to `[ ]`, remove all standalone `#cancelled` tag tokens case-insensitively.
  - Only standalone tag tokens are removed. Substring matches are not removed (e.g., `#notcancelled`, `#cancelled2`, `foo#cancelledbar` remain unchanged).
  - Clean up duplicate/trailing whitespace introduced by token removal.
  - If token removal leaves no task text content, serializing an empty task line (`- [ ]`) is acceptable and remains user-managed content.
  - Ensure any other tags remain preserved.

#### Moving a Task
- Extend move behavior so column assignment and marker mutation are no longer always coupled:
  - Non-Done -> non-Done moves preserve marker state.
  - Any -> Done move keeps existing Done behavior (done marker set).
  - Done -> non-Done move clears done state to incomplete, except Done -> cancelled-mapped target.
  - Done -> cancelled-mapped target writes first cancelled marker and ensures cancelled tag token exists (without replacing an existing case variant).
- Apply identical logic for drag-drop and Move-to menu actions (single and bulk).
- Preserve existing column-selection behavior when multiple candidate column tags are present (first matching column tag in source order).

### Interactions with Existing Features
- The definition of a "cancelled state" remains based entirely on the marker matching logic established in `SPEC_0008`.
- `#cancelled` is auxiliary metadata only (visibility/filtering/optional tag-based column workflows) and is not a state authority.
- The mutation (addition or removal) of the `#cancelled` tag happens in the same unified file-writing update cycle as the status marker change to prevent partial state writes.
- No new behavior is added to tag filters, saved filters, or column assignment. Existing behavior naturally applies to `#cancelled` because it is a normal tag.
- Restore must remove cancelled tokens regardless of whether a `cancelled`-mapped column exists, so restored tasks re-enter normal column resolution instead of sticking in a cancelled column via leftover tags.
- No migration/backfill is performed for pre-existing cancelled tasks. Tag add/remove occurs only when user-triggered cancel/restore actions run.

---

## Detailed Behavior

### State Source of Truth
- Cancelled-state checks use only configured checkbox marker matching.
- Presence of `#cancelled` alone does not make a task cancelled.
- Example: `- [ ] Task #cancelled` is not treated as cancelled by cancel/restore labeling or glyph selection.

### Task Glyph Assignment
- **Selection mode**: existing selection glyphs (`lucide-square` / `lucide-check-square`) unchanged.
- **Non-selection mode precedence**:
  1. Cancelled tasks: `lucide-circle-off`
  2. Done tasks: `lucide-circle-check`
  3. Incomplete/non-cancelled tasks: `lucide-circle`

### Tag Management

#### Token Definition
- A standalone cancelled token means a token matching `#cancelled` case-insensitively as a full tag token boundary.
- Only these tokens are candidates for add/remove behavior.

#### Cancel Mutation
- **User Action**: "Cancel task"
- **Result**: The configured cancel marker is written, and standalone `#cancelled` token presence is ensured exactly once.
- *Example*: `- [ ] Buy groceries` -> `- [-] Buy groceries #cancelled`
- *Case-insensitive idempotency example*: `- [ ] Buy groceries #Cancelled` -> `- [-] Buy groceries #Cancelled` (no duplicate new token required)

#### Restore Mutation
- **User Action**: "Restore task"
- **Result**: The task marker is reverted to `[ ]`, and all standalone `#cancelled` tokens are removed case-insensitively.
- *Example*: `- [-] Buy groceries #cancelled` -> `- [ ] Buy groceries`
- **Cancelled-column safety example**: `- [-] Something #Cancelled` (shown in cancelled-mapped column) -> `- [ ] Something` (no stale cancelled tag remains to keep it in cancelled column)
- **Multiple tokens**: `- [-] Buy groceries #cancelled #Cancelled` -> `- [ ] Buy groceries`
- **Substring safety**: `- [-] Buy #notcancelled groceries #cancelled2 #cancelled` -> `- [ ] Buy #notcancelled groceries #cancelled2`
- **Empty content allowed**: `- [-] #cancelled` -> `- [ ]`
- **Tracking note**: If restore produces `- [ ]` with no text, subsequent board inclusion follows existing parser behavior for empty task content.

### Movement and Status Rules

#### Move Transition Matrix
- **Non-Done -> non-Done**: preserve current marker state.
- **Any -> Done**: set done marker using existing done semantics.
- **Done -> non-Done (non-cancelled target)**: clear done marker to incomplete `[ ]`.
- **Done -> cancelled-mapped target**: set first configured cancelled marker and ensure cancelled tag token exists if absent.

#### Additional Movement Rules
- If a cancelled tag token already exists in any case variant, keep existing token text; do not rewrite casing.
- Movement semantics are identical across drag-drop and Move-to menu actions (single and bulk).
- Existing column organization behavior for multiple candidate column tags remains unchanged (first match in source order).
- If restore removes cancelled tags and no other column-matching tag remains, task becomes uncategorised by existing logic.
- If restore removes cancelled tags and other column-matching tags remain (e.g., `#blocked`), existing column resolution chooses as normal.

### Edge Cases
1. **Idempotency**: Cancelling does not duplicate `#cancelled` (case-insensitive check).
2. **Whitespace handling**: Adding/removing tokens must not leave repeated or trailing spaces.
3. **Bulk actions**: Token mutation logic applies identically in bulk operations.
4. **Tag interoperability**: `#cancelled` coexists with other tags (e.g., `#blocked`) and remains filterable/selectable via existing systems.
5. **Column mapping interoperability**: If users define a column that maps to `cancelled`, existing tag-to-column logic should continue to work unchanged.

---

## Implementation Plan

### Phase 1: Task Glyph Update
**Goal:** Cancelled tasks visually present the proper `lucide-circle-off` icon.

1. Locate the UI component responsible for rendering task checkbox glyphs.
2. Apply explicit non-selection glyph precedence: `cancelled > done > normal`.
3. Verify selection mode rendering path is unchanged.

**Deliverable:** Non-selection task glyphs correctly follow `cancelled > done > normal` while selection mode remains unchanged.

### Phase 2: Tag Management on Action
**Goal:** `#cancelled` is added on cancel, and removed on restore.

1. Implement standalone-tag token matcher for `#cancelled` with case-insensitive matching.
2. Update cancel mutation to enforce exactly one cancelled token.
3. Update restore mutation to remove all standalone cancelled tokens and normalize whitespace.
4. Bundle these text edits into the existing row update utility.
5. Verify bulk cancel and restore properly cascade these text mutations across all selected standard task items.

**Deliverable:** Single-task and bulk cancel/restore consistently add/remove cancelled token with idempotency and substring safety.

### Phase 3: Move Semantics
**Goal:** Task moves preserve or transition marker state according to defined rules.

1. Implement move logic that preserves marker state for non-Done -> non-Done transitions.
2. Ensure Done -> non-Done transitions clear done marker, except Done -> cancelled-mapped target.
3. Ensure Done -> cancelled-mapped target writes cancelled marker and ensures cancelled tag token is present (preserving existing case variants when present).
4. Apply same behavior for drag-drop and Move-to menu paths (single and bulk).

**Deliverable:** Move behavior no longer unintentionally removes cancelled state on non-Done moves and behaves consistently across UI paths.

### Phase 4: Regression & Validation
**Goal:** Confirm existing functionalities are untouched except where explicitly changed.

1. Ensure configurable cancelled status markers (`SPEC_0008`) behavior is unaffected.
2. Verify tag filtering and column-tag matching continue to work with `#cancelled` as ordinary tag behavior.
3. Verify all markdown parsing/serialization behavior remains consistent, including empty-content restore case.
4. Ensure existing multiple-candidate column-tag behavior remains unchanged (first matching tag in source order).
5. Ensure Done column `Archive all` and standard ignored/done marker precedence rules remain undisturbed.

**Deliverable:** No regressions to existing cancel marker config, filtering, column mapping, or bulk/task interactions beyond explicit move-semantics changes.

---

## Manual Test Cases

### TC-01: UI Glyph Change
- [ ] Cancel an incomplete task using the task menu.
- [ ] Verify the task's checkbox icon changes to `lucide-circle-off`.
- [ ] Restore the task and verify the icon returns to `lucide-circle`.
- [ ] Verify when a task is both done and cancelled-marker-matching, icon is `lucide-circle-off` (cancelled precedence).
- [ ] Toggle to selection mode and verify square selection icons render as before.

### TC-02: Tag Addition and Idempotency
- [ ] Cancel a standard task -> verify `#cancelled` is appended.
- [ ] Manually edit a task's raw text to include `#Cancelled`, then use "Cancel task" -> verify no duplicate cancelled tag token is added.

### TC-03: Tag Removal and Clean Formatting
- [ ] Restore a task that was cancelled via UI -> verify `#cancelled` is completely removed and no trailing space remains at the end of the text.
- [ ] Restore `- [-] Buy #notcancelled #cancelled2 #cancelled stuff` -> verify only standalone `#cancelled` is removed.
- [ ] Restore `- [-] #cancelled` -> verify result is `- [ ]`.

### TC-04: Bulk Action Safety
- [ ] Select multiple non-cancelled tasks and run "Cancel N selected" -> verify all modified tasks receive the `#cancelled` tag and their glyphs update.
- [ ] Select multiple cancelled tasks and run "Restore N selected" -> verify tags are stripped from all selected tasks and glyphs revert to `lucide-circle`.

### TC-05: Non-Interference Guardrails
- [ ] Confirm everything functions correctly when a custom cancelled marker (e.g., `c`) is defined in the plugin Settings.
- [ ] Confirm Done column behavior remains governed by existing done/ignored marker logic and is not changed by normal-tag handling for `#cancelled`.

### TC-06: Multiple Tags and Column Resolution
- [ ] Restore `- [-] Something #Cancelled #blocked` where `#blocked` maps to a column -> verify output no longer contains cancelled token and task resolves to blocked column.
- [ ] Restore `- [-] Something #Cancelled` with no other matching column tag -> verify task becomes uncategorised.
- [ ] Verify multiple candidate non-cancelled column tags still resolve using existing first-match source-order behavior.

### TC-07: Normal Tag Behavior
- [ ] Confirm `#cancelled` appears in existing tag filter options and can be used as a filter like any other tag.
- [ ] If a user has a column mapped by `cancelled` tag naming, confirm cancelling a task allows existing tag-to-column behavior to operate without any new feature-specific codepath.

### TC-08: Done Placement with Cancelled Tag Present
- [ ] Start from a cancelled task containing `#cancelled` and mark it done (`[x]` or configured done marker path).
- [ ] Verify task appears in the Done column according to existing done-state rules.
- [ ] Verify `#cancelled` remains present in task text/tag handling (subject to existing tag display settings such as consolidate tags).
- [ ] If a custom cancelled column mapping exists, verify Done placement still wins when task is done-state.

### TC-09: Restore from Cancelled-Mapped Column Removes Stale Tag
- [ ] Configure a column that maps to `cancelled` tag naming.
- [ ] Create/ensure a task `- [-] Something #Cancelled` appears in that column.
- [ ] Run Restore task.
- [ ] Verify source becomes `- [ ] Something` (all standalone cancelled tokens removed case-insensitively).
- [ ] Verify task no longer remains in cancelled-mapped column due to leftover cancelled tag.

### TC-10: Move Semantics Preserve or Transition State Correctly
- [ ] Move a cancelled task (`- [-] Something #cancelled`) from one non-Done column to another -> verify marker and cancelled tag are preserved.
- [ ] Move a done task from Done to a non-cancelled column -> verify done marker clears to `[ ]`.
- [ ] Move a done task from Done to a cancelled-mapped column -> verify marker becomes first cancelled marker and cancelled tag token is present (preserving existing case variant if already present).
- [ ] Verify TC-10 behavior is identical for drag-drop and Move-to menu paths (single and bulk).
