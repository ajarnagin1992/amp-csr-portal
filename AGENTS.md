# Agent instructions

## TDD workflow (Detroit school)

When implementing a new feature or behavior change, follow this process. Do not skip steps or batch them together, even if the change looks small.

1. **Write all unit tests for the feature first.** Cover every behavior being added in this change — do not write or edit any production code (services, controllers, modules, etc.) yet.
2. **Present the written tests before doing anything else.** Show the user what was added and explain what each test verifies. Wait for their go-ahead before touching implementation code, unless they've already told you to proceed straight through.
3. **Run the full suite and confirm red.** Every new test should fail, and it should fail *for the right reason* (missing behavior), not because of a typo or a broken test setup. If a test fails for the wrong reason, fix the test before moving on.
4. **Implement one test at a time.** Pick a single failing test, write the minimum code needed to make that one test pass — no more. Do not pre-implement behavior that a later test will cover.
5. **Run the suite after each change.** Confirm the targeted test goes green and no previously-green test broke. If one did, fix it before continuing.
6. **Repeat step 4–5** for each remaining failing test until the whole suite is green.
7. **Refactor only once everything is green**, and re-run the suite after refactoring to confirm nothing broke.

Do not write implementation code ahead of a test that justifies it. Do not write multiple tests' worth of implementation in one step, even if the full solution is obvious up front — the point is that each test independently earns the code that makes it pass. Present each step to the user for validation before continuing.

This applies to new features and behavior changes. It does not apply to pure config edits, dependency bumps, or typo/formatting fixes with no behavior change.
