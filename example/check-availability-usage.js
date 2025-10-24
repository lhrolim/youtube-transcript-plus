const { checkTranscriptAvailability, YoutubeTranscript } = require('../dist/youtube-transcript-plus.js');

/**
 * Example: Check transcript availability without downloading
 * 
 * This is useful when you want to:
 * - Check if captions exist before fetching
 * - Get available languages without downloading
 * - Validate multiple videos quickly
 */

async function basicAvailabilityCheck() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    
    console.log('Checking transcript availability...\n');
    
    // Using the convenience static method
    const availability = await checkTranscriptAvailability(videoId);
    
    console.log('✓ Transcripts are available!');
    console.log(`  Video ID: ${availability.videoId}`);
    console.log(`  Selected Language: ${availability.selectedLanguage}`);
    console.log(`  Available Languages: ${availability.availableLanguages.join(', ')}`);
    console.log(`  Transcript URL: ${availability.transcriptUrl?.substring(0, 80)}...`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function checkWithSpecificLanguage() {
  try {
    const videoId = 'dQw4w9WgXcQ';
    
    console.log('\nChecking for Spanish transcript...\n');
    
    // Using instance method with config
    const instance = new YoutubeTranscript({ lang: 'es' });
    const availability = await instance.checkTranscriptAvailability(videoId);
    
    console.log('✓ Spanish transcript found!');
    console.log(`  Selected Language: ${availability.selectedLanguage}`);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function batchAvailabilityCheck() {
  const videoIds = [
    'dQw4w9WgXcQ',  // Has captions
    'invalid-id-12345',  // Invalid
  ];
  
  console.log('\nBatch checking multiple videos...\n');
  
  for (const videoId of videoIds) {
    try {
      const availability = await checkTranscriptAvailability(videoId);
      console.log(`✓ ${videoId}: Available (${availability.availableLanguages.length} languages)`);
    } catch (error) {
      console.log(`✗ ${videoId}: ${error.name}`);
    }
  }
}

// Run examples
(async () => {
  await basicAvailabilityCheck();
  await checkWithSpecificLanguage();
  await batchAvailabilityCheck();
})();









