function generateRandomStoreId() {
  return `S${String(Math.floor(Math.random() * 10000000)).padStart(8, "0")}`;
}

function generateRandomVisitTime() {
  const now = new Date();
  const randomMinutes = Math.floor(Math.random() * 120) - 60; // ±60 minutes
  now.setMinutes(now.getMinutes() + randomMinutes);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function getRandomImages(min = 1, max = 3) {
  const imageUrls = [
    "https://www.gstatic.com/webp/gallery/1.jpg",
    "https://www.gstatic.com/webp/gallery/2.jpg",
    "https://www.gstatic.com/webp/gallery/3.jpg",
    "https://www.gstatic.com/webp/gallery/4.jpg",
    "https://www.gstatic.com/webp/gallery/5.jpg",
  ];

  const numImages = Math.floor(Math.random() * (max - min + 1)) + min;
  return Array.from(
    { length: numImages },
    () => imageUrls[Math.floor(Math.random() * imageUrls.length)]
  );
}

function generateVisits(count) {
  return Array.from(
    { length: count },
    () => ({
      store_id: generateRandomStoreId(),
      image_url: getRandomImages(),
      visit_time: generateRandomVisitTime(),
    })
  );
}

const generateSmallPayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
  };
  done();
};

const generateMediumPayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 3) + 4; // 4-6 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
  };
  done();
};

const generateLargePayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 4) + 7; // 7-10 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
  };
  done();
};

const generateInvalidPayload = (context, events, done) => {
  const invalidTypes = [
    () => ({ visits: generateVisits(1) }), // Missing count
    () => ({ count: 2, visits: generateVisits(1) }), // Count mismatch
    () => ({ count: 1 }), // Missing visits
  ];

  const randomInvalidType =
    invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
  context.vars.payload = randomInvalidType();
  done();
};

module.exports = {
  generateSmallPayload,
  generateMediumPayload,
  generateLargePayload,
  generateInvalidPayload,
};
