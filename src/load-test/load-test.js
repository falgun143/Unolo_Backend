import moment from "moment-timezone";

function generateRandomStoreId() {
  return `S${String(Math.floor(Math.random() * 10000000)).padStart(8, "0")}`;
}

function generateRandomScheduledTime() {
  const year = 2025;
  const month = Math.floor(Math.random() * 12); 
  const day = Math.floor(Math.random() * 28) + 1; 
  const hour = Math.floor(Math.random() * 24); 
  const minute = Math.floor(Math.random() * 60); 
  const second = Math.floor(Math.random() * 60); 

  // Convertin UTC to IST
  const date = moment.tz(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`, "UTC").tz("Asia/Kolkata");

  return date.toDate();
}

function generateRandomVisitTime() {
  const now = new Date();
  const randomMinutes = Math.floor(Math.random() * 120) - 60; // ±60 minutes
  now.setMinutes(now.getMinutes() + randomMinutes);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

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
  return Array.from({ length: numImages }, () => imageUrls[Math.floor(Math.random() * imageUrls.length)]);
}

function generateVisits(count) {
  return Array.from({ length: count }, () => ({
    store_id: generateRandomStoreId(),
    image_url: getRandomImages(),
    visit_time: generateRandomVisitTime(),
  }));
}

const generateSmallPayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
    scheduled_time: generateRandomScheduledTime().toISOString().replace("Z", "+05:30"),
  };
  done();
};

const generateMediumPayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 3) + 4; // 4-6 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
    scheduled_time: generateRandomScheduledTime().toISOString().replace("Z", "+05:30"),
  };
  done();
};

const generateLargePayload = (context, events, done) => {
  const count = Math.floor(Math.random() * 4) + 7; // 7-10 visits
  context.vars.payload = {
    count,
    visits: generateVisits(count),
    scheduled_time: generateRandomScheduledTime().toISOString().replace("Z", "+05:30"),
  };
  done();
};

const generateInvalidPayload = (context, events, done) => {
  const invalidTypes = [
    () => ({ visits: generateVisits(1) }), // Missing count
    () => ({ count: 2, visits: generateVisits(1) }), // Count mismatch
    () => ({ count: 1 }), // Missing visits
  ];

  const randomInvalidType = invalidTypes[Math.floor(Math.random() * invalidTypes.length)];
  context.vars.payload = randomInvalidType();
  done();
};

module.exports = {
  generateSmallPayload,
  generateMediumPayload,
  generateLargePayload,
  generateInvalidPayload,
  generateRandomScheduledTime,
};
