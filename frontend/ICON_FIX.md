# Icon Import Fix

## Issue
The error "Element type is invalid: expected a string... but got: undefined" was caused by an incorrect icon import.

## Fix Applied
Changed `AdjustmentsHorizontal` to `Sliders` in the Layout component.

## What Changed
- **File**: `frontend/components/Layout.tsx`
- **Before**: `AdjustmentsHorizontal` (doesn't exist in lucide-react)
- **After**: `Sliders` (valid lucide-react icon)

## Verification
After this fix, the Layout component should render correctly without the undefined component error.

## If Issue Persists
1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. Check browser console for any remaining import errors.

