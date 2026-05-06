(() => {
  const ROWS = 6;
  const COLS = 7;
  const EMPTY = 0;
  const RED = 1;
  const YELLOW = 2;
  const SOUND_PREF_KEY = "connect4:soundEnabled";

  const COLORS = {
    boardA: "#1668d6",
    boardB: "#0f4aaa",
    slot: "#0a2f73",
    red: "#f95c53",
    yellow: "#ffd24f",
    redDark: "#c73931",
    yellowDark: "#c8981e",
    line: "rgba(255,255,255,0.25)",
    glow: "rgba(255,255,255,0.35)",
  };

  const state = {
    board: makeBoard(),
    currentPlayer: RED,
    gameOver: false,
    mode: "pvp",
    difficulty: "medium",
    scores: { [RED]: 0, [YELLOW]: 0 },
    winningCells: [],
    anim: null,
    hoverCol: -1,
    waitingForCpu: false,
    nextStarter: RED,   // alternates each round in PvP
    draining: false,
    drainDiscs: [],
    roundStarted: false,
  };

  const canvas = document.getElementById("connect4Canvas");
  const ctx = canvas.getContext("2d");

  const gameModeEl = document.getElementById("gameMode");
  const difficultyEl = document.getElementById("difficulty");
  const statusEl = document.getElementById("statusText");
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");
  const p1NameEl = document.getElementById("player1Name");
  const p2NameEl = document.getElementById("player2Name");
  const scoreCard1 = document.getElementById("scoreCard1");
  const scoreCard2 = document.getElementById("scoreCard2");
  const boardOverlay = document.getElementById("boardOverlay");
  const newRoundBtn = document.getElementById("newRoundBtn");
  const resetScoreBtn = document.getElementById("resetScoreBtn");
  const audioToggle = document.getElementById("audioToggle");
  const soundRow = document.getElementById("soundRow");

  const audio = {
    enabled: false,
    ready: false,
    drop: null,
    win: null,
    ui: null,
    coinPool: [],
  };

  function readSoundPreference() {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) === "1";
    } catch {
      return false;
    }
  }

  function writeSoundPreference(enabled) {
    try {
      localStorage.setItem(SOUND_PREF_KEY, enabled ? "1" : "0");
    } catch {
      // Ignore storage failures in private/restricted contexts.
    }
  }

  function updateAudioButton() {
    audioToggle.checked = audio.enabled;
    soundRow.classList.toggle("is-on", audio.enabled);
  }

  function updateOverlayVisibility() {
    const show = !state.draining && (!state.roundStarted || state.gameOver);
    boardOverlay.classList.toggle("visible", show);
  }

  function startActiveRound() {
    state.roundStarted = true;
    updateOverlayVisibility();
    setStatus(`${playerName(state.currentPlayer)} to move`);
  }

  function makeBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function availableColumns(board = state.board) {
    const cols = [];
    for (let c = 0; c < COLS; c += 1) {
      if (board[0][c] === EMPTY) cols.push(c);
    }
    return cols;
  }

  function getNextOpenRow(board, col) {
    for (let r = ROWS - 1; r >= 0; r -= 1) {
      if (board[r][col] === EMPTY) return r;
    }
    return -1;
  }

  function dropOnBoard(board, col, player) {
    const row = getNextOpenRow(board, col);
    if (row < 0) return -1;
    board[row][col] = player;
    return row;
  }

  function isBoardFull(board = state.board) {
    return board[0].every((cell) => cell !== EMPTY);
  }

  function switchPlayer() {
    state.currentPlayer = state.currentPlayer === RED ? YELLOW : RED;
  }

  function playerName(player) {
    if (state.mode === "cpu") {
      return player === RED ? "You" : "Computer";
    }
    return player === RED ? "Red" : "Yellow";
  }

  function updateNames() {
    if (state.mode === "cpu") {
      p1NameEl.textContent = "You (Red)";
      p2NameEl.textContent = "Computer (Yellow)";
    } else {
      p1NameEl.textContent = "Red";
      p2NameEl.textContent = "Yellow";
    }
  }

  function updateScores() {
    score1El.textContent = String(state.scores[RED]);
    score2El.textContent = String(state.scores[YELLOW]);
  }

  function updateTurnIndicator() {
    scoreCard1.style.boxShadow = state.currentPlayer === RED ? "0 0 0 4px rgba(249,92,83,0.5) inset" : "none";
    scoreCard2.style.boxShadow = state.currentPlayer === YELLOW ? "0 0 0 4px rgba(255,210,79,0.5) inset" : "none";
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function resetRound() {
    state.board = makeBoard();
    // In PvP the first-mover alternates each round; CPU human always starts as Red
    state.currentPlayer = state.mode === "pvp" ? state.nextStarter : RED;
    if (state.mode === "pvp") {
      state.nextStarter = state.nextStarter === RED ? YELLOW : RED;
    }
    state.gameOver = false;
    state.winningCells = [];
    state.anim = null;
    state.waitingForCpu = false;
    state.roundStarted = false;
    updateTurnIndicator();
    updateOverlayVisibility();
    setStatus(`Press Play - ${playerName(state.currentPlayer)} moves first`);
    draw();
  }

  function resetScores() {
    state.scores[RED] = 0;
    state.scores[YELLOW] = 0;
    state.nextStarter = RED;
    updateScores();
  }

  // Animate all discs falling out of the board column-by-column, then invoke callback.
  function drainBoard(callback) {
    const g = boardGeometry();
    const floorY = g.oy + g.bh + g.cell;
    const discs = [];

    for (let c = 0; c < COLS; c += 1) {
      let rank = 0; // 0 = bottom-most occupied cell in this column
      for (let r = ROWS - 1; r >= 0; r -= 1) {
        if (state.board[r][c] !== EMPTY) {
          const { x, y } = discCenter(r, c, g);
          discs.push({
            x,
            y,
            vy: 0,
            col: c,
            player: state.board[r][c],
            // columns stagger left-to-right; within a column the bottom disc falls first
            startDelay: c * 55 + rank * 42,
            started: false,
            done: false,
          });
          rank += 1;
        }
      }
    }

    if (discs.length === 0) {
      state.draining = false;
      updateOverlayVisibility();
      callback();
      return;
    }

    // Clear live board and any in-flight animation immediately
    state.board = makeBoard();
    state.anim = null;
    state.winningCells = [];
    state.draining = true;
    state.drainDiscs = discs;
    updateOverlayVisibility();

    scheduleDrainSounds(discs);

    const gravity = g.cell * 0.055; // scales with board size
    const begin = performance.now();

    function step(now) {
      if (!state.draining) return;

      const elapsed = now - begin;
      let allDone = true;

      for (const disc of state.drainDiscs) {
        if (disc.done) continue;
        allDone = false;
        if (elapsed < disc.startDelay) continue;
        disc.started = true;
        disc.vy += gravity;
        disc.y += disc.vy;
        if (disc.y > floorY) disc.done = true;
      }

      draw();

      if (allDone) {
        state.draining = false;
        state.drainDiscs = [];
        updateOverlayVisibility();
        callback();
        return;
      }

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function checkWin(board, player) {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (board[r][c] !== player) continue;
        for (const [dr, dc] of directions) {
          const cells = [[r, c]];
          let ok = true;
          for (let i = 1; i < 4; i += 1) {
            const rr = r + dr * i;
            const cc = c + dc * i;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr][cc] !== player) {
              ok = false;
              break;
            }
            cells.push([rr, cc]);
          }
          if (ok) return cells;
        }
      }
    }

    return null;
  }

  function boardGeometry() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cell = Math.min(w / COLS, h / ROWS);
    const bw = cell * COLS;
    const bh = cell * ROWS;
    const ox = (w - bw) / 2;
    const oy = (h - bh) / 2;
    return { w, h, cell, bw, bh, ox, oy, radius: cell * 0.39 };
  }

  function discCenter(row, col, g) {
    return {
      x: g.ox + col * g.cell + g.cell / 2,
      y: g.oy + row * g.cell + g.cell / 2,
    };
  }

  function drawDisc(x, y, radius, player, highlight = false) {
    const isRed = player === RED;
    const base = isRed ? COLORS.red : COLORS.yellow;
    const dark = isRed ? COLORS.redDark : COLORS.yellowDark;

    const grad = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.28, radius * 0.2, x, y, radius);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.16, base);
    grad.addColorStop(1, dark);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.96, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();

    if (highlight) {
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.08, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(126,255,177,0.85)";
      ctx.stroke();
    }
  }

  function draw() {
    const g = boardGeometry();

    ctx.clearRect(0, 0, g.w, g.h);

    const bg = ctx.createLinearGradient(0, 0, 0, g.h);
    bg.addColorStop(0, "rgba(255,255,255,0.15)");
    bg.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, g.w, g.h);

    if (!state.gameOver && !state.anim && state.hoverCol >= 0) {
      const cx = g.ox + state.hoverCol * g.cell + g.cell / 2;
      const cy = g.oy - g.cell * 0.45;
      const ghostPlayer = state.currentPlayer;
      ctx.globalAlpha = 0.45;
      drawDisc(cx, cy, g.radius, ghostPlayer, false);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = COLORS.boardA;
    ctx.fillRect(g.ox, g.oy, g.bw, g.bh);

    const boardGrad = ctx.createLinearGradient(g.ox, g.oy, g.ox, g.oy + g.bh);
    boardGrad.addColorStop(0, "rgba(255,255,255,0.2)");
    boardGrad.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = boardGrad;
    ctx.fillRect(g.ox, g.oy, g.bw, g.bh);

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const { x, y } = discCenter(r, c, g);

        ctx.beginPath();
        ctx.arc(x, y, g.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.slot;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, g.radius * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.stroke();
      }
    }

    const winningSet = new Set(state.winningCells.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const value = state.board[r][c];
        if (value === EMPTY) continue;
        const { x, y } = discCenter(r, c, g);
        const highlight = winningSet.has(`${r},${c}`);
        drawDisc(x, y, g.radius * 0.95, value, highlight);
      }
    }

    if (state.anim) {
      const center = discCenter(state.anim.row, state.anim.col, g);
      drawDisc(center.x, state.anim.y, g.radius * 0.95, state.anim.player, false);
    }

    // Drain discs — clipped to board bounds so they vanish at the bottom edge
    if (state.draining && state.drainDiscs.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(g.ox, g.oy, g.bw, g.bh);
      ctx.clip();
      for (const disc of state.drainDiscs) {
        if (!disc.started || disc.done) continue;
        drawDisc(disc.x, disc.y, g.radius * 0.95, disc.player, false);
      }
      ctx.restore();
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.line;
    for (let c = 0; c <= COLS; c += 1) {
      const x = g.ox + c * g.cell;
      ctx.beginPath();
      ctx.moveTo(x, g.oy);
      ctx.lineTo(x, g.oy + g.bh);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r += 1) {
      const y = g.oy + r * g.cell;
      ctx.beginPath();
      ctx.moveTo(g.ox, y);
      ctx.lineTo(g.ox + g.bw, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.strokeRect(g.ox, g.oy, g.bw, g.bh);
  }

  function columnFromPointer(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const g = boardGeometry();
    if (x < g.ox || x > g.ox + g.bw) return -1;
    const col = Math.floor((x - g.ox) / g.cell);
    return col >= 0 && col < COLS ? col : -1;
  }

  function canHumanMove() {
    if (!state.roundStarted || state.gameOver || state.anim || state.waitingForCpu || state.draining) return false;
    if (state.mode === "cpu" && state.currentPlayer === YELLOW) return false;
    return true;
  }

  function animateDrop(col, row, player) {
    const g = boardGeometry();
    const target = discCenter(row, col, g).y;
    const start = g.oy - g.cell * 0.55;
    state.anim = { col, row, player, y: start };

    const durationMs = 360;
    const begin = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(now) {
      if (!state.anim) return;
      const elapsed = now - begin;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      state.anim.y = start + (target - start) * eased;

      draw();

      if (t >= 1) {
        state.anim = null;
        finalizeMove(col, row, player);
        draw();
        return;
      }

      requestAnimationFrame(step);
    }

    draw();
    requestAnimationFrame(step);
  }

  function playDropSound(player) {
    if (!audio.enabled || !audio.ready || !audio.drop) return;
    const note = player === RED ? "C3" : "G3";
    audio.drop.triggerAttackRelease(note, "8n", Tone.now(), 0.65);
  }

  function playUiSound() {
    if (!audio.enabled || !audio.ready || !audio.ui) return;
    audio.ui.triggerAttackRelease("D5", "32n", Tone.now(), 0.3);
  }

  // Fire each coin-clink at the right moment via setTimeout so no Tone scheduling conflicts.
  // One voice per column keeps triggers sequential within each column.
  function scheduleDrainSounds(discs) {
    if (!audio.enabled || !audio.ready || !audio.coinPool.length) return;
    discs.forEach((disc) => {
      window.setTimeout(() => {
        if (!audio.enabled) return;
        const synth = audio.coinPool[disc.col % audio.coinPool.length];
        // Randomise pitch slightly each time for a natural coin sound
        synth.frequency.value = 320 + disc.col * 28 + Math.random() * 60;
        synth.triggerAttackRelease("32n", Tone.now(), 0.45);
      }, disc.startDelay);
    });
  }

  function playWinSound(player) {
    if (!audio.enabled || !audio.ready || !audio.win) return;
    const now = Tone.now();
    const chord = player === RED ? ["C4", "E4", "G4", "C5"] : ["D4", "F4", "A4", "D5"];
    audio.win.triggerAttackRelease(chord, "4n", now, 0.9);
    audio.win.triggerAttackRelease([chord[2], chord[3]], "2n", now + 0.28, 0.7);
  }

  async function enableAudio() {
    if (!window.Tone) {
      audio.enabled = false;
      updateAudioButton();
      return;
    }

    await Tone.start();
    if (!audio.ready) {
      audio.drop = new Tone.MembraneSynth({
        pitchDecay: 0.03,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0.02, release: 0.2 },
      }).toDestination();

      audio.win = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
      }).toDestination();

      audio.ui = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.07, sustain: 0.01, release: 0.05 },
      }).toDestination();

      // Seven MetalSynth voices — one per column — so drain sounds never voice-steal
      for (let i = 0; i < 7; i += 1) {
        audio.coinPool.push(
          new Tone.MetalSynth({
            frequency: 400,
            envelope: { attack: 0.001, decay: 0.09, release: 0.06 },
            harmonicity: 5.1,
            modulationIndex: 16,
            resonance: 3200,
            octaves: 1.5,
            volume: -14,
          }).toDestination()
        );
      }

      audio.ready = true;
    }
  }

  async function syncAudioFromPreference() {
    if (audio.enabled && !audio.ready) {
      await enableAudio();
    }
    updateAudioButton();
  }

  function doMove(col) {
    if (!canHumanMove()) return;
    if (col < 0 || col >= COLS) return;

    const row = getNextOpenRow(state.board, col);
    if (row < 0) return;

    playDropSound(state.currentPlayer);
    state.board[row][col] = state.currentPlayer;
    animateDrop(col, row, state.currentPlayer);
  }

  function finalizeMove(col, row, player) {
    const winCells = checkWin(state.board, player);

    if (winCells) {
      state.gameOver = true;
      state.winningCells = winCells;
      state.scores[player] += 1;
      updateScores();
      updateTurnIndicator();
      playWinSound(player);
      setStatus(`${playerName(player)} wins! Press Play to continue.`);
      updateOverlayVisibility();
      return;
    }

    if (isBoardFull(state.board)) {
      state.gameOver = true;
      state.winningCells = [];
      setStatus("Draw game. Press Play for a rematch.");
      updateOverlayVisibility();
      return;
    }

    switchPlayer();
    updateTurnIndicator();
    setStatus(`${playerName(state.currentPlayer)} to move`);

    if (state.mode === "cpu" && state.currentPlayer === YELLOW) {
      state.waitingForCpu = true;
      window.setTimeout(() => {
        if (state.gameOver) {
          state.waitingForCpu = false;
          return;
        }
        const cpuCol = chooseCpuMove();
        state.waitingForCpu = false;
        if (cpuCol >= 0) {
          doCpuMove(cpuCol);
        }
      }, 260);
    }
  }

  function doCpuMove(col) {
    const row = getNextOpenRow(state.board, col);
    if (row < 0 || state.gameOver || state.anim) return;
    playDropSound(YELLOW);
    state.board[row][col] = YELLOW;
    animateDrop(col, row, YELLOW);
  }

  function findImmediateWin(board, player) {
    const cols = availableColumns(board);
    for (const col of cols) {
      const test = cloneBoard(board);
      const row = dropOnBoard(test, col, player);
      if (row < 0) continue;
      if (checkWin(test, player)) return col;
    }
    return -1;
  }

  function scoreWindow(windowVals, player) {
    const opp = player === RED ? YELLOW : RED;
    const playerCount = windowVals.filter((v) => v === player).length;
    const oppCount = windowVals.filter((v) => v === opp).length;
    const emptyCount = windowVals.filter((v) => v === EMPTY).length;

    if (playerCount === 4) return 100000;
    if (playerCount === 3 && emptyCount === 1) return 130;
    if (playerCount === 2 && emptyCount === 2) return 12;

    if (oppCount === 3 && emptyCount === 1) return -120;
    if (oppCount === 2 && emptyCount === 2) return -10;
    return 0;
  }

  function evaluateBoard(board, player) {
    let score = 0;

    const centerCol = Math.floor(COLS / 2);
    let centerCount = 0;
    for (let r = 0; r < ROWS; r += 1) {
      if (board[r][centerCol] === player) centerCount += 1;
    }
    score += centerCount * 8;

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS - 3; c += 1) {
        const windowVals = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
        score += scoreWindow(windowVals, player);
      }
    }

    for (let c = 0; c < COLS; c += 1) {
      for (let r = 0; r < ROWS - 3; r += 1) {
        const windowVals = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
        score += scoreWindow(windowVals, player);
      }
    }

    for (let r = 0; r < ROWS - 3; r += 1) {
      for (let c = 0; c < COLS - 3; c += 1) {
        const windowVals = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
        score += scoreWindow(windowVals, player);
      }
    }

    for (let r = 0; r < ROWS - 3; r += 1) {
      for (let c = 3; c < COLS; c += 1) {
        const windowVals = [board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]];
        score += scoreWindow(windowVals, player);
      }
    }

    return score;
  }

  function isTerminal(board) {
    return !!checkWin(board, RED) || !!checkWin(board, YELLOW) || availableColumns(board).length === 0;
  }

  function minimax(board, depth, alpha, beta, maximizingPlayer) {
    const validMoves = availableColumns(board);
    const terminal = isTerminal(board);

    if (depth === 0 || terminal) {
      if (terminal) {
        if (checkWin(board, YELLOW)) return { score: 10000000, col: -1 };
        if (checkWin(board, RED)) return { score: -10000000, col: -1 };
        return { score: 0, col: -1 };
      }
      return { score: evaluateBoard(board, YELLOW), col: -1 };
    }

    let bestCol = validMoves[Math.floor(Math.random() * validMoves.length)] ?? -1;

    if (maximizingPlayer) {
      let value = -Infinity;
      for (const col of validMoves) {
        const newBoard = cloneBoard(board);
        dropOnBoard(newBoard, col, YELLOW);
        const result = minimax(newBoard, depth - 1, alpha, beta, false);
        if (result.score > value) {
          value = result.score;
          bestCol = col;
        }
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return { score: value, col: bestCol };
    }

    let value = Infinity;
    for (const col of validMoves) {
      const newBoard = cloneBoard(board);
      dropOnBoard(newBoard, col, RED);
      const result = minimax(newBoard, depth - 1, alpha, beta, true);
      if (result.score < value) {
        value = result.score;
        bestCol = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { score: value, col: bestCol };
  }

  function weightedRandom(cols) {
    const weights = cols.map((c) => 4 - Math.abs(3 - c));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let pick = Math.random() * total;
    for (let i = 0; i < cols.length; i += 1) {
      pick -= weights[i];
      if (pick <= 0) return cols[i];
    }
    return cols[0];
  }

  function chooseCpuMove() {
    const valid = availableColumns(state.board);
    if (valid.length === 0) return -1;

    if (state.difficulty === "easy") {
      if (Math.random() < 0.35) {
        return weightedRandom(valid);
      }
      return valid[Math.floor(Math.random() * valid.length)];
    }

    const winning = findImmediateWin(state.board, YELLOW);
    if (winning >= 0) return winning;

    const block = findImmediateWin(state.board, RED);
    if (block >= 0) return block;

    if (state.difficulty === "medium") {
      const prefer = valid.slice().sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
      for (const col of prefer) {
        const test = cloneBoard(state.board);
        dropOnBoard(test, col, YELLOW);

        const redImmediate = findImmediateWin(test, RED);
        if (redImmediate < 0) return col;
      }
      return prefer[0];
    }

    const hard = minimax(cloneBoard(state.board), 5, -Infinity, Infinity, true);
    if (hard.col >= 0) return hard.col;

    return weightedRandom(valid);
  }

  function onPointerMove(event) {
    if (state.gameOver || state.anim) return;
    const col = columnFromPointer(event.clientX);
    if (state.hoverCol !== col) {
      state.hoverCol = col;
      draw();
    }
  }

  function onPointerLeave() {
    if (state.hoverCol !== -1) {
      state.hoverCol = -1;
      draw();
    }
  }

  function onPointerDown(event) {
    event.preventDefault();
    void syncAudioFromPreference();
    const col = columnFromPointer(event.clientX);
    if (col >= 0) doMove(col);
  }

  function onCanvasClick(event) {
    void syncAudioFromPreference();
    const col = columnFromPointer(event.clientX);
    if (col >= 0) doMove(col);
  }

  function resizeCanvasToDisplay() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayW = Math.round(rect.width * dpr);
    const displayH = Math.round(rect.height * dpr);

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvasToDisplay);

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("click", onCanvasClick);

    gameModeEl.addEventListener("change", () => {
      state.mode = gameModeEl.value;
      difficultyEl.disabled = state.mode !== "cpu";
      updateNames();
      playUiSound();
      resetRound();
    });

    difficultyEl.addEventListener("change", () => {
      state.difficulty = difficultyEl.value;
      playUiSound();
      if (state.mode === "cpu") {
        resetRound();
      }
    });

    newRoundBtn.addEventListener("click", () => {
      if (state.draining) return;
      playUiSound();
      const hasDiscs = state.board.some((row) => row.some((cell) => cell !== EMPTY));
      if (!state.roundStarted && !hasDiscs) {
        startActiveRound();
        return;
      }
      drainBoard(() => {
        resetRound();
        startActiveRound();
      });
    });

    resetScoreBtn.addEventListener("click", () => {
      if (state.draining) return;
      playUiSound();
      const hasDiscs = state.board.some((row) => row.some((cell) => cell !== EMPTY));
      const afterReset = () => {
        resetScores();
        resetRound();
      };
      if (!hasDiscs) {
        afterReset();
        return;
      }
      drainBoard(afterReset);
    });

    audioToggle.addEventListener("change", async () => {
      audio.enabled = audioToggle.checked;
      writeSoundPreference(audio.enabled);
      await syncAudioFromPreference();
      playUiSound();
    });
  }

  function init() {
    audio.enabled = readSoundPreference();
    updateAudioButton();
    bindEvents();
    state.mode = gameModeEl.value;
    state.difficulty = difficultyEl.value;
    difficultyEl.disabled = state.mode !== "cpu";
    updateNames();
    updateScores();
    updateTurnIndicator();
    updateOverlayVisibility();
    resizeCanvasToDisplay();
    setStatus(`Press Play - ${playerName(state.currentPlayer)} moves first`);
  }

  init();
})();
