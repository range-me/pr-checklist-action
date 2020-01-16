# PR checklist action

This action does two things:
 - Add contextual checklist
 - Make sure the checklist (including user defined in PR description) is completed before merging the PR

## Checklist specification

Add `CHECKLIST.yml` to repository root

### example

```
hardcoded:
  - Happy
contextual:
  "*.js":
    - Frontend tested
  "*.rb":
    - Backend tested
```

## Action
```
on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  checklist_job:
    runs-on: ubuntu-latest
    name: Checklist
    steps:
      - name: Checkout
        uses: actions/checkout@v1
      - name: Checklist
        uses: range-me/pr-checklist-action@master
        with:
          gh-token: ${{ secrets.GITHUB_TOKEN }}
```

## development

### dependencies
`npm install -g @zeit/ncc`

### deployment
```
ncc build index.js
```
