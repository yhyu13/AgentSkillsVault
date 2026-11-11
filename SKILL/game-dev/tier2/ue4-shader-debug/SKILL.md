---
name: ue4-shader-debug
description: Systematically diagnose and fix Unreal Engine shader compiler errors (X3000 unrecognized identifier, X3003 redefinition, X3004 undeclared identifier, X3017 type mismatch) — include-guard, conditional-define, variable-scope, and C++ compilation-environment root causes. Use when UE4/UE5 shader compilation fails with `error X30xx`.
version: 1.0.0
metadata:
  category: game-dev
  created_by: agent
---

# UE4 Shader Compiler Debug Skill

> Handles shader compilation failures in Unreal Engine 4 by providing systematic diagnosis and fixes.

## When to Use

When shader compilation errors appear in the form:
- `error X3000: unrecognized identifier`
- `error X3003: redefinition of`
- `error X3004: undeclared identifier`
- `error X3017: cannot implicitly convert`

## Core Problem Patterns

### Pattern 1: Multiple Include Redefinition

**Symptom**: `error X3003: redefinition of '<identifier>'`

**Root Cause**: A `.ush` file is included multiple times (via different `#if USE_X` branches in the parent `.usf`), but the `.ush` file lacks a global include guard.

**Diagnosis**:
```bash
# Find all includes of the problematic file
grep -n "#include.*ShadowMomentFiltering.ush" Engine/Shaders/Private/*.usf
```

**Fix**: Add a global include guard at the top of the `.ush` file:
```hlsl
// At very top, after copyright header
#ifndef SHADOW_MOMENT_FILTERING_USH_INCLUDED
#define SHADOW_MOMENT_FILTERING_USH_INCLUDED

// ... all content ...

#endif // SHADOW_MOMENT_FILTERING_USH_INCLUDED
```

### Pattern 2: Conditional Define Inside Guarded Block

**Symptom**: `error X3004: undeclared identifier '<function>'`

**Root Cause**: `#ifndef USE_X` that sets a default is **nested inside** `#if USE_Y`, so when `USE_Y=0`, `USE_X` never gets its default value.

**Diagnosis**: Check structure:
```hlsl
#if USE_Y           // Line 100
 #ifndef USE_X      // Line 101 - nested INSIDE USE_Y block!
  #define USE_X 0
 #endif
 struct X { ... };  // Defined only when USE_Y=1
#endif
```

**Fix**: Move `#ifndef USE_X` **before** the `#if USE_Y` block:
```hlsl
#ifndef USE_X
#define USE_X 0
#endif

#if USE_Y
// Now USE_X is guaranteed to be defined regardless of USE_Y
#endif
```

### Pattern 3: Variable Scope Outside Conditional

**Symptom**: `error X3004: undeclared identifier '<variable>'`

**Root Cause**: Variable declared inside `#if X` block but used outside it.

```hlsl
void MainPS(...) {
 #if USE_M4
    float Shadow;  // Only declared when USE_M4=1
 #endif
    Shadow = 1.0;  // Error when USE_M4=0
}
```

**Fix**: Declare variable before the conditional:
```hlsl
void MainPS(...) {
    float Shadow = 0;  // Always declared
 #if USE_M4
    Shadow = CalculateM4Shadow(...);
 #endif
}
```

### Pattern 4: Type Mismatch

**Symptom**: `error X3017: cannot implicitly convert from 'float2' to 'float3'`

**Fix**: Use correct vector construction:
```hlsl
// Wrong
M4Settings.SvPosition = SVPos.xy;

// Correct
M4Settings.SvPosition = SVPos.xyx;
```

### Pattern 5: Missing C++ Compilation Environment Setup

**Symptom**: `USE_X` is always 0 despite shader having `#if USE_X` blocks

**Root Cause**: C++ `ModifyCompilationEnvironment` doesn't set the `USE_X` define.

**Diagnosis**: Check `ShadowRendering.h` or equivalent:
```cpp
static void ModifyCompilationEnvironment(...) {
    OutEnvironment.SetDefine(TEXT("USE_M4_POINT_LIGHT"), 1);
    OutEnvironment.SetDefine(TEXT("USE_M4"), 1);
}
```

## Systematic Debugging Process

### Step 1: Extract Error Identity

From the log line:
```
error X3003: redefinition of 'quant1_m'
at ShadowMomentFiltering.ush(334,23-30)
```

Extract:
- **Error type**: `X3003` = redefinition
- **Identifier**: `quant1_m`
- **File**: `ShadowMomentFiltering.ush`
- **Line**: 334

### Step 2: Find All Definitions

```bash
grep -n "quant1_m" Engine/Shaders/Private/ShadowMomentFiltering.ush
```

### Step 3: Check Include Chain

```bash
# Which files include this .ush?
grep -rn "#include.*ShadowMomentFiltering.ush" Engine/Shaders/

# Check the including file's conditional structure
grep -n "#if USE_M4" Engine/Shaders/Private/ShadowProjectionPixelShader.usf
```

### Step 4: Verify Include Guards

For each `.ush` file that's included multiple times:
1. Does it have a global `#ifndef X_INCLUDED` guard at top?
2. Does it have `#endif` at bottom?
3. Are variable/function definitions inside conditional blocks that might not execute?

### Step 5: Check Preprocessor Flow

When a file is included twice:
```
1st include: USE_M4=1, USE_M4_POINT_LIGHT=0
2nd include: USE_M4=1 (already defined!), USE_M4_POINT_LIGHT=1
```

If the file has no global guard, all code runs twice → redefinition.

## Diagnostic Commands

```bash
# Find all includes of a problematic .ush
grep -rn "#include.*<filename.ush>" Engine/Shaders/Private/

# Find all #ifndef guards in a file
grep -n "#ifndef\|#define.*_INCLUDED\|#endif" Engine/Shaders/Private/problematic.ush

# Find all definitions of an identifier
grep -rn "static const.*identifier\|identifier =" Engine/Shaders/Private/

# Check C++ defines for shader
grep -rn "SetDefine.*USE_M4" Engine/Source/Runtime/Renderer/Private/
```

## Fix Priority

| Priority | Issue | Fix Complexity |
|----------|-------|----------------|
| 1 | Missing global include guard | Low - add `#ifndef X_INCLUDED` wrapper |
| 2 | Define inside conditional | Low - move `#ifndef` before outer `#if` |
| 3 | Variable scope | Low - declare before `#if` block |
| 4 | Type mismatch | Low - correct vector construction |
| 5 | Missing C++ define | Medium - add to ModifyCompilationEnvironment |

## Common Pitfalls

1. **Using `#if 0` to "disable" code** - Doesn't work if other includes path to it
2. **Individual `#ifndef` for defaults** - These don't prevent re-processing, only set defaults once
3. **Thinking `#if X` is a guard** - It's conditional compilation, not include protection
4. **Static const variables** - These ARE definitions, need global guard protection
5. **Nested `#ifndef` inside `#if`** - The outer `#if` may skip the inner `#ifndef`, leaving defines unset

## Success Criteria

All shader compilers complete with zero errors:
```
[0]LogShaderCompilers: Warning: 0 Shader compiler errors
```

## Key Files

| File | Purpose |
|------|---------|
| `ShadowProjectionPixelShader.usf` | Main shadow projection - includes M4 conditionally |
| `ShadowMomentFiltering.ush` | M4 functions - must have global guard |
| `ShadowRendering.h` | C++ sets USE_M4_POINT_LIGHT, USE_M4 defines |
| `ShadowDepthVertexShader.usf` | Depth pass for shadows |
| `ShadowDepthPixelShader.usf` | Pixel shader for shadow depth |
