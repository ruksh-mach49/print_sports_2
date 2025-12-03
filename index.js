import cron from "node-cron";
import { handler } from "./print_sports_2.js";
import http from "http";

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200);
    res.end("OK");
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// sunday 00:00am for 8AM batch
cron.schedule(
  "2 0 * * 0",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// sunday 6:15am for 8AM batch
cron.schedule(
  "17 6 * * 0",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday 2:30am for 7AM batch
cron.schedule(
  "32 2 * * 1",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday 6:02am for 7AM batch
cron.schedule(
  "2 6 * * 1",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// tuesday-friday 3:30am for 7AM batch
cron.schedule(
  "32 3 * * 2-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// tuesday-friday 6:00am for 7AM batch
cron.schedule(
  "11 6 * * 2-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday-friday 9:30am for 10AM batch
cron.schedule(
  "32 9 * * 1-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday-friday 11:30am for 12PM batch
cron.schedule(
  "32 11 * * 1-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday-friday 2:00pm for 2:30PM batch
cron.schedule(
  "2 14 * * 1-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);

// monday-friday 3:15pm for 3:45PM batch
cron.schedule(
  "17 15 * * 1-5",
  async () => {
    await handler();
  },
  {
    scheduled: true,
    timezone: "Europe/London", // Ensures UK time
  },
);
