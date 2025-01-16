import { fetchTranscript, InMemoryCache } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      cache: new InMemoryCache(1800000), // 30 minutes TTL
    });

    console.log('Transcript fetched successfully with caching:');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
