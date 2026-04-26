'use strict';

/* ==============================
   PRO TIC-TAC-TOE  |  script.js
   ============================== */

var currentUser  = '';
var isGuest      = false;
var board        = ['','','','','','','','',''];
var currentTurn  = 'X';
var currentMode  = 'pvp';
var gameActive   = false;
var session      = { X: 0, O: 0, draw: 0 };

/* ---------- Stats ---------- */
function statsKey() { return 'ttt_stats_' + currentUser; }

function loadStats() {
    var raw = localStorage.getItem(statsKey());
    return raw ? JSON.parse(raw) : { wins: 0, losses: 0, draws: 0 };
}

function saveStats(s) {
    if (!isGuest) localStorage.setItem(statsKey(), JSON.stringify(s));
}

/* ---------- Toast ---------- */
var _toastTimer = null;
function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2400);
}

/* ---------- Screen Router ---------- */
var ALL_SCREENS = ['view-auth','view-login','view-register','view-home','view-mode','view-game','view-profile'];
var NAV_SCREENS  = ['view-home','view-mode','view-profile'];

function showScreen(id) {
    /* Hide splash */
    var splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';

    /* Hide win overlay */
    var ov = document.getElementById('win-overlay');
    if (ov) ov.style.display = 'none';

    /* Toggle screens — must set an explicit display value, never '' */
    ALL_SCREENS.forEach(function(s) {
        var el = document.getElementById(s);
        if (!el) return;
        if (s === id) {
            /* center-screen needs flex; all others need block */
            el.style.display = el.classList.contains('center-screen') ? 'flex' : 'block';
        } else {
            el.style.display = 'none';
        }
    });

    /* Bottom nav */
    var nav = document.getElementById('nav-bar');
    if (NAV_SCREENS.indexOf(id) !== -1) {
        nav.style.display = 'flex';
        ['nav-home','nav-mode','nav-profile'].forEach(function(n) {
            document.getElementById(n).classList.remove('active');
        });
        var seg = id.split('-')[1];  /* home / mode / profile */
        var activeEl = document.getElementById('nav-' + seg);
        if (activeEl) activeEl.classList.add('active');
    } else {
        nav.style.display = 'none';
    }

    /* Refresh data on visit */
    if (id === 'view-profile') refreshProfile();
    if (id === 'view-home')    refreshHomeStats();
}

/* ---------- Auth ---------- */
function playAsGuest() {
    currentUser = 'Guest' + Math.floor(Math.random() * 900 + 100);
    isGuest = true;
    session = { X: 0, O: 0, draw: 0 };
    applyProfile();
    showScreen('view-home');
}

function doRegister() {
    var u = document.getElementById('reg-u').value.trim();
    var p = document.getElementById('reg-p').value;
    if (!u || !p) { toast('⚠ Please fill in all fields'); return; }
    if (localStorage.getItem('ttt_user_' + u)) { toast('⚠ Username already taken'); return; }
    localStorage.setItem('ttt_user_' + u, p);
    document.getElementById('reg-u').value = '';
    document.getElementById('reg-p').value = '';
    toast('✓ Registered! Now sign in.');
    showScreen('view-login');
}

function doLogin() {
    var u = document.getElementById('log-u').value.trim();
    var p = document.getElementById('log-p').value;
    if (!u || !p) { toast('⚠ Please fill in all fields'); return; }
    var saved = localStorage.getItem('ttt_user_' + u);
    if (saved === p) {
        currentUser = u;
        isGuest = false;
        session = { X: 0, O: 0, draw: 0 };
        document.getElementById('log-u').value = '';
        document.getElementById('log-p').value = '';
        applyProfile();
        showScreen('view-home');
        toast('👋 Welcome, ' + u + '!');
    } else {
        toast('✗ Wrong username or password');
    }
}

function doLogout() {
    currentUser = '';
    isGuest = false;
    showScreen('view-auth');
}

/* ---------- Profile / UI state ---------- */
function applyProfile() {
    document.getElementById('home-name').textContent = currentUser;
    document.getElementById('p-name').textContent    = currentUser;

    if (isGuest) {
        document.getElementById('home-role').textContent    = 'Guest User';
        document.getElementById('home-access').textContent  = 'Limited access — register for full features';
        document.getElementById('s-rank').textContent       = 'N/A';
        document.getElementById('mode-bot').style.display   = 'none';
        document.getElementById('mode-locked').style.display = 'flex';
        document.getElementById('guest-warn').style.display  = 'block';
        document.getElementById('p-type').textContent        = 'Guest Account';
    } else {
        document.getElementById('home-role').textContent    = 'Pro Member';
        document.getElementById('home-access').textContent  = 'Full access — all modes unlocked';
        document.getElementById('s-rank').textContent       = 'Pro';
        document.getElementById('mode-bot').style.display   = 'flex';
        document.getElementById('mode-locked').style.display = 'none';
        document.getElementById('guest-warn').style.display  = 'none';
        document.getElementById('p-type').textContent        = 'Pro Account';
    }
    refreshHomeStats();
}

function refreshHomeStats() {
    var s = loadStats();
    document.getElementById('s-wins').textContent   = s.wins;
    document.getElementById('s-losses').textContent = s.losses;
    document.getElementById('s-draws').textContent  = s.draws;
}

function refreshProfile() {
    var s = loadStats();
    document.getElementById('p-wins').textContent  = s.wins;
    document.getElementById('p-draws').textContent = s.draws;
    document.getElementById('p-total').textContent = s.wins + s.losses + s.draws;
    document.getElementById('p-name').textContent  = currentUser || 'Guest';
}

/* ---------- Score Bar ---------- */
function updateScoreBar() {
    document.getElementById('sc-x').textContent = session.X;
    document.getElementById('sc-o').textContent = session.O;
    document.getElementById('sc-d').textContent = session.draw;
}

/* ---------- Game ---------- */
function startGame(mode) {
    currentMode  = mode;
    board        = ['','','','','','','','',''];
    currentTurn  = 'X';
    gameActive   = true;

    setTurnBadge('X');
    document.getElementById('win-overlay').style.display = 'none';

    for (var i = 0; i < 9; i++) {
        var cell = document.getElementById('c' + i);
        cell.textContent = '';
        cell.className   = 'cell';
    }

    updateScoreBar();
    showScreen('view-game');
}

function setTurnBadge(p) {
    var el = document.getElementById('turn-badge');
    el.textContent = p + "'S TURN";
    el.className   = 'turn-badge ' + p.toLowerCase();
}

function makeMove(idx) {
    if (!gameActive || board[idx] !== '') return;

    board[idx] = currentTurn;
    var cell = document.getElementById('c' + idx);
    cell.textContent = currentTurn;
    cell.className   = 'cell ' + currentTurn.toLowerCase();

    var result = getResult();
    if (result) {
        finishGame(result);
        return;
    }

    currentTurn = currentTurn === 'X' ? 'O' : 'X';
    setTurnBadge(currentTurn);

    if (currentMode === 'bot' && currentTurn === 'O') {
        gameActive = false;
        setTimeout(botMove, 500);
    }
}

/* ---------- Bot (win/block/center/corner/random) ---------- */
function botMove() {
    gameActive = true;
    var idx = bestMove();
    if (idx !== -1) makeMove(idx);
}

function bestMove() {
    var m;
    m = threatMove('O'); if (m !== -1) return m;  /* win  */
    m = threatMove('X'); if (m !== -1) return m;  /* block */
    if (board[4] === '') return 4;                 /* center */
    var corners = [0,2,6,8].filter(function(c){ return board[c] === ''; });
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    var empty = board.reduce(function(a,v,i){ if(v==='') a.push(i); return a; }, []);
    return empty.length ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

function threatMove(p) {
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var i = 0; i < lines.length; i++) {
        var l  = lines[i];
        var vs = [board[l[0]], board[l[1]], board[l[2]]];
        if (vs.filter(function(v){ return v === p; }).length === 2 &&
            vs.filter(function(v){ return v === ''; }).length === 1) {
            return l[vs.indexOf('')];
        }
    }
    return -1;
}

/* ---------- Win Detection ---------- */
var WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function getResult() {
    for (var i = 0; i < WIN_LINES.length; i++) {
        var l = WIN_LINES[i];
        if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[1]] === board[l[2]]) {
            return { type: 'win', player: board[l[0]], line: l };
        }
    }
    if (board.every(function(v){ return v !== ''; })) return { type: 'draw' };
    return null;
}

function finishGame(result) {
    gameActive = false;
    var stats = loadStats();

    if (result.type === 'win') {
        var p = result.player;
        result.line.forEach(function(idx) {
            document.getElementById('c' + idx).classList.add('win');
        });
        session[p]++;
        updateScoreBar();

        if (!isGuest) {
            if (p === 'X') stats.wins++; else stats.losses++;
            saveStats(stats);
        }

        setTimeout(function() {
            document.getElementById('win-icon').textContent = '🏆';
            document.getElementById('win-msg').textContent  = p + ' WINS!';
            document.getElementById('win-sub').textContent  = '"Asadharon khelcho!"';
            document.getElementById('win-overlay').style.display = 'flex';
        }, 380);

    } else {
        session.draw++;
        updateScoreBar();

        if (!isGuest) { stats.draws++; saveStats(stats); }

        setTimeout(function() {
            document.getElementById('win-icon').textContent = '🤝';
            document.getElementById('win-msg').textContent  = 'DRAW!';
            document.getElementById('win-sub').textContent  = '"It\'s a tie — well played!"';
            document.getElementById('win-overlay').style.display = 'flex';
        }, 280);
    }
}

/* ---------- Boot ---------- */
window.onload = function() {
    /* Hide all screens initially */
    ALL_SCREENS.forEach(function(s) {
        var el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });

    var splash = document.getElementById('splash-screen');
    setTimeout(function() {
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(function() {
                splash.style.display = 'none';
                showScreen('view-auth');
            }, 700);
        } else {
            showScreen('view-auth');
        }
    }, 1500);
};
