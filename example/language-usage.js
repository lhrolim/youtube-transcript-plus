import { fetchTranscript } from 'youtube-transcript-plus';

async function main() {
  try {
    const videoId = 'zIwLWfaAg-8';
    const transcript = await fetchTranscript(videoId, { lang: 'fr' }); // Fetch transcript in French

    console.log('Transcript fetched successfully in French:');
    console.log(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
  }
}

main();
