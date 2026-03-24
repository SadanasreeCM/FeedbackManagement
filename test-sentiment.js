const Sentiment = require('sentiment');
const sentiment = new Sentiment();

const testPhrases = [
  'Great service, very happy!',
  'This is okay, nothing special',
  'Terrible experience, very disappointed',
  'Amazing product, highly recommend',
  'Not satisfied with quality',
  'It works fine',
  'Excellent customer support',
  'Waste of money',
  'Could be better',
  'Love it!'
];

console.log('Testing Sentiment Analysis:\n');
testPhrases.forEach(phrase => {
  const result = sentiment.analyze(phrase);
  console.log(`Phrase: "${phrase}"`);
  console.log(`Score: ${result.score}, Comparative: ${result.comparative}`);
  console.log('');
});
