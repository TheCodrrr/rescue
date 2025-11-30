export const escalationTimes = {
  low: {
    1: { next: 2, delay: 24 * 3600 * 1000 },     // 1 → 2
    2: { next: 3, delay: 24 * 3600 * 1000 },     // 2 → 3
    3: { next: "close", delay: 24 * 3600 * 1000 }
  },

  medium: {
    1: { next: 2, delay: 12 * 3600 * 1000 },     // 1 → 2
    2: { next: 3, delay: 24 * 3600 * 1000 },     // 2 → 3
    3: { next: 4, delay: 36 * 3600 * 1000 },     // 3 → 4
    4: { next: "close", delay: 48 * 3600 * 1000 }
  },

  high: {
    1: { next: 2, delay: 2 * 3600 * 1000 },      // 1 → 2
    // 1: { next: 2, delay: 60 * 1000 },      // 1 → 2
    2: { next: 3, delay: 12 * 3600 * 1000 },     // 2 → 3
    3: { next: 4, delay: 20 * 3600 * 1000 },     // 3 → 4
    4: { next: 5, delay: 24 * 3600 * 1000 },     // 4 → 5
    5: { next: "close", delay: 30 * 3600 * 1000 }
  }
};