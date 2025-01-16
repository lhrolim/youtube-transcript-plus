import { YoutubeTranscript } from '../index';
import {
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableLanguageError,
} from '../errors';

describe('YoutubeTranscript', () => {
  it('should fetch transcript successfully', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await transcriptFetcher.fetchTranscript(videoId);
    expect(transcript).toBeDefined();
    expect(transcript.length).toBeGreaterThan(0);
  });

  it('should throw YoutubeTranscriptInvalidVideoIdError when video is invalid', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'invalidVideoId';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptInvalidVideoIdError,
    );
  });

  it('should throw YoutubeTranscriptDisabledError when transcript is disabled', async () => {
    const transcriptFetcher = new YoutubeTranscript();
    const videoId = 'UE03iN4QG1E';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptDisabledError,
    );
  });

  it('should throw YoutubeTranscriptNotAvailableLanguageError when transcript is not available in the specified language', async () => {
    const transcriptFetcher = new YoutubeTranscript({ lang: 'fr' });
    const videoId = 'dQw4w9WgXcQ';
    await expect(transcriptFetcher.fetchTranscript(videoId)).rejects.toThrow(
      YoutubeTranscriptNotAvailableLanguageError,
    );
  });
});
