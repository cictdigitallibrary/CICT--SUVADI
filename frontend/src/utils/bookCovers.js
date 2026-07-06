/**
 * bookCovers.js - maps Tamil book titles to local cover image paths.
 * getBookCover(book) returns the correct src string for an img element.
 * Priority: local /images/cover/ path > API-served cover_image field.
 */

const API = 'http://localhost:3001';

const COVER_MAP = {
  'தொல்காப்பியம்': '/images/cover/Tholkappiyam.png',
  'தொல்காப்பியம் - இளம்பூரணம்': '/images/cover/Tholkappiyam.png',
  'எட்டுத்தொகை': '/images/cover/Ettuthogai.png',
  'குறுந்தொகை': '/images/cover/Ettuthogai.png',
  'பத்துப்பாட்டு': '/images/cover/Pathupaatu.png',
  'சிலப்பதிகாரம்': '/images/cover/silapadhikaram.png',
  'சிலப்பதிகாரம் - அரும்பதவுரை': '/images/cover/silapadhikaram.png',
  'பதினெண் கீழ்க்கணக்கு': '/images/cover/pathinenkeezhkanaku.png',
  'பதினெண்கீழ்க்கணக்கு': '/images/cover/pathinenkeezhkanaku.png',
  'நாலடியார்': '/images/cover/pathinenkeezhkanaku.png',
  'திருக்குறள் - மூலமும் உரையும்': '/images/cover/pathinenkeezhkanaku.png',
  'முத்தொள்ளாயிரம்': '/images/cover/mutholayiram.png',
};

export function getBookCover(book) {
  if (!book) return '';
  const local = COVER_MAP[book.title_tamil];
  if (local) return local;
  if (book.cover_image) return API + book.cover_image;
  return '';
}
