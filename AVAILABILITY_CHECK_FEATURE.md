# Transcript Availability Check Feature

## Overview
Added a new method `checkTranscriptAvailability()` that checks if transcripts exist for a video **without downloading them**.

## What Changed

### 1. New Type: `TranscriptAvailability`
```typescript
interface TranscriptAvailability {
  videoId: string;
  available: boolean;
  transcriptUrl?: string;
  selectedLanguage?: string;
  availableLanguages: string[];
}
```

### 2. New Methods

#### Instance Method
```typescript
async checkTranscriptAvailability(videoId: string): Promise<TranscriptAvailability>
```

#### Static Method
```typescript
static async checkTranscriptAvailability(
  videoId: string, 
  config?: TranscriptConfig
): Promise<TranscriptAvailability>
```

#### Convenience Export
```typescript
import { checkTranscriptAvailability } from 'youtube-transcript-plus';
```

## Implementation Details

The method performs steps 1-4 from `fetchTranscript`:
1. ✅ Fetches the watch page
2. ✅ Extracts Innertube API key
3. ✅ Calls the player endpoint
4. ✅ Checks caption tracks and returns metadata
5. ❌ **Does NOT download the transcript XML** (saves bandwidth & time)

## Use Cases

### 1. Check Before Download
```javascript
// Check if captions exist before fetching
const availability = await checkTranscriptAvailability('dQw4w9WgXcQ');
if (availability.available) {
  const transcript = await fetchTranscript('dQw4w9WgXcQ');
}
```

### 2. Get Available Languages
```javascript
const availability = await checkTranscriptAvailability('dQw4w9WgXcQ');
console.log('Available languages:', availability.availableLanguages);
// ['en', 'es', 'fr', 'de', ...]
```

### 3. Batch Validation
```javascript
const videoIds = ['id1', 'id2', 'id3'];
for (const id of videoIds) {
  try {
    const { availableLanguages } = await checkTranscriptAvailability(id);
    console.log(`${id}: ${availableLanguages.length} languages`);
  } catch (error) {
    console.log(`${id}: No captions`);
  }
}
```

### 4. Language Validation
```javascript
// Check if Spanish transcript exists
try {
  const availability = await checkTranscriptAvailability('dQw4w9WgXcQ', { 
    lang: 'es' 
  });
  console.log('Spanish captions available!');
} catch (YoutubeTranscriptNotAvailableLanguageError) {
  console.log('Spanish captions not available');
}
```

## Error Handling

The method throws the same errors as `fetchTranscript`:
- `YoutubeTranscriptVideoUnavailableError` - Video doesn't exist
- `YoutubeTranscriptTooManyRequestError` - Rate limited
- `YoutubeTranscriptDisabledError` - Captions disabled by owner
- `YoutubeTranscriptNotAvailableError` - No captions available
- `YoutubeTranscriptNotAvailableLanguageError` - Requested language not available

## Benefits

1. **Performance**: Skip downloading ~100KB+ XML when you only need metadata
2. **Efficiency**: Validate multiple videos quickly
3. **User Experience**: Show available languages before user commits to download
4. **Cost Savings**: Reduce bandwidth usage when checking availability

## Example File

See `example/check-availability-usage.js` for complete usage examples.

## Code Architecture

### Shared Logic Extraction

To avoid code duplication, a private helper method `_getCaptionTrackMetadata()` was created that performs steps 1-4:
1. Fetch watch page and extract Innertube API key
2. Call Innertube player endpoint
3. Extract and validate caption tracks
4. Build transcript URL

Both `checkTranscriptAvailability()` and `fetchTranscript()` now use this shared helper, resulting in:
- **73 fewer lines of code** (335 → 262 lines)
- **Single source of truth** for caption track discovery
- **Easier maintenance** - changes to the discovery logic only need to be made once

### Method Responsibilities

```
_getCaptionTrackMetadata (private)
  ↓ Returns: { identifier, transcriptUrl, selectedLanguage, availableLanguages }
  ├─→ checkTranscriptAvailability (public)
  │     Returns metadata without downloading
  │
  └─→ fetchTranscript (public)
        Downloads & parses XML transcript
```

## Files Modified

- `src/types.ts` - Added `TranscriptAvailability` interface
- `src/index.ts` - Added `_getCaptionTrackMetadata()` helper and `checkTranscriptAvailability()` methods, refactored `fetchTranscript()` to use shared logic
- `example/check-availability-usage.js` - Usage examples

## Next Steps

1. Review the implementation
2. Test with various video IDs
3. Update main README if needed
4. Commit and publish new version

