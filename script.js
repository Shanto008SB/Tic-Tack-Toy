'use strict';

/* ==============================
   PRO TIC-TAC-TOE  |  script.js
   ============================== */

/* ---- Global state ---- */
var currentUser = '';
var isGuest     = false;
var board       = ['','','','','','','','',''];
var currentTurn = 'X';
var currentMode = 'pvp';
var gameActive  = false;
var session     = { X: 0, O: 0, draw: 0 };

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
    _toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2600);
}

/* ---------- Screen Router ---------- */
var ALL_SCREENS = ['view-auth','view-login','view-register','view-home','view-mode','view-game','view-profile'];
var NAV_SCREENS = ['view-home','view-mode','view-profile'];

function showScreen(id) {
    var splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';

    var ov = document.getElementById('win-overlay');
    if (ov) ov.style.display = 'none';

    ALL_SCREENS.forEach(function(s) {
        var el = document.getElementById(s);
        if (!el) return;
        if (s === id) {
            el.style.display = el.classList.contains('center-screen') ? 'flex' : 'block';
        } else {
            el.style.display = 'none';
        }
    });

    var nav = document.getElementById('nav-bar');
    if (NAV_SCREENS.indexOf(id) !== -1) {
        nav.style.display = 'flex';
        ['nav-home','nav-mode','nav-profile'].forEach(function(n) {
            document.getElementById(n).classList.remove('active');
        });
        var seg = id.split('-')[1];
        var activeEl = document.getElementById('nav-' + seg);
        if (activeEl) activeEl.classList.add('active');
    } else {
        nav.style.display = 'none';
    }

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
    /* Tour: শুধু প্রথমবার guest হলে দেখাবে */
    checkAndStartTour('__guest__');
}

function doRegister() {
    var u = document.getElementById('reg-u').value.trim();
    var p = document.getElementById('reg-p').value;
    if (!u || !p) { toast('⚠ Please fill all fields'); return; }
    if (u.length < 3) { toast('⚠ Username must be at least 3 characters'); return; }
    if (p.length < 4) { toast('⚠ Password must be at least 4 characters'); return; }
    if (localStorage.getItem('ttt_user_' + u)) { toast('⚠ Username is already taken'); return; }
    localStorage.setItem('ttt_user_' + u, p);
    document.getElementById('reg-u').value = '';
    document.getElementById('reg-p').value = '';
    /* Auto login after register */
    currentUser = u;
    isGuest = false;
    session = { X: 0, O: 0, draw: 0 };
    applyProfile();
    showScreen('view-home');
    toast('🎉 Account created! Welcome, ' + u + '!');
    /* Tour: always show on new account */
    checkAndStartTour(u);
}

function doLogin() {
    var u = document.getElementById('log-u').value.trim();
    var p = document.getElementById('log-p').value;
    if (!u || !p) { toast('⚠ Please fill all fields'); return; }
    var saved = localStorage.getItem('ttt_user_' + u);
    if (!saved) { toast('✗ Username not found'); return; }
    if (saved !== p) { toast('✗ Incorrect password'); return; }

    currentUser = u;
    isGuest = false;
    session = { X: 0, O: 0, draw: 0 };
    document.getElementById('log-u').value = '';
    document.getElementById('log-p').value = '';
    applyProfile();
    showScreen('view-home');
    toast('👋 Welcome back, ' + u + '!');
    /* Tour: show on first login */
    checkAndStartTour(u);
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
        document.getElementById('home-role').textContent     = 'Guest User';
        document.getElementById('home-access').textContent   = 'Limited access — register for full features';
        document.getElementById('s-rank').textContent        = 'N/A';
        document.getElementById('mode-bot').style.display    = 'none';
        document.getElementById('mode-locked').style.display = 'flex';
        document.getElementById('guest-warn').style.display  = 'block';
        document.getElementById('p-type').textContent        = 'Guest Account';
    } else {
        document.getElementById('home-role').textContent     = 'Pro Member';
        document.getElementById('home-access').textContent   = 'Full access — all modes unlocked';
        document.getElementById('s-rank').textContent        = 'Pro';
        document.getElementById('mode-bot').style.display    = 'flex';
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
    currentMode = mode;
    board       = ['','','','','','','','',''];
    currentTurn = 'X';
    gameActive  = true;

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
    if (result) { finishGame(result); return; }

    currentTurn = (currentTurn === 'X') ? 'O' : 'X';
    setTurnBadge(currentTurn);

    if (currentMode === 'bot' && currentTurn === 'O') {
        gameActive = false;
        setTimeout(botMove, 500);
    }
}

/* ---------- Bot ---------- */
function botMove() {
    gameActive = true;
    var idx = bestMove();
    if (idx !== -1) makeMove(idx);
}

function bestMove() {
    var m;
    m = threatMove('O'); if (m !== -1) return m;
    m = threatMove('X'); if (m !== -1) return m;
    if (board[4] === '') return 4;
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
        if (vs.filter(function(v){ return v===p; }).length === 2 &&
            vs.filter(function(v){ return v===''; }).length === 1) {
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
    var stats  = loadStats();

    if (result.type === 'win') {
        var p = result.player;
        result.line.forEach(function(idx) {
            document.getElementById('c' + idx).classList.add('win');
        });
        session[p]++;
        updateScoreBar();

        if (!isGuest) {
            if (currentMode === 'bot') {
                if (p === 'X') { stats.wins++; } else { stats.losses++; }
            } else {
                stats.wins++;
            }
            saveStats(stats);
        }

        setTimeout(function() {
            document.getElementById('win-icon').textContent = '🏆';
            document.getElementById('win-msg').textContent  = p + ' WINS!';
            document.getElementById('win-sub').textContent  = '"Awesome game!"';
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
                /* NOTE: Tour starts AFTER login/register — NOT here */
            }, 700);
        } else {
            showScreen('view-auth');
        }
    }, 1500);
};

/* ======================================================
   ✨  PROFESSIONAL SPOTLIGHT ONBOARDING TOUR
   ======================================================
   Triggers ONLY after first successful login/register.
   Per-user tracking via localStorage key.
   Steps navigate through Home → Mode → Home nav items.
   SVG cutout overlay + glowing ring spotlight.
   ====================================================== */

/* ---- Tour key per user ---- */
function tourKey(u) {
    return 'ttt_tour_done_' + (u || '__guest__');
}

/* ---- Check and start tour for this user ---- */
function checkAndStartTour(username) {
    var key = tourKey(username);
    if (!localStorage.getItem(key)) {
        /* First time for this user — show tour after short delay */
        setTimeout(function() { startTour(); }, 700);
    }
}

/* ---- Tour Step Definitions ----
   All steps start AFTER the user is logged in.
   The `screen` field tells which screen to show for that step.
   `targetId` is the element to spotlight (null = center card).
   ---- */
function buildTourSteps() {
    var botTarget = (!isGuest &&
                    document.getElementById('mode-bot') &&
                    document.getElementById('mode-bot').style.display !== 'none')
                    ? 'mode-bot' : 'mode-locked';

    return [
        /* 0 — Welcome */
        {
            screen:   'view-home',
            targetId: null,
            emoji:    '🎉',
            title:    'Welcome to PRO TIC TAC!',
            desc:     'You are logged in! Let\'s take a quick tour of the app.',
            cardSide: 'center'
        },
        /* 1 — Stats */
        {
            screen:   'view-home',
            targetId: 'home-stats-grid',
            emoji:    '📊',
            title:    'Your Stats',
            desc:     'Your wins, losses and draws are tracked here after every game.',
            cardSide: 'auto'
        },
        /* 2 — Start Game */
        {
            screen:   'view-home',
            targetId: 'btn-start',
            emoji:    '🎮',
            title:    'Start a Game',
            desc:     'Tap START GAME to choose a game mode and begin playing!',
            cardSide: 'auto'
        },
        /* 3 — Vs Friend */
        {
            screen:   'view-mode',
            targetId: 'mode-pvp',
            emoji:    '👥',
            title:    'Vs Friend Mode',
            desc:     'Play against a friend on the same device. X and O take turns.',
            cardSide: 'auto'
        },
        /* 4 — Vs Robot */
        {
            screen:   'view-mode',
            targetId: botTarget,
            emoji:    '🤖',
            title:    'Vs Robot Mode',
            desc:     isGuest
                      ? 'Sign in to unlock Smart AI mode!'
                      : 'Challenge the Smart AI — you are signed in!',
            cardSide: 'auto'
        },
        /* 5 — Nav Home */
        {
            screen:   'view-home',
            targetId: 'nav-home',
            emoji:    '🏠',
            title:    'Home Tab',
            desc:     'Tap here to return to your home screen anytime.',
            cardSide: 'auto'
        },
        /* 6 — Nav Play */
        {
            screen:   'view-home',
            targetId: 'nav-mode',
            emoji:    '🎮',
            title:    'Play Tab',
            desc:     'Jump straight into game mode selection.',
            cardSide: 'auto'
        },
        /* 7 — Nav Profile */
        {
            screen:   'view-home',
            targetId: 'nav-profile',
            emoji:    '👤',
            title:    'Profile Tab',
            desc:     'View your full stats and sign out from here.',
            cardSide: 'auto'
        },
        /* 8 — Nav Guide */
        {
            screen:   'view-home',
            targetId: 'nav-guide',
            emoji:    '📖',
            title:    'Guide Tab',
            desc:     'Open the full game guide anytime from here.',
            cardSide: 'auto'
        },
        /* 9 — Finish */
        {
            screen:   'view-home',
            targetId: null,
            emoji:    '🏆',
            title:    'You are all set!',
            desc:     'You know everything now. Go win some games!',
            cardSide: 'center'
        }
    ];
}

/* ---- Tour state ---- */
var tourSteps      = [];
var tourStep       = 0;
var tourActive     = false;
var _prevHighlight = null;

/* ---- Start the tour ---- */
function startTour() {
    tourSteps  = buildTourSteps();
    tourStep   = 0;
    tourActive = true;
    renderTourStep(0);
}

/* ---- Forward ---- */
function tourNext() {
    if (!tourActive) return;
    if (tourStep < tourSteps.length - 1) {
        tourStep++;
        renderTourStep(tourStep);
    } else {
        endTour();
    }
}

/* ---- Backward ---- */
function tourBack() {
    if (!tourActive || tourStep <= 0) return;
    tourStep--;
    renderTourStep(tourStep);
}

/* ---- End tour ---- */
function endTour() {
    tourActive = false;

    /* Save per-user key */
    var key = isGuest ? tourKey('__guest__') : tourKey(currentUser);
    localStorage.setItem(key, '1');

    hideTourUI();
    removePrevHighlight();

    /* Return to home */
    showScreen('view-home');
}

/* ---- Hide all tour UI ---- */
function hideTourUI() {
    var overlay   = document.getElementById('tour-overlay');
    var spotlight = document.getElementById('tour-spotlight');
    var card      = document.getElementById('tour-card');

    if (overlay)   { overlay.innerHTML = ''; overlay.style.display = 'none'; }
    if (spotlight) { spotlight.style.display = 'none'; }
    if (card)      { card.style.display = 'none'; }
}

/* ---- Remove highlight class from prev element ---- */
function removePrevHighlight() {
    if (_prevHighlight) {
        _prevHighlight.classList.remove('tour-highlight-pulse');
        _prevHighlight.style.zIndex  = '';
        _prevHighlight = null;
    }
}

/* ---- Core render function ---- */
function renderTourStep(step) {
    var s     = tourSteps[step];
    var total = tourSteps.length;
    if (!s) return;

    /* 1 ── Navigate to the right screen silently */
    _silentShowScreen(s.screen);

    /* 2 ── Remove previous highlight */
    removePrevHighlight();

    /* 3 ── Fill card content */
    _fillCard(s, step, total);

    /* 4 ── Position spotlight + card */
    if (!s.targetId) {
        /* No target → center welcome/finish card */
        hideTourSpotlight();
        _showFullOverlay();
        _positionCardCenter(step);
    } else {
        var target = document.getElementById(s.targetId);
        if (target && isElementVisible(target)) {
            _positionSpotlight(target);
            _addHighlight(target);
            _positionCardNearTarget(target, step);
        } else {
            hideTourSpotlight();
            _showFullOverlay();
            _positionCardCenter(step);
        }
    }

    /* 5 ── Show card */
    var card = document.getElementById('tour-card');
    if (card) {
        card.style.display = 'block';
        /* Re-trigger card entrance animation */
        var inner = card.querySelector('.tour-card-inner');
        if (inner) {
            inner.style.animation = 'none';
            void inner.offsetHeight;
            inner.style.animation = '';
        }
    }
}

/* ---- Check if element is currently visible on screen ---- */
function isElementVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

/* ---- Fill the card with step data ---- */
function _fillCard(s, step, total) {
    var emojiEl  = document.getElementById('tc-emoji');
    var titleEl  = document.getElementById('tc-title');
    var descEl   = document.getElementById('tc-desc');
    var stepEl   = document.getElementById('tc-step-label');
    var nextBtn  = document.getElementById('tc-next-btn');
    var backBtn  = document.getElementById('tc-back-btn');
    var trackEl  = document.getElementById('tc-progress-track');

    if (emojiEl) {
        emojiEl.style.animation = 'none';
        void emojiEl.offsetHeight;
        emojiEl.style.animation = '';
        emojiEl.textContent = s.emoji;
    }
    if (titleEl) titleEl.textContent = s.title;
    if (descEl)  descEl.textContent  = s.desc;
    if (stepEl)  stepEl.textContent  = (step + 1) + ' / ' + total;
    if (backBtn) backBtn.disabled = (step === 0);

    var isLast = (step === total - 1);
    if (nextBtn) nextBtn.textContent = isLast ? '🎮 Play Now!' : 'Next →';

    if (trackEl) {
        trackEl.innerHTML = '';
        for (var i = 0; i < total; i++) {
            var dot = document.createElement('div');
            dot.className = 'tc-dot';
            if (i < step)        dot.classList.add('done');
            else if (i === step) dot.classList.add('active');
            trackEl.appendChild(dot);
        }
    }
}

/* ---- Navigate to screen without hiding tour overlay ---- */
function _silentShowScreen(id) {
    ALL_SCREENS.forEach(function(s) {
        var el = document.getElementById(s);
        if (!el) return;
        if (s === id) {
            el.style.display = el.classList.contains('center-screen') ? 'flex' : 'block';
        } else {
            el.style.display = 'none';
        }
    });

    var nav = document.getElementById('nav-bar');
    if (NAV_SCREENS.indexOf(id) !== -1) {
        nav.style.display = 'flex';
        ['nav-home','nav-mode','nav-profile'].forEach(function(n) {
            document.getElementById(n).classList.remove('active');
        });
        var seg = id.split('-')[1];
        var activeEl = document.getElementById('nav-' + seg);
        if (activeEl) activeEl.classList.add('active');
    } else {
        nav.style.display = 'none';
    }

    if (id === 'view-home')    refreshHomeStats();
    if (id === 'view-profile') refreshProfile();
}

/* ---- Add highlight class to element ---- */
function _addHighlight(el) {
    el.classList.add('tour-highlight-pulse');
    el.style.zIndex = '2002';
    _prevHighlight  = el;
}

/* ---- Draw SVG overlay with rounded-rect hole around target ---- */
function _positionSpotlight(target) {
    var spotlight = document.getElementById('tour-spotlight');
    var overlay   = document.getElementById('tour-overlay');
    if (!spotlight || !overlay) return;

    var rect = target.getBoundingClientRect();
    var pad  = 10;
    var rx   = 16;
    var W    = window.innerWidth;
    var H    = window.innerHeight;

    var x = rect.left   - pad;
    var y = rect.top    - pad;
    var w = rect.width  + pad * 2;
    var h = rect.height + pad * 2;

    overlay.style.display = 'block';
    overlay.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
        '<defs>' +
          '<mask id="tm">' +
            '<rect width="' + W + '" height="' + H + '" fill="white"/>' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
                 '" rx="' + rx + '" ry="' + rx + '" fill="black"/>' +
          '</mask>' +
        '</defs>' +
        '<rect width="' + W + '" height="' + H + '" fill="rgba(5,8,15,0.9)" mask="url(#tm)"/>' +
        '</svg>';

    spotlight.style.display      = 'block';
    spotlight.style.left         = x + 'px';
    spotlight.style.top          = y + 'px';
    spotlight.style.width        = w + 'px';
    spotlight.style.height       = h + 'px';
    spotlight.style.borderRadius = rx + 'px';
}

/* ---- Full dark overlay (no hole) for center steps ---- */
function _showFullOverlay() {
    var overlay = document.getElementById('tour-overlay');
    if (!overlay) return;
    var W = window.innerWidth;
    var H = window.innerHeight;
    overlay.style.display = 'block';
    overlay.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
        '<rect width="' + W + '" height="' + H + '" fill="rgba(5,8,15,0.92)"/>' +
        '</svg>';
}

function hideTourSpotlight() {
    var spotlight = document.getElementById('tour-spotlight');
    if (spotlight) spotlight.style.display = 'none';
}

/* ---- Position tooltip card NEAR the spotlight target ---- */
function _positionCardNearTarget(target, step) {
    var card = document.getElementById('tour-card');
    if (!card) return;

    card.removeAttribute('style');
    card.className = '';
    card.style.display   = 'block';
    card.style.position  = 'fixed';
    card.style.zIndex    = '2010';

    var rect     = target.getBoundingClientRect();
    var viewH    = window.innerHeight;
    var viewW    = window.innerWidth;
    var sidePad  = 12;
    var gap      = 14;
    var ring     = 8;

    /* ── Width ── */
    var cardW = Math.min(330, viewW - sidePad * 2);
    card.style.width = cardW + 'px';

    /* ── Horizontal: align to target, clamp ── */
    var idealLeft = rect.left;
    var left = Math.max(sidePad, Math.min(idealLeft, viewW - cardW - sidePad));
    card.style.left  = left + 'px';
    card.style.right = 'auto';

    /* ── Arrow: points at target center ── */
    var arrowEl  = document.getElementById('tc-arrow');
    var targetCx = rect.left + rect.width / 2;
    var arrowX   = Math.max(12, Math.min(targetCx - left - 7, cardW - 28));
    if (arrowEl) arrowEl.style.left = arrowX + 'px';

    /* ── Vertical ── */
    /* Measure ACTUAL card height */
    var actualCardH = card.offsetHeight || 220;

    var belowEdge = rect.bottom + ring + gap;
    var aboveEdge = rect.top   - ring - gap;
    var spaceBelow = viewH - belowEdge;
    var spaceAbove = aboveEdge;

    var cardTop;
    if (spaceBelow >= actualCardH || spaceBelow >= spaceAbove) {
        card.classList.add('arrow-up');
        cardTop = belowEdge;
    } else {
        card.classList.add('arrow-down');
        cardTop = aboveEdge - actualCardH;
    }

    /* Hard clamp — card stays fully within viewport */
    var minTop = sidePad;
    var maxTop = viewH - actualCardH - sidePad;
    if (maxTop < minTop) maxTop = minTop;   /* tiny screens fallback */
    cardTop = Math.max(minTop, Math.min(cardTop, maxTop));

    card.style.top    = cardTop + 'px';
    card.style.bottom = 'auto';

    if (step === tourSteps.length - 1) card.classList.add('finish-step');
}

/* ---- Position card in center of screen (welcome / finish steps) ---- */
function _positionCardCenter(step) {
    var card = document.getElementById('tour-card');
    if (!card) return;

    card.removeAttribute('style');
    card.className = 'arrow-none';
    card.style.display  = 'block';
    card.style.position = 'fixed';
    card.style.zIndex   = '2010';

    var viewH    = window.innerHeight;
    var viewW    = window.innerWidth;
    var sidePad  = 20;
    var cardW    = Math.min(300, viewW - sidePad * 2);

    card.style.width = cardW + 'px';
    var actualCardH  = card.offsetHeight || 220;

    var left = (viewW - cardW) / 2;
    var top  = Math.max(sidePad, (viewH / 2) - (actualCardH / 2));
    /* Make sure it doesn't go off the bottom */
    top = Math.min(top, viewH - actualCardH - sidePad);

    card.style.left   = left + 'px';
    card.style.right  = 'auto';
    card.style.top    = top + 'px';
    card.style.bottom = 'auto';

    if (step === tourSteps.length - 1) card.classList.add('finish-step');
}

/* ==============================
   GUIDE MODAL
   ============================== */
function openGuide() {
    var modal = document.getElementById('guide-modal');
    if (modal) modal.classList.add('show');
}

function closeGuide() {
    var modal = document.getElementById('guide-modal');
    if (!modal) return;
    modal.style.opacity    = '0';
    modal.style.transition = 'opacity 0.25s';
    setTimeout(function() {
        modal.classList.remove('show');
        modal.style.opacity    = '';
        modal.style.transition = '';
    }, 250);
}

function openHelp()  { openGuide(); }
function closeHelp() { closeGuide(); }
