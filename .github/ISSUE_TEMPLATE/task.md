---
name: Implementation task
about: Propose a focused task against the Learnoo pilot
labels: status:proposed
---

<!-- See docs/CAHIER_DES_CHARGES.md §5. The maintainer marks this status:ready only when every section is filled. Do not start work until you are assigned. -->

## Objective

What should change? Roadmap ID and milestone (M0–M4).

## Scope

**Included:**

-

**Excluded:**

-

## Dependencies

- Technical (code that must be merged first, or allowed stand-in such as an `unreviewed` fixture):
- Decision blockers (which part they block):
- Educational validation (real author/reviewer; blocks publication only):

## Shared contracts

Lesson JSON schema, API, permission rules, migrations or design tokens that this task reads or changes. Agree changes used by other open tasks on the issue first; changes confined to this task ship with its implementation.

## Acceptance criteria

- [ ] Describe an observable result.

## Validation

Commands to run and the risks the tests must cover (authorization, immutability, races, rendering safety, recovery).

```sh
go test ./...
go vet ./...
```
