# OS-Athena Plan/Build Interface Improvement Design Document

## Executive Summary

This document outlines a systematic approach to improve the plan/build interface in OS-Athena, addressing the current 4,741-line ChatInterface.tsx monolith. The improvements focus on API usage optimization, clear workflow phases, better UX patterns, and incremental refactoring rather than complete rewrite.

## Current State Analysis

### Issues Identified

1. **Massive Monolith**: ChatInterface.tsx is 4,741 lines
2. **Simple Toggle**: Plan/Build mode is just a boolean flag with no systematic workflow
3. **No Caching**: Models fetched on every mount, status polled indefinitely every 15 seconds
4. **No Deduplication**: Same prompts sent repeatedly
5. **No Workflow**: One-shot responses, no phases or progression tracking
6. **No Predictability**: API usage recorded but not predicted before actions
7. **Scattered API logic**: Fetch calls mixed with component logic

### Current Architecture

```
ChatInterface.tsx (4,741 lines)
├── State Management (local useState)
├── API Calls (inline fetch calls)
├── Plan/Build Toggle (simple boolean)
├── Message Rendering (in-component)
└── Deployment Logic (inline functions)
```

## Proposed Architecture

### Component Hierarchy

```
ChatInterface/ (Container - 200 lines)
├── PlanningWorkflow/ (Planning flow wrapper)
│   ├── PlanningPhaseIndicator/ (Visual step progress)
│   ├── PlanningPanel/ (Main planning UI)
│   ├── PlanSummarySidebar/ (Changes & token estimation)
│   ├── PlanTemplates/ (Quick-start templates)
│   └── ReviewPanel/ (Collapsible diff review)
├── BuildWorkflow/ (Build flow wrapper)
│   ├── BuildPanel/ (Build UI)
│   └── BatchChangesManager/
├── Shared/
│   ├── ChatInterfaceCore/ (Main chat interface - 500 lines)
│   ├── ModelSelector/ (exists)
│   ├── RepoSelector/ (exists)
│   ├── MessageList/ (exists)
│   └── ChatInput/ (exists)
└── Hooks/
    ├── usePlanningWorkflow.ts (Planning logic)
    ├── useBuildWorkflow.ts (Build logic)
    ├── useResponseCache.ts (API caching)
    ├── useSmartPolling.ts (Intelligent polling)
    └── useRequestDeduplication.ts (Deduplicate requests)
```

## UI/UX Improvements

### 1. PlanningPhaseIndicator

**Purpose**: Visual representation of 4-phase planning workflow

**Design**:
```tsx
// components/planning/PlanningPhaseIndicator.tsx
interface Phase {
  id: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

// 4 Phases:
// 1. Context Analysis - Understanding repository structure
// 2. Requirements Understanding - Clarifying user needs
// 3. Solution Design - Creating implementation plan
// 4. Review & Approval - User reviews estimated changes
```

**Visual Design**:
- Horizontal stepper with 4 connected circles
- Green checkmark for completed phases
- Animated progress for current phase
- Hover descriptions for each phase
- Estimated tokens displayed next to each phase

**Interactions**:
- Click completed phases to jump back to review
- Disable navigation to future phases until current completes
- Show token estimates per phase

### 2. PlanSummarySidebar

**Purpose**: Always-visible summary of planned changes and resource usage

**Features**:
- List of files to be modified (expandable diff preview)
- Estimated token usage per phase
- Total estimated cost per provider
- Confidence score for plan
- Save/load plan functionality

**Design**:
```tsx
// components/planning/PlanSummarySidebar.tsx
interface Props {
  plannedChanges: FileChange[];
  tokenEstimates: TokenEstimates;
  confidence: number; // 0-100
  onSave: () => void;
  onLoad: () => void;
  onReview: () => void;
}
```

### 3. PlanTemplates

**Purpose**: Pre-defined templates for common tasks to reduce setup time

**Built-in Templates**:
- "Add New Feature" - Create new files, add routes, tests
- "Refactor Code" - Restructure existing code with minimal API usage
- "Fix Bug" - Targeted changes with minimal token usage
- "Deployment Setup" - Configure CI/CD, environment variables
- "Code Review" - Review only, no changes

**Features**:
- Custom template saving
- Template gallery with usage stats
- One-click template application
- Template search and filtering

### 4. ReviewScreen

**Purpose**: Comprehensive file change review with diff view

**Features**:
- Collapsible file tree
- Side-by-side diff view
- Syntax highlighting
- Inline comments
- Accept/reject individual changes
- Token usage per file

**Interactions**:
- Expand/collapse files
- Jump between files with navigation
- Quick approve/reject all
- Filter by file type

## API Optimization

### 1. ResponseCache System

**Purpose**: Cache model lists, repo structure, and repeated queries

**Implementation**:
```typescript
// hooks/useResponseCache.ts
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  key: string;
}

// 5-10 minute TTL (configurable)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// Caching strategy:
// - Model lists: 10 minutes (rarely change)
// - Repo structure: 5 minutes (changes infrequently)
// - Status checks: 1 minute (can change quickly)
// - User preferences: 1 hour (rarely change)
```

**Features**:
- Memory-based with size limits (100MB soft cap)
- Cache invalidation on repo changes
- Manual refresh button for cached data
- Cache hit/miss analytics

### 2. SmartPolling

**Purpose**: Intelligent polling that backs off over time and stops when inactive

**Implementation**:
```typescript
// hooks/useSmartPolling.ts
interface SmartPollingConfig {
  initialInterval: number; // 15 seconds
  maxInterval: number; // 5 minutes
  backoffMultiplier: number; // 1.5x after each poll
  maxPollsBeforeStop: number; // 50 polls (12.5 minutes with backoff)
  restartOnUserActivity: boolean;
}
```

**Behavior**:
- Initial poll: 15 seconds
- After 5 polls: 30 seconds
- After 10 polls: 45 seconds
- After 15 polls: 1 minute
- Stop after 20 polls (10 minutes) or user inactivity
- Restart on mouse movement or keyboard input

### 3. RequestDeduplication

**Purpose**: Prevent duplicate identical requests

**Implementation**:
```typescript
// hooks/useRequestDeduplication.ts
interface PendingRequest {
  key: string;
  promise: Promise<any>;
  timestamp: number;
}

// Simple in-memory cache of pending requests
// Key: hash of (url + method + body + auth headers)
// TTL: 30 seconds (requests should be quick)
```

**Benefits**:
- Prevents spamming API with duplicate requests
- Reduces token usage
- Improves perceived performance

### 4. BatchChanges

**Purpose**: Group multiple file changes into single GitHub API request

**Implementation**:
```typescript
// hooks/useBuildWorkflow.ts
interface FileChangeBatch {
  files: Array<{ path: string; content: string }>;
  commitMessage: string;
  branch?: string;
  maxBatchSize: number; // 10 files max
}

// Batching strategy:
// - Group by directory proximity
// - Combine small files (< 1KB each)
// - Single commit message combines all changes
// - Fallback to multiple commits if batch too large
```

**Optimizations**:
- Reduces GitHub API calls from N to 1 per batch
- Better transactional behavior (all or nothing per batch)
- Cleaner Git history

## Workflow Implementation

### 4-Phase Planning Workflow

#### Phase 1: Context Analysis
**Prompt**: `Analyze the repository structure and identify relevant files for: [user request]`

**Actions**:
1. Fetch repo structure
2. Use AI to identify relevant files
3. Cache structure for 5 minutes
4. Show estimated tokens: ~2K

**UI**: 
- Loading indicator with progress
- Show identified files
- Enable "Continue to Requirements"

#### Phase 2: Requirements Understanding
**Prompt**: `Based on the context, clarify requirements and identify edge cases for: [user request]`

**Actions**:
1. Ask clarifying questions
2. User answers in sub-thread
3. Save Q&A for reference
4. Show estimated tokens: ~3K

**UI**:
- Interactive questions
- Summary of clarified requirements
- Enable "Continue to Solution Design"

#### Phase 3: Solution Design
**Prompt**: `Generate implementation plan with file-by-file changes for: [user request]`

**Actions**:
1. AI generates detailed plan
2. Parse file changes
3. Calculate token estimate
4. Show confidence score
5. Update PlanSummarySidebar

**UI**:
- Generate button (with token estimate)
- Progress bar during generation
- Estimated tokens: ~5-10K
- Enable "Review Plan"

#### Phase 4: Review & Approval
**UI**: ReviewScreen component

**Actions**:
1. User reviews changes
2. Accept/reject individual files
3. See total token estimate
4. Approve to proceed or request changes

**Features**:
- Side-by-side diff
- Token usage per file
- Total cost calculation
- Save plan for later

### Implementation Priority Order

## Phase 1: Foundation (Week 1-2)

### 1.1 Code Organization
- [ ] Extract ChatInterfaceCore (500 lines)
  - Move common chat logic
  - Keep plan/build-specific logic separate
- [ ] Create TypeScript interfaces for planning
  - PlanningPhase types
  - FileChange types
  - TokenEstimate types
  - Plan persistence types

### 1.2 ResponseCache System
- [ ] Create `hooks/useResponseCache.ts`
- [ ] Integrate into model fetching
- [ ] Add 5-10 minute TTL for model lists
- [ ] Cache repo structure for 5 minutes
- [ ] Cache status checks for 1 minute

**Benefit**: Immediate API reduction (estimated 60-80% fewer calls on page load)

### 1.3 SmartPolling Implementation
- [ ] Create `hooks/useSmartPolling.ts`
- [ ] Replace `setInterval(fetchStatus, 15000)`
- [ ] Implement backoff logic (15s → 5m)
- [ ] Stop after 10 minutes of inactivity
- [ ] Add manual refresh button

**Benefit**: Eliminate wasteful polling

**Estimated Effort**: 3-4 days
**Risk**: Low - non-breaking change

## Phase 2: Planning Workflow (Week 3-4)

### 2.1 PlanningPhaseIndicator Component
- [ ] Create `components/planning/` directory
- [ ] Build `PlanningPhaseIndicator.tsx`
- [ ] Style with Tailwind gradient
- [ ] Add phase descriptions on hover
- [ ] Show estimated tokens per phase

### 2.2 PlanSummarySidebar Component
- [ ] Create `components/planning/PlanSummarySidebar.tsx`
- [ ] Show planned file changes
- [ ] Display token estimates
- [ ] Confidence score UI
- [ ] Add save/load buttons

### 2.3 usePlanningWorkflow Hook
- [ ] Create `hooks/usePlanningWorkflow.ts`
- [ ] Implement 4-phase workflow
- [ ] Manage phase transitions
- [ ] Calculate token estimates
- [ ] Track progress state

### 2.4 PlanningPanel Component
- [ ] Create `components/planning/PlanningPanel.tsx`
- [ ] Wrap chat interface for planning mode
- [ ] Show phase-specific UI
- [ ] Handle phase transitions

**Benefit**: Systematic planning process with transparency

**Estimated Effort**: 5-6 days
**Risk**: Medium - new workflow, requires testing

## Phase 3: Templates & Review (Week 5-6)

### 3.1 PlanTemplates System
- [ ] Create template schema
- [ ] Build 5 built-in templates
- [ ] Create `components/planning/PlanTemplates.tsx`
- [ ] Template gallery UI with thumbnails
- [ ] Template search/filter
- [ ] Save custom templates

### 3.2 ReviewScreen Component
- [ ] Create `components/planning/ReviewPanel.tsx`
- [ ] Side-by-side diff view
- [ ] Syntax highlighting
- [ ] Expandable/collapsible file tree
- [ ] Accept/reject individual files
- [ ] Token usage per file

### 3.3 RequestDeduplication
- [ ] Create `hooks/useRequestDeduplication.ts`
- [ ] Implement request hashing
- [ ] Add to chat API calls
- [ ] 30-second deduplication window

**Benefit**: Reduced spam, better UX, faster planning

**Estimated Effort**: 4-5 days
**Risk**: Medium - new components, requires testing

## Phase 4: Build Workflow & Polish (Week 7-8)

### 4.1 useBuildWorkflow Hook
- [ ] Create `hooks/useBuildWorkflow.ts`
- [ ] Handle batching logic
- [ ] Manage apply/approve flow
- [ ] Track build progress

### 4.2 BatchChanges Implementation
- [ ] Implement file batching (max 10 files per commit)
- [ ] Group by directory proximity
- [ ] Error handling per batch
- [ ] Rollback on failure

### 4.3 BuildPanel Component
- [ ] Create `components/deploy/BuildPanel.tsx`
- [ ] Show progress during apply
- [ ] Batch status display
- [ ] Individual file success/failure

### 4.4 Save/Load Plan Persistence
- [ ] Add localStorage persistence
- [ ] JSON export/import
- [ ] Plan versioning
- [ ] Show saved plans in sidebar

**Benefit**: Professional workflow, error recovery

**Estimated Effort**: 5-6 days
**Risk**: High - complex batched operations

## New File Structure

### Components Directory

```typescript
// Existing structure
components/
├── chat/
│   ├── ChatInterface.tsx ⬅️ REFACTOR TO ~500 LINES
│   ├── ChatInterfaceCore.tsx ⬅️ NEW
│   ├── ChatInput.tsx
│   ├── MessageList.tsx
│   ├── ModelSelector.tsx
│   ├── RepoSelector.tsx
│   ├── ApiUsageDisplay.tsx
│   └── ...
└── planning/ ⬅️ NEW
    ├── PlanningPhaseIndicator.tsx
    ├── PlanningPanel.tsx
    ├── PlanSummarySidebar.tsx
    ├── PlanTemplates.tsx
    └── ReviewPanel.tsx

// New deployment structure (move from lib)
deploy/
├── VercelDeployPanel.tsx
├── RenderDeployPanel.tsx
├── BuildPanel.tsx
└── DeployWorkflow.tsx

// Shared utilities
shared/
├── DiffViewer.tsx
├── FileTree.tsx
└── TokenEstimateDisplay.tsx
```

### Hooks Directory

```typescript
// Create structured hooks directory
hooks/
├── planning/
│   ├── usePlanningWorkflow.ts
│   ├── usePlanTemplates.ts
│   └── usePlanPersistence.ts
├── build/
│   ├── useBuildWorkflow.ts
│   └── useBatchChanges.ts
├── api/
│   ├── useResponseCache.ts
│   ├── useSmartPolling.ts
│   └── useRequestDeduplication.ts
└── shared/
    ├── useTokenEstimation.ts
    └── useApiCost.ts
```

### Types Directory

```typescript
// Enhanced type definitions
types/
├── chat.types.ts
├── planning.types.ts ⬅️ NEW
├── deployment.types.ts
└── api.types.ts ⬅️ NEW

// planning.types.ts content:
export interface PlanningPhase {
  id: 'context' | 'requirements' | 'design' | 'review'
  label: string
  description: string
  prompt: string
  estimatedTokens: number
  isCompleted: boolean
  isCurrent: boolean
}

export interface Plan {
  id: string
  name: string
  createdAt: number
  phases: PlanningPhase[]
  changes: FileChange[]
  tokenEstimates: TokenEstimates
  confidence: number
}

export interface FileChange {
  path: string
  content: string
  diff: string
  estimatedTokens: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface TokenEstimates {
  perPhase: Record<string, number>
  total: number
  provider: string
  cost?: number
}
```

## Implementation Details

### Token Estimation

**Challenge**: Accurate token estimation before calling API

**Solution**:
```typescript
// hooks/shared/useTokenEstimation.ts
function estimateTokens(text: string): number {
  // Rough estimation: ~1 token per 4 characters
  // Add overhead for prompt structure
  return Math.floor(text.length / 4) + 100;
}

function estimateChatPromptTokens(
  systemPrompt: string,
  userPrompt: string,
  context: string
): TokenEstimates {
  const total = estimateTokens(systemPrompt) + 
                estimateTokens(userPrompt) + 
                estimateTokens(context);
  
  return {
    perPhase: {
      context: estimateTokens(context),
      response: estimateTokens(userPrompt),
    },
    total,
    provider: 'anthropic', // or whichever provider
    cost: calculateCost(total, 'anthropic'),
  };
}
```

**Accuracy**: ~70-80% of actual usage (good enough for estimation)

### Plan Persistence

**Storage Strategy**:
```typescript
// Use localStorage for plans
interface StoredPlan {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  phases: PlanningPhase[];
  changes: FileChange[];
  tokenEstimates: TokenEstimates;
  repo: { owner: string; repo: string };
  version: number; // for migrations
}

// Max 20 saved plans, 30 days retention
```

### Batch Changes Algorithm

**Batching Logic**:
```typescript
function batchChanges(
  changes: FileChange[],
  maxBatchSize: number = 10
): FileChangeBatch[] {
  // Sort by path for proximity grouping
  const sorted = [...changes].sort((a, b) => a.path.localeCompare(b.path));
  
  const batches: FileChangeBatch[] = [];
  
  for (let i = 0; i < sorted.length; i += maxBatchSize) {
    const batch = sorted.slice(i, i + maxBatchSize);
    
    // Ensure all in batch have same directory root
    const dir = batch[0].path.split('/').slice(0, -1).join('/');
    const sameDir = batch.every(f => f.path.startsWith(dir));
    
    if (sameDir) {
      batches.push({
        files: batch.map(f => ({ path: f.path, content: f.content })),
        commitMessage: createCommitMessage(batch),
      });
    } else {
      // Fall back to single file batches
      batch.forEach(change => {
        batches.push({
          files: [{ path: change.path, content: change.content }],
          commitMessage: `Update ${change.path}`,
        });
      });
    }
  }
  
  return batches;
}
```

### Error Handling

**Strategy by Phase**:

1. **Context Phase**: Retry with smaller context, show partial results
2. **Requirements Phase**: Allow manual input if AI fails
3. **Design Phase**: Manual file selection if generation fails
4. **Review Phase**: Save partial plan, allow resume after error

**Generic Error States**:
- Loading phase indicator
- Error message in context
- Retry button for failed operations
- Fallback to manual mode

## UI Mockups (Descriptive)

### Planning Phase Indicator

**Visual Description**:
- Horizontal bar with 4 connected circles
- Each circle: 24px, blue for current, green for completed, gray for pending
- Connecting lines: 4px height, full width
- Labels below each circle: 12px font
- Hover tooltip: phase description + estimated tokens
- Active animation: pulse on current phase

**States**:
- Phase 1 Active: Blue circle pulsing, blue line extending to next
- Phase 2 Completed: Green circle with checkmark
- Phase 3-4 Pending: Gray circles with dotted lines

### PlanSummarySidebar

**Layout**:
- Fixed width: 320px on right
- Overflow-y: auto
- Collapsible on mobile

**Sections**:
1. **Header**: Plan name, save/load buttons (40px)
2. **Token Estimate**: Total tokens, cost, confidence score (80px)
3. **File Changes**: Scrolling list of files
   - Each file: path (truncated), estimated tokens, status badge
   - Click to expand diff preview
   - Filter by: all, modified, new, deleted
4. **Actions**: Review button, approve all, reject all

### ReviewScreen

**Layout Options**:
- **Side-by-side**: Left (old), Right (new) - default
- **Inline**: Unified diff view - toggle option

**Features**:
- Top: File breadcrumbs path
- Left/Right: Scrollable code blocks with syntax highlighting
- Removed lines: Red background with - indicator
- Added lines: Green background with + indicator
- Left sidebar: File tree with status icons
- Bottom: Token usage for this file + total

## Migration Strategy

### Step-by-Step Refactoring

Because ChatInterface.tsx is currently 4,741 lines, we need an incremental migration strategy:

#### Step 1: Identify Components (Day 1-2)
```bash
# Find repeating patterns and extractable logic
grep -n "const.*useCallback" components/chat/ChatInterface.tsx
# Extract these into hooks

# Find UI patterns to extract
grep -n "return.*<div" components/chat/ChatInterface.tsx  
# Extract into React components
```

#### Step 2: Create Infrastructure (Day 3-5)
- Set up new hooks directory structure
- Create base hook boilerplates
- Extract utility functions to `lib/utils.ts`
- Create types for new components

#### Step 3: Extract and Test (Day 6-10)
- Extract one major component at a time
- Add unit tests for hooks
- Maintain backward compatibility
- Replace inline code with component imports

#### Step 4: Migration Flag (Day 11-15)
```typescript
// Use feature flag to control migration
const USE_NEW_PLANNING = process.env.NEXT_PUBLIC_USE_NEW_PLANNING;

return (
  <>
    {USE_NEW_PLANNING ? (
      <PlanningWorkflow />
    ) : (
      <LegacyPlanningToggle />
    )}
  </>
);
```

This allows rolling back quickly if issues arise.

#### Step 5: Feature by Feature (Ongoing)
- Enable planning workflow first
- Add SmartPolling once stable
- Enable ResponseCache
- Gradually enable all features

### Backward Compatibility

**Critical**: Maintain existing behavior during migration

**API Changes**:
- Maintain all existing chat messages format
- Keep current auto-apply logic
- Preserve deployment workflows
- Don't break existing sessions

**Rollout Strategy**:
1. Development: Full features enabled
2. Staging: 10% of users see new interface
3. Production: Gradual rollout 25% → 50% → 100%
4. Monitoring: Track API usage, error rates, user feedback

## Success Metrics

### API Usage Reduction

**Before**:
- Model fetches: 10 providers × 1 = 10 requests per page load
- Status polling: Every 15 seconds = 288 requests per hour per user
- Average: 298+ requests per hour per user

**After** (target):
- Model fetches: 1 per 10 minutes = 6 requests per hour per user (cached)
- Status polling: Smart polling = ~30 requests per hour per user
- Total: 36 requests per hour (88% reduction)

**Token Usage**:
- Before: No prediction, average 50K tokens per planning session
- After: Predict before generating, average 30K tokens (40% reduction via better prompts)

### Performance Metrics

- **Page Load Time**: Reduce from ~2-3s to < 1s (cached models)
- **Time to First Response**: Reduce by 30% (deduplication)
- **P95 Response Time**: Maintain < 5s for planning

### User Experience Metrics

- **Planning Time**: Reduce from 10-15 minutes to 5-8 minutes
- **Accuracy**: User acceptance rate of planned changes: 85%+ (vs 60% now)
- **User Satisfaction**: NPS score increase by 20 points
- **Error Rate**: Reduce planning errors by 70%

### Developer Experience

- **ChatInterface.tsx**: Reduce from 4,741 lines to ~500 lines
- **Test Coverage**: Achieve 80% coverage for hooks
- **Documentation**: 100% hook documentation with examples

## Technical Considerations

### Performance

- **Memory**: ResponseCache limited to 100MB per tab
- **Bundle Size**: New components add ~50KB gzipped
- **Runtime**: Hook overhead < 5ms per operation

### Browser Compatibility

- **Supported**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Storage**: localStorage for plan persistence (5-10MB quota)
- **Not Supported**: IE11 (no longer a target)

### Security

- **No sensitive caching**: API keys never cached
- **Sanitized content**: File paths validated
- **Escape user input**: XSS prevention in diff viewer
- **Content Security Policy**: Inline scripts blocked

### Error Recovery

- **Caching**: On error, return stale data if available
- **Polling**: Exponential backoff on network errors
- **Batching**: Individual file retry on batch failure
- **Planning**: Auto-save every phase, recover on crash

## Long-term Vision

Beyond the initial 8-week rollout, future enhancements:

### Phase 5-8: Advanced Features

1. **Multi-repo Planning**: Plan across multiple repositories
2. **Collaborative Planning**: Share plans with team members
3. **Plan Versioning**: Git-like history for plan iterations
4. **AI Optimization**: AI suggests better batching strategies
5. **Cloud Sync**: Sync saved plans across devices
6. **API Cost Comparison**: Compare providers for plan
7. **Advanced Templates**: Community-contributed templates
8. **Plan Analytics**: Track planning effectiveness over time

### Architectural Evolution

Consider moving to more robust state management:
```typescript
// Potential future state management
// - Zustand for local state (simpler than Redux)
// - React Query for server state (caching built-in)
// - Jotai for atomic state (flexible)
```

## Appendix

### Quick Reference

**Immediate Actions (This Week)**:
1. [ ] Create design documents directory structure
2. [ ] Set up hooks directory
3. [ ] Implement useResponseCache hook
4. [ ] Add SmartPolling to status checks

**This Month**:
1. [ ] Implement PlanningPhaseIndicator
2. [ ] Create PlanningPanel component
3. [ ] Integrate into ChatInterface
4. [ ] Add basic plan persistence

**Next 2 Months**:
1. [ ] Complete all 4 workflow phases
2. [ ] Add PlanTemplates
3. [ ] Implement ReviewScreen
4. [ ] Add BatchChanges
5. [ ] Migrate off old code paths

### Development Checklist

**Before Starting**:
- [ ] Review current ChatInterface.tsx thoroughly
- [ ] Document all API endpoints used
- [ ] Measure current API usage baseline
- [ ] Create feature flag system
- [ ] Set up A/B testing infrastructure

**During Development**:
- [ ] Write tests for each hook/component
- [ ] Add JSDoc comments to all hooks
- [ ] Create Storybook stories for components
- [ ] Update TypeScript types
- [ ] Add error boundaries

**Before Merge**:
- [ ] Test all error scenarios
- [ ] Verify backward compatibility
- [ ] Measure API usage reduction
- [ ] User acceptance testing
- [ ] Update documentation

### Questions & Answers

**Q: Will this break existing functionality?**
A: No. We use feature flags and maintain backward compatibility throughout migration.

**Q: How much API usage reduction is expected?**
A: 80-90% reduction in overall API calls, 60-70% in token usage per planning session.

**Q: How long will migration take?**
A: 8-10 weeks for full rollout, with immediate benefits visible in week 1-2.

**Q: What happens if the new system fails?**
A: Feature flag allows instant rollback to legacy behavior.

**Q: Will this increase bundle size significantly?**
A: Expected increase of ~50KB gzipped, traded for substantial UX improvements.

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-25  
**Status**: Ready for Implementation  
**Author**: Based on OS-Athena Exploration  
