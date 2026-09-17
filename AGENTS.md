# Agent instructions

## TDD workflow (Detroit school)

For new features/behavior changes (not config, dependency, or typo-only edits):

1. Write all unit tests for the feature first — no production code yet.
2. Present the tests to the user before implementing. Wait for go-ahead unless told to proceed straight through.
3. Confirm the whole set is red, and red for the right reason (missing behavior, not a broken test).
4. Implement one test at a time: minimum code to pass just that test, nothing pre-built for later tests.
5. Re-run, confirm that test is green with no regressions, before moving to the next.
6. Refactor only once everything is green; re-run after.
7. Present each step (diff + result) to the user before continuing.

**Assert behavior, not incidental call shape.** Assert the value that actually matters (a filter, a computed arg) — not an accident of how the code happens to call a mock, like exact argument count. If a test forces awkward branching in the implementation for no real behavioral reason, relax the test instead of keeping the branch.

**Run tests efficiently — minimize output/context:**
- Confirming red on newly-written tests, or checking one test while implementing it: filter by name (`vitest run -t "<test name>"`), not the whole suite.
- Regression-checking after a change: run the full suite but stop at the first failure (`vitest run --bail=1`), and only surface pass/fail counts + failing test names, not full verbose output.
