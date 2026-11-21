// The three wings of the Night Archive. Each map is a grid of tiles:
//   '#' wall (blocks movement and sight)
//   'C' crate / cover (blocks movement and sight, hides the courier)
//   's' shadow rug (dark floor: the courier is harder to spot standing on it)
//   '.' open floor
//   'P' the courier's starting tile
//   'F' a file to collect (the exit stays locked until all are taken)
//   'E' the exit door
// Every open tile is reachable from the start, and every guard patrol
// segment runs straight along open floor. Guards patrol the waypoint
// loops listed per level; waypoints are tile coordinates, walked in
// order, pausing briefly at each one.
export const LEVELS = [
  {
    name: 'Wing One — The Reading Room',
    briefing: 'Two wardens walk the reading room. Lift both files, then slip out the green door unseen.',
    filesNeeded: 2,
    map: [
      '################################',
      '#P....#.......#.......#........#',
      '#.....#...C...#............E...#',
      '#..C..........#.......#.C......#',
      '#.....#.......#...C...#........#',
      '#.....#...............#........#',
      '#.....#...s...#.....C.#...s....#',
      '###.######.#######.#######.#####',
      '#.....#.......#.......#........#',
      '#.F...#.C.....#................#',
      '#.............#.......#..C.....#',
      '#....s#...............#........#',
      '#.....#..C....#..C..s.#........#',
      '#.....#.......#.......#...F....#',
      '####.######.#######.#######.####',
      '#...C.#...............#.....C..#',
      '#...........C.#................#',
      '################################',
    ],
    guards: [
      { x: 4, y: 9, path: [[4, 9], [4, 12], [5, 12], [5, 9]], pause: 1.2 },
      { x: 24, y: 12, path: [[24, 12], [24, 9], [28, 9], [28, 12]], pause: 1.0 },
    ],
  },
  {
    name: 'Wing Two — The Stacks',
    briefing: 'Three wardens, longer sightlines. The dark rugs are your friends — detection grows half as fast on them.',
    filesNeeded: 2,
    map: [
      '################################',
      '#P......#.......#.......#......#',
      '#...............#.s.....#....E.#',
      '#.......#....C..#..............#',
      '#..C....#...........C...#....C.#',
      '#.......#...s...#.......#......#',
      '####.#######.#######.#######.###',
      '#.......#.......#.......#......#',
      '#.......#.......#.......#..FC..#',
      '#....C..........#.C.....#......#',
      '#...s...#.......#.....s........#',
      '#.......#...............#......#',
      '###.#######.#######.#######.####',
      '#.......#.......#.......#.C....#',
      '#.....C.#....C..#..............#',
      '#....F....C.....#....C..#...s..#',
      '#.......#...............#......#',
      '################################',
    ],
    guards: [
      { x: 12, y: 2, path: [[12, 2], [12, 5], [14, 5], [14, 2]], pause: 0.9 },
      { x: 20, y: 9, path: [[20, 9], [20, 11], [22, 11], [22, 9]], pause: 1.1 },
      { x: 28, y: 14, path: [[28, 14], [28, 15], [30, 15], [30, 14]], pause: 1.0 },
    ],
  },
  {
    name: 'Wing Three — The Vault Wing',
    briefing: 'Four wardens, three files, and a patrol that crosses the middle hall. Slow is smooth, and smooth is unseen.',
    filesNeeded: 3,
    map: [
      '################################',
      '#P.....#.......#.......#.....E.#',
      '#......#...............#.......#',
      '#...C.......C..#.s.....#.......#',
      '#......#.......#...C........F..#',
      '#......#...s...#.......#.....C.#',
      '###.#######.#######.#######.####',
      '#......#.......#.......#.......#',
      '#....C.#.......#.C.....#.......#',
      '#..F...#...............#...C...#',
      '#..............#.....s.#.......#',
      '#....s.#.......#...............#',
      '####.#####.#######.#########.###',
      '#......#.......#...F...#.C.....#',
      '#..C...#....C..........#.......#',
      '#........C.....#....C..#...s...#',
      '#......#.......#...............#',
      '################################',
    ],
    guards: [
      { x: 11, y: 2, path: [[11, 2], [11, 5], [13, 5], [13, 2]], pause: 0.8 },
      { x: 19, y: 9, path: [[19, 9], [19, 11], [21, 11], [21, 9]], pause: 0.8 },
      { x: 4, y: 14, path: [[4, 14], [4, 15], [6, 15], [6, 14]], pause: 1.0 },
      { x: 27, y: 14, path: [[27, 14], [27, 15], [29, 15], [29, 14]], pause: 1.0 },
    ],
  },
];
