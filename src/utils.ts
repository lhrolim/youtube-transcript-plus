import { DEFAULT_USER_AGENT, RE_YOUTUBE } from './constants';
import { YoutubeTranscriptInvalidVideoIdError } from './errors';

export function retrieveVideoId(videoId: string): string {
  if (videoId.length === 11) {
    return videoId;
  }
  const matchId = videoId.match(RE_YOUTUBE);
  if (matchId && matchId.length) {
    return matchId[1];
  }
  throw new YoutubeTranscriptInvalidVideoIdError();
}

export async function defaultFetch({
  url,
  lang,
  userAgent,
}: {
  url: string;
  lang?: string;
  userAgent?: string;
}): Promise<Response> {
  return fetch(url, {
    headers: {
      ...(lang && { 'Accept-Language': lang }),
      'User-Agent': userAgent || DEFAULT_USER_AGENT,
    },
  });
}
