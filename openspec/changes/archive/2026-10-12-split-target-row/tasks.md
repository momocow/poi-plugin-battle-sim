## 1. Controls layout

- [x] 1.1 In `src/ui/Controls.tsx`, render the branch choices (with the 能動分歧 label) in a row shown only when the map has branch choices, and the Target dropdown, Night battle switch and 陣形 button in a separate row below it, shown only when `target` is set
- [x] 1.2 Update the `Controls.tsx` header comment and the row comments in `src/ui/styles.ts` to describe four rows (fleet, branches, target, action bar); check that the target group still wraps as one unit with the 陣形 button

## 2. Verification

- [x] 2.1 `npm test` and the type check pass
- [x] 2.2 Check in poi at 400px wide:
  - 7-5 with its topology cached shows the branch row, then Target, Night battle and 陣形 on the next row;
  - 2-5 shows no 能動分歧 label, only the Target row;
  - a map whose topology isn't cached shows no Target row
