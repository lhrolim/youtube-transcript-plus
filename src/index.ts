import { DEFAULT_USER_AGENT, RE_XML_TRANSCRIPT } from './constants';
import { retrieveVideoId, defaultFetch } from './utils';
import {
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from './errors';
import { TranscriptConfig, TranscriptResponse, FetchParams, TranscriptAvailability } from './types';

/**
 * Internal helper type for caption track metadata
 */
interface CaptionTrackMetadata {
  identifier: string;
  transcriptUrl: string;
  selectedLanguage: string;
  availableLanguages: string[];
}

/**
 * Implementation notes:
 * - Keeps the public surface identical.
 * - Internals now use YouTube Innertube `player` to discover captionTracks instead of scraping the watch HTML.
 * - Honors `lang`, custom fetch hooks (`videoFetch`, `transcriptFetch`), and optional cache strategy.
 */
export class YoutubeTranscript {
  constructor(private config?: TranscriptConfig) {}

  /**
   * Private helper method that performs steps 1-4 of transcript fetching:
   * 1. Fetch watch page and extract Innertube API key
   * 2. Call Innertube player endpoint
   * 3. Extract and validate caption tracks
   * 4. Build transcript URL
   *
   * This is shared by both checkTranscriptAvailability and fetchTranscript.
   */
  private async _getCaptionTrackMetadata(videoId: string): Promise<CaptionTrackMetadata> {
    const identifier = retrieveVideoId(videoId);

    const lang = this.config?.lang;
    const userAgent = this.config?.userAgent ?? DEFAULT_USER_AGENT;

    // 1) Fetch the watch page to extract an Innertube API key
    const protocol = this.config?.disableHttps ? 'http' : 'https';
    const watchUrl = `${protocol}://www.youtube.com/watch?v=${identifier}`;
    const videoPageResponse = this.config?.videoFetch
      ? await this.config.videoFetch({ url: watchUrl, lang, userAgent })
      : await defaultFetch({ url: watchUrl, lang, userAgent });

    if (!videoPageResponse.ok) {
      throw new YoutubeTranscriptVideoUnavailableError(identifier);
    }

    const videoPageBody = await videoPageResponse.text();

    // Basic bot/recaptcha detection
    if (videoPageBody.includes('class="g-recaptcha"')) {
      throw new YoutubeTranscriptTooManyRequestError();
    }

    // 2) Extract Innertube API key from the page
    const apiKeyMatch =
      videoPageBody.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
      videoPageBody.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);

    if (!apiKeyMatch) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    const apiKey = apiKeyMatch[1];

    // 3) Call Innertube player as ANDROID client to retrieve captionTracks
    const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    const playerBody = {
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
        },
      },
      videoId: identifier,
    };

    const playerFetchParams: FetchParams = {
      url: playerEndpoint,
      method: 'POST',
      lang,
      userAgent,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerBody),
    };
    const playerRes = this.config?.playerFetch
      ? await this.config.playerFetch(playerFetchParams)
      : await defaultFetch(playerFetchParams);

    if (!playerRes.ok) {
      throw new YoutubeTranscriptVideoUnavailableError(identifier);
    }

    const playerJson: any = await playerRes.json();

    const tracklist =
      playerJson?.captions?.playerCaptionsTracklistRenderer ??
      playerJson?.playerCaptionsTracklistRenderer;

    const tracks = tracklist?.captionTracks;

    const isPlayableOk = playerJson?.playabilityStatus?.status === 'OK';

    // If `captions` is entirely missing, treat as "not available"
    if (!playerJson?.captions || !tracklist) {
      if (isPlayableOk) {
        throw new YoutubeTranscriptDisabledError(identifier);
      }
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // If `captions` exists but there are zero tracks, treat as "disabled"
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new YoutubeTranscriptDisabledError(identifier);
    }

    // Get all available languages
    const availableLanguages = tracks.map((t: any) => t.languageCode).filter(Boolean);

    // 4) Respect requested language or fallback to first track
    const selectedTrack = lang ? tracks.find((t: any) => t.languageCode === lang) : tracks[0];

    if (!selectedTrack) {
      throw new YoutubeTranscriptNotAvailableLanguageError(lang!, availableLanguages, identifier);
    }

    // Build transcript URL
    let transcriptUrl: string = selectedTrack.baseUrl || selectedTrack.url;
    if (!transcriptUrl) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }
    transcriptUrl = transcriptUrl.replace(/&fmt=[^&]+$/, '');

    if (this.config?.disableHttps) {
      transcriptUrl = transcriptUrl.replace(/^https:\/\//, 'http://');
    }

    return {
      identifier,
      transcriptUrl,
      selectedLanguage: selectedTrack.languageCode,
      availableLanguages,
    };
  }

  /**
   * Check if transcripts are available for a video without downloading them.
   * This method performs steps 1-4 of the transcript fetching process to determine
   * availability and get metadata about available caption tracks.
   *
   * @param videoId - YouTube video ID or URL
   * @returns TranscriptAvailability object with availability status and metadata
   * @throws Same errors as fetchTranscript for unavailable/disabled transcripts
   */
  async checkTranscriptAvailability(videoId: string): Promise<TranscriptAvailability> {
    const metadata = await this._getCaptionTrackMetadata(videoId);

    return {
      videoId: metadata.identifier,
      available: true,
      transcriptUrl: metadata.transcriptUrl,
      selectedLanguage: metadata.selectedLanguage,
      availableLanguages: metadata.availableLanguages,
    };
  }

  async fetchTranscript(videoId: string): Promise<TranscriptResponse[]> {
    const userAgent = this.config?.userAgent ?? DEFAULT_USER_AGENT;
    const lang = this.config?.lang;

    // Cache lookup (if provided)
    const cache = this.config?.cache;
    const cacheTTL = this.config?.cacheTTL;

    // Get metadata using helper (steps 1-4)
    const metadata = await this._getCaptionTrackMetadata(videoId);
    const { identifier, transcriptUrl, selectedLanguage } = metadata;

    const cacheKey = `yt:transcript:${identifier}:${lang ?? ''}`;
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as TranscriptResponse[];
        } catch {
          // ignore parse errors and continue
        }
      }
    }

    // 5) Fetch transcript XML
    const transcriptResponse = this.config?.transcriptFetch
      ? await this.config.transcriptFetch({ url: transcriptUrl, lang, userAgent })
      : await defaultFetch({ url: transcriptUrl, lang, userAgent });

    if (!transcriptResponse.ok) {
      if (transcriptResponse.status === 429) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    const transcriptBody = await transcriptResponse.text();

    // 6) Parse XML into TranscriptResponse array
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    const transcript: TranscriptResponse[] = results.map((m) => ({
      text: m[3],
      duration: parseFloat(m[2]),
      offset: parseFloat(m[1]),
      lang: lang ?? selectedLanguage,
    }));

    if (transcript.length === 0) {
      throw new YoutubeTranscriptNotAvailableError(identifier);
    }

    // Cache store
    if (cache) {
      try {
        await cache.set(cacheKey, JSON.stringify(transcript), cacheTTL);
      } catch {
        // non-fatal
      }
    }

    return transcript;
  }

  static async checkTranscriptAvailability(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptAvailability> {
    const instance = new YoutubeTranscript(config);
    return instance.checkTranscriptAvailability(videoId);
  }

  static async fetchTranscript(
    videoId: string,
    config?: TranscriptConfig,
  ): Promise<TranscriptResponse[]> {
    const instance = new YoutubeTranscript(config);
    return instance.fetchTranscript(videoId);
  }
}

export type { CacheStrategy, TranscriptAvailability } from './types';
export { InMemoryCache, FsCache } from './cache';

export * from './errors';

// Export the static methods directly for convenience
export const fetchTranscript = YoutubeTranscript.fetchTranscript;
export const checkTranscriptAvailability = YoutubeTranscript.checkTranscriptAvailability;
