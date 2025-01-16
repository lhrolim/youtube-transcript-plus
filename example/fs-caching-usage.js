import { fetchTranscript, FsCache } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    const transcript = await fetchTranscript(videoId, {
      cache: new FsCache('./my-cache-dir', 86400000), // 1 day TTL
    });

    console.log('Transcript fetched successfully with file system caching:');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
