(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const params = new URLSearchParams(window.location.search);
  const puzzle = params.get("puzzle") || "idle";
  const fallbackPlayer = params.get("player") || "";
  const initUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  const telegramUserId = initUser && initUser.id ? String(initUser.id) : "";

  const assets = {
    background: "./assets/background.png",
    musicBox: "./assets/music-box.png",
    door: "./assets/door.png",
    doorOpen: "./assets/door-open.png",
    eyeLantern: "./assets/eye-lantern.png",
    symbols: {
      sun: "./assets/sun.png",
      bell: "./assets/bell.png",
      moon: "./assets/moon.png",
      eye: "./assets/eye.png",
      flame: "./assets/flame.png",
      circle: "./assets/circle.png",
    },
    pedestalRoom: "./assets/pedestal-room.png",
    pedestalRoomSolved: "./assets/pedestal-room-solved.png",
    cardEmpty: "./assets/card-empty.png",
    cardBack: "./assets/card-back.png",
    ritaBoard: "./assets/rita-board.png",
    redOrb: "./assets/red-orb.png",
    blueOrb: "./assets/blue-orb.png",
    truthStone: "./assets/truth-stone.png",
    truthBowl: "./assets/truth-bowl.png",
    scaleBowl: "./assets/scale-bowl.png",
    strengthBowl: "./assets/strength-bowl.png",
    hammer: "./assets/hammer.png",
    candle: "./assets/candle.png",
    hopeFlame: "./assets/hope-flame.png",
    shadowObstacle: "./assets/shadow-obstacle.png",
    asyaBackground: "./assets/asya-background.png",
    asyaBoard: "./assets/asya-board.png",
    asyaBoardSolved: "./assets/asya-board-solved.png",
    asyaRune: "./assets/asya-rune.png",
    asyaRuneActive: "./assets/asya-rune-active.png",
  };

  const players = {
    asya: { name: "Ася", pedestal: "Единство" },
    vanya: { name: "Ваня", pedestal: "Честность" },
    mira: { name: "Мира", pedestal: "Надежда" },
    rita: { name: "Рита", pedestal: "Доверие" },
    dasha: { name: "Даша", pedestal: "Мудрость" },
    maxim: { name: "Максим", pedestal: "Сила" },
  };

  const root = document.getElementById("sceneRoot");
  const sceneTopline = document.getElementById("sceneTopline");
  const sceneTitle = document.getElementById("sceneTitle");
  const sceneCopy = document.getElementById("sceneCopy");
  const feedback = document.getElementById("feedback");

  let currentCleanup = null;
  const sentEvents = new Set();

  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor("#0d1118");
    tg.setBackgroundColor("#07090f");
  }

  function setCopy(topline, title, copy) {
    sceneTopline.textContent = topline;
    sceneTitle.textContent = title;
    sceneCopy.textContent = copy;
  }

  function setFeedback(text, tone) {
    feedback.textContent = text || "";
    feedback.className = `feedback ${tone || ""}`.trim();
  }

  function cleanupScene() {
    if (typeof currentCleanup === "function") {
      currentCleanup();
    }
    currentCleanup = null;
  }

  function send(payload) {
    const serialized = JSON.stringify({
      ...payload,
      telegram_user_id: telegramUserId,
    });
    if (tg) {
      tg.sendData(serialized);
    } else {
      console.log("Telegram.WebApp.sendData", serialized);
    }
  }

  function sendOnce(key, payload) {
    if (sentEvents.has(key)) {
      return;
    }
    sentEvents.add(key);
    send(payload);
  }

  function markOpened(scene) {
    const key = `opened:${scene}:${telegramUserId || fallbackPlayer || "guest"}`;
    if (window.sessionStorage.getItem(key)) {
      return;
    }
    window.sessionStorage.setItem(key, "1");
    window.setTimeout(function () {
      sendOnce(key, {
        event: "miniapp_opened",
        scene,
        player: fallbackPlayer || detectPlayerKey(),
      });
    }, 120);
  }

  function detectPlayerKey() {
    if (fallbackPlayer && players[fallbackPlayer]) {
      return fallbackPlayer;
    }
    if (!initUser) {
      return "";
    }
    const firstName = String(initUser.first_name || "").trim().toLowerCase();
    const username = String(initUser.username || "").trim().toLowerCase();
    return (
      Object.keys(players).find(function (key) {
        return key === username || players[key].name.toLowerCase() === firstName;
      }) || ""
    );
  }

  function preloadImages() {
    const urls = [];
    Object.keys(assets).forEach(function (key) {
      if (typeof assets[key] === "string") {
        urls.push(assets[key]);
        return;
      }
      Object.values(assets[key]).forEach(function (url) {
        urls.push(url);
      });
    });
    urls.forEach(function (url) {
      const image = new Image();
      image.src = url;
    });
  }

  function createParticles() {
    const holder = document.getElementById("particles");
    if (!holder) {
      return;
    }
    holder.innerHTML = "";
    for (let i = 0; i < 24; i += 1) {
      const particle = document.createElement("span");
      particle.className = "particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.bottom = `${Math.random() * 25 - 10}%`;
      particle.style.animationDuration = `${7 + Math.random() * 8}s`;
      particle.style.animationDelay = `${Math.random() * 3.5}s`;
      particle.style.opacity = String(0.25 + Math.random() * 0.5);
      holder.appendChild(particle);
    }
  }

  function createAudioEngine() {
    let context = null;

    function getContext() {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          return null;
        }
        context = new AudioContext();
      }
      if (context.state === "suspended") {
        context.resume();
      }
      return context;
    }

    function tone(freq, duration, type, volume, detune) {
      const ctx = getContext();
      if (!ctx) {
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune || 0;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    }

    function noise(duration, frequency, volume) {
      const ctx = getContext();
      if (!ctx) {
        return;
      }
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) {
        channel[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + duration);
    }

    return {
      symbol(name) {
        const tones = {
          sun() {
            tone(880, 0.42, "sine", 0.15, 5);
            tone(1320, 0.28, "triangle", 0.08, -5);
          },
          bell() {
            tone(610, 0.48, "triangle", 0.12, 4);
            tone(930, 0.28, "square", 0.04, 0);
          },
          moon() {
            tone(220, 0.9, "sine", 0.14, 0);
            tone(330, 0.72, "triangle", 0.05, -10);
          },
          eye() {
            noise(0.28, 900, 0.024);
            tone(280, 0.34, "sawtooth", 0.038, -18);
          },
          flame() {
            noise(0.35, 1600, 0.03);
            tone(470, 0.2, "triangle", 0.045, 22);
          },
          circle() {
            tone(180, 0.88, "sine", 0.15, 0);
            tone(280, 0.56, "triangle", 0.06, -8);
          },
        };
        if (tones[name]) {
          tones[name]();
        }
      },
      wrong() {
        tone(280, 0.32, "sawtooth", 0.075, 0);
        tone(302, 0.32, "square", 0.055, 0);
        noise(0.2, 720, 0.015);
      },
      success() {
        tone(392, 0.95, "sine", 0.11, 0);
        tone(523, 1.0, "sine", 0.09, 0);
        tone(659, 1.1, "triangle", 0.07, 0);
      },
      hum(power) {
        tone(180 + power * 30, 0.42, "sine", 0.045 + power * 0.035, 0);
      },
    };
  }

  const audio = createAudioEngine();

  function renderIdleScene() {
    cleanupScene();
    setCopy(
      "Музыкальная шкатулка",
      "Перед вами старая музыкальная шкатулка.",
      "Она молчит, но внутри будто что-то ждет."
    );
    setFeedback("Теплый свет прячется между шестеренками и рунами.");
    root.innerHTML = `
      <section class="hero-scene panel-scene">
        <div class="hero-visual">
          <img class="hero-background" src="${assets.background}" alt="" aria-hidden="true" />
          <img class="hero-box-image" src="${assets.musicBox}" alt="Музыкальная шкатулка" />
          <div class="hero-glow"></div>
        </div>
      </section>
    `;
    markOpened("idle");
  }

  function renderDoorPuzzle() {
    cleanupScene();
    setCopy(
      "Загадка I",
      "Древняя дверь слушает кольца.",
      "Выстрой правильную последовательность: солнце, колокол, луна, круг."
    );
    setFeedback("Каждое кольцо звучит по-своему. Слушай, как дверь отвечает на символы.");
    root.innerHTML = `
      <section class="door-scene panel-scene">
        <div class="door-stage" id="doorStage">
          <img class="door-image" id="doorImage" src="${assets.door}" alt="Древняя дверь" />
          <img class="door-eye" src="${assets.eyeLantern}" alt="" aria-hidden="true" />
          <div class="door-overlay-ring door-ring-top" id="ringTop"></div>
          <div class="door-overlay-ring door-ring-middle" id="ringMiddle"></div>
          <div class="door-overlay-ring door-ring-bottom" id="ringBottom"></div>
          <div class="door-overlay-ring door-ring-core" id="ringCore"></div>
          <div class="door-light" id="doorLight"></div>
        </div>
        <div class="door-controls">
          <div class="door-symbol-row" id="doorSequence"></div>
          <div class="door-actions">
            <button class="primary-button" id="checkDoor" type="button">Проверить резонанс</button>
            <button class="secondary-button" id="resetDoor" type="button">Сбросить кольца</button>
          </div>
          <div class="door-status" id="doorStatus"></div>
        </div>
      </section>
    `;

    const symbols = ["sun", "bell", "moon", "eye", "flame", "circle"];
    const correct = ["sun", "bell", "moon", "circle"];
    const state = [0, 0, 0, 0];
    const ringSlots = [
      document.getElementById("ringTop"),
      document.getElementById("ringMiddle"),
      document.getElementById("ringBottom"),
      document.getElementById("ringCore"),
    ];
    const sequence = document.getElementById("doorSequence");
    const doorStatus = document.getElementById("doorStatus");
    const doorStage = document.getElementById("doorStage");
    const doorImage = document.getElementById("doorImage");
    const doorLight = document.getElementById("doorLight");
    let solved = false;

    function renderRings() {
      ringSlots.forEach(function (slot, index) {
        slot.innerHTML = `<button class="ring-button" type="button" data-index="${index}">
            <img class="ring-icon" src="${assets.symbols[symbols[state[index]]]}" alt="${symbols[state[index]]}" />
          </button>`;
      });
      ringSlots.forEach(function (slot) {
        const button = slot.querySelector(".ring-button");
        button.addEventListener("click", function () {
          if (solved) {
            return;
          }
          const index = Number(button.dataset.index);
          state[index] = (state[index] + 1) % symbols.length;
          button.classList.remove("turning");
          void button.offsetWidth;
          button.classList.add("turning");
          audio.symbol(symbols[state[index]]);
          renderRings();
        });
      });

      sequence.innerHTML = state
        .map(function (value, index) {
          return `<div class="sequence-chip ${correct[index] === symbols[value] ? "match" : ""}">
              <img src="${assets.symbols[symbols[value]]}" alt="${symbols[value]}" />
            </div>`;
        })
        .join("");
    }

    function evaluateDoor() {
      const picked = state.map(function (item) {
        return symbols[item];
      });
      const matches = picked.filter(function (symbol, index) {
        return symbol === correct[index];
      }).length;

      doorStage.classList.remove("wrong", "almost", "solved");

      if (matches === 4) {
        solved = true;
        doorStage.classList.add("solved");
        doorImage.src = assets.doorOpen;
        doorLight.classList.add("active");
        doorStatus.textContent = "Свет услышал вас.";
        setFeedback("Каменные кольца расходятся, и дверь распахивается лучом.", "success");
        audio.success();
        sendOnce("puzzle_1_solved", { event: "puzzle_1_solved" });
        return;
      }

      if (matches === 3) {
        doorStage.classList.add("almost");
        doorStatus.textContent = "Механизм начинает слушать.";
        setFeedback("Три из четырех колец уже нашли верный тон.", "");
        audio.hum(1);
        return;
      }

      doorStage.classList.add("wrong");
      doorStatus.textContent = "Дверь сопротивляется.";
      setFeedback("Металлический диссонанс отбрасывает свет назад.", "error");
      audio.wrong();
    }

    document.getElementById("checkDoor").addEventListener("click", evaluateDoor);
    document.getElementById("resetDoor").addEventListener("click", function () {
      if (solved) {
        return;
      }
      for (let i = 0; i < state.length; i += 1) {
        state[i] = 0;
      }
      doorStage.classList.remove("wrong", "almost");
      doorStatus.textContent = "";
      setFeedback("Кольца вновь замерли и ждут прикосновения.");
      renderRings();
    });

    renderRings();
    markOpened("door");
  }

  function pedestalWrapper(playerKey) {
    const player = players[playerKey];
    root.innerHTML = `
      <section class="pedestal-scene panel-scene ${playerKey === "asya" ? "asya-scene" : ""}">
        <div class="pedestal-cover">
          <img class="pedestal-room-image" src="${playerKey === "asya" ? assets.asyaBackground : assets.pedestalRoom}" alt="" aria-hidden="true" />
          <div class="pedestal-cover-overlay"></div>
        </div>
        <div class="pedestal-header">
          <div>
            <div class="scene-topline">Загадка II</div>
            <h2 class="pedestal-title">${player.pedestal}</h2>
          </div>
          <div class="pedestal-subtitle">${player.name} • хранитель пьедестала</div>
        </div>
        <div id="pedestalGame"></div>
        <div class="pedestal-status" id="pedestalStatus"></div>
      </section>
    `;
    return {
      player,
      game: document.getElementById("pedestalGame"),
      status: document.getElementById("pedestalStatus"),
    };
  }

  function activatePedestal(playerKey) {
    const player = players[playerKey];
    sendOnce(`pedestal:${playerKey}`, {
      event: "pedestal_activated",
      character: playerKey,
      pedestal: player.pedestal,
    });
  }

  function renderUnknownPedestal() {
    cleanupScene();
    setCopy(
      "Загадка II",
      "Шесть огней ищут хранителя.",
      "Внутри Telegram Mini App игрок определяется по Telegram user.id. Для локальной проверки используй ?puzzle=pedestal&player=asya."
    );
    setFeedback("Ожидается один из ключей: asya, vanya, mira, rita, dasha, maxim.");
    root.innerHTML = `<section class="panel-scene"><div class="tagline">Локальная отладка: <code>?puzzle=pedestal&player=asya</code></div></section>`;
    markOpened("pedestal_unknown");
  }

  function renderStrength(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Сила требует точного удара.",
      "Сначала возьми молот, затем бей в отмеченную точку на чаше. Если замедлиться, вес вернется обратно."
    );
    ui.game.innerHTML = `
      <div class="strength-shell">
        <div class="strength-stage" id="strengthStage">
          <img class="strength-bowl-image" src="${assets.strengthBowl}" alt="" aria-hidden="true" />
          <div class="strength-weight" id="strengthWeight"></div>
          <button class="strength-target" id="strengthTarget" type="button" aria-label="Точка удара"></button>
          <button class="hammer-pickup" id="hammerPickup" type="button" aria-label="Взять молот">
            <img class="hammer-image" src="${assets.hammer}" alt="" aria-hidden="true" />
          </button>
          <div class="hammer-cursor" id="hammerCursor" aria-hidden="true">
            <img class="hammer-image" src="${assets.hammer}" alt="" />
          </div>
        </div>
        <div class="strength-meter"><div class="strength-fill" id="strengthFill"></div></div>
        <div class="tagline" id="strengthHint">Возьми молот и перенеси удар на чашу.</div>
      </div>
    `;

    const fill = document.getElementById("strengthFill");
    const weight = document.getElementById("strengthWeight");
    const stage = document.getElementById("strengthStage");
    const target = document.getElementById("strengthTarget");
    const pickup = document.getElementById("hammerPickup");
    const hammerCursor = document.getElementById("hammerCursor");
    const hint = document.getElementById("strengthHint");
    let power = 0;
    let solved = false;
    let carrying = false;

    function redraw() {
      fill.style.width = `${Math.max(0, Math.min(100, power))}%`;
      weight.style.transform = `translate(-50%, ${Math.min(170, power * 1.42)}px)`;
      target.style.transform = `translate(-50%, ${Math.min(138, power * 1.14)}px)`;
    }

    function updateHammerPosition(event) {
      if (!carrying) {
        return;
      }
      const rect = stage.getBoundingClientRect();
      hammerCursor.style.left = `${event.clientX - rect.left}px`;
      hammerCursor.style.top = `${event.clientY - rect.top}px`;
    }

    const decay = window.setInterval(function () {
      if (solved) {
        return;
      }
      power = Math.max(0, power - 3.15);
      redraw();
    }, 90);

    pickup.addEventListener("click", function () {
      if (solved || carrying) {
        return;
      }
      carrying = true;
      stage.classList.add("hammer-ready");
      hammerCursor.classList.add("visible");
      hint.textContent = "Теперь бей по метке на чаше.";
      setFeedback("Молот послушно тянется за рукой.");
      audio.hum(0.45);
    });

    stage.addEventListener("pointermove", updateHammerPosition);

    target.addEventListener("click", function (event) {
      if (solved) {
        return;
      }
      if (!carrying) {
        setFeedback("Сначала возьми молот.", "error");
        audio.wrong();
        return;
      }
      updateHammerPosition(event);
      power = Math.min(100, power + 4.2);
      redraw();
      target.classList.remove("impact");
      void target.offsetWidth;
      target.classList.add("impact");
      audio.hum(0.82);
      if (power >= 100) {
        solved = true;
        carrying = false;
        stage.classList.remove("hammer-ready");
        hammerCursor.classList.remove("visible");
        ui.status.innerHTML = `<span class="solved-badge">Чаша силы опускается.</span>`;
        setFeedback("Удары сливаются в один тяжелый ритм, и пьедестал принимает силу.", "success");
        activatePedestal(playerKey);
      }
    });

    currentCleanup = function () {
      window.clearInterval(decay);
    };
    markOpened("pedestal_strength");
  }

  function renderWisdom(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Мудрость открывает узор памяти.",
      "Найди все восемь пар. Карточки одинаковые по форме, различаются только символы поверх них."
    );
    ui.game.innerHTML = `<div class="wisdom-shell"><div class="memory-grid" id="memoryGrid"></div></div>`;

    const symbols = ["sun", "moon", "bell", "eye", "flame", "circle", "star", "drop"];
    const deck = symbols.concat(symbols).sort(function () {
      return Math.random() - 0.5;
    });
    const grid = document.getElementById("memoryGrid");
    const openCards = [];
    let matched = 0;
    let locked = false;

    function svgIcon(name) {
      const icons = {
        sun: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6" stroke-linecap="round"><circle cx="50" cy="50" r="17"/><path d="M50 10v15M50 75v15M10 50h15M75 50h15M22 22l11 11M67 67l11 11M22 78l11-11M67 33l11-11"/></svg>',
        moon: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6"><path d="M61 15c-18 4-31 20-31 40 0 19 12 35 29 40-4 1-8 2-12 2-23 0-42-19-42-42s19-42 42-42c5 0 9 1 14 2Z" transform="translate(14 -4)"/></svg>',
        bell: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M28 68h44l-4-8V44c0-11-8-20-18-22v-6h-4v6c-10 2-18 11-18 22v16l-4 8Z"/><path d="M40 75c2 8 18 8 20 0"/></svg>',
        eye: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6" stroke-linecap="round"><path d="M10 50s15-22 40-22 40 22 40 22-15 22-40 22S10 50 10 50Z"/><circle cx="50" cy="50" r="10"/></svg>',
        flame: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6" stroke-linecap="round"><path d="M51 13c3 18-10 20-10 34 0 8 4 12 9 17-3-14 10-16 10-28 8 8 16 18 16 32 0 15-11 27-26 27S24 83 24 68c0-20 12-28 27-55Z"/></svg>',
        circle: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6"><circle cx="50" cy="50" r="28"/><circle cx="50" cy="50" r="40" stroke-opacity=".45"/></svg>',
        star: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6" stroke-linejoin="round"><path d="m50 16 10 21 23 4-17 16 4 24-20-12-20 12 4-24-17-16 23-4Z"/></svg>',
        drop: '<svg viewBox="0 0 100 100" fill="none" stroke="#f6d99b" stroke-width="6"><path d="M50 16c16 18 24 30 24 44 0 14-11 26-24 26S26 74 26 60c0-14 8-26 24-44Z"/></svg>',
      };
      return icons[name];
    }

    deck.forEach(function (symbol, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "memory-card";
      button.dataset.symbol = symbol;
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="memory-face memory-back"><img src="${assets.cardBack}" alt="" aria-hidden="true" /></span>
        <span class="memory-face memory-front">
          <img src="${assets.cardEmpty}" alt="" aria-hidden="true" />
          <span class="memory-icon">${svgIcon(symbol)}</span>
        </span>
      `;
      button.addEventListener("click", function () {
        if (locked || button.classList.contains("flipped") || button.classList.contains("matched")) {
          return;
        }
        button.classList.add("flipped");
        openCards.push(button);
        audio.hum(0.4);
        if (openCards.length < 2) {
          return;
        }
        locked = true;
        const first = openCards[0];
        const second = openCards[1];
        const success = first.dataset.symbol === second.dataset.symbol;
        if (success) {
          window.setTimeout(function () {
            first.classList.add("flipped", "matched");
            second.classList.add("flipped", "matched");
            openCards.length = 0;
            matched += 2;
            locked = false;
            if (matched === deck.length) {
              ui.status.innerHTML = `<span class="solved-badge">Все пары услышаны.</span>`;
              setFeedback("Карточки вспыхивают по краям поля, и мудрость пробуждается.", "success");
              audio.success();
              activatePedestal(playerKey);
            }
          }, 260);
        } else {
          window.setTimeout(function () {
            first.classList.remove("flipped");
            second.classList.remove("flipped");
            openCards.length = 0;
            locked = false;
          }, 700);
        }
      });
      grid.appendChild(button);
    });

    markOpened("pedestal_wisdom");
  }

  function renderTrust(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Доверие любит правильный порядок движения.",
      "Красные шары движутся только вправо, синие только влево. Ход возможен на одну пустую клетку или прыжком через один шар."
    );
    ui.game.innerHTML = `
      <div class="trust-shell">
        <div class="trust-board" id="trustBoard">
          <img class="trust-board-image" src="${assets.ritaBoard}" alt="" aria-hidden="true" />
          <div class="trust-slots" id="trustSlots"></div>
        </div>
        <div class="trust-target">Финал: [ B ][ B ][ B ][   ][ R ][ R ][ R ]</div>
        <button class="secondary-button" id="trustReset" type="button">Переиграть</button>
      </div>
    `;

    const board = document.getElementById("trustBoard");
    const slotsNode = document.getElementById("trustSlots");
    const resetButton = document.getElementById("trustReset");
    const slotLayout = [
      { key: "slot-0", left: 13.85, top: 52.99 },
      { key: "slot-1", left: 25.89, top: 52.99 },
      { key: "slot-2", left: 37.93, top: 52.99 },
      { key: "slot-3", left: 49.96, top: 52.99 },
      { key: "slot-4", left: 62.00, top: 52.99 },
      { key: "slot-5", left: 74.04, top: 52.99 },
      { key: "slot-6", left: 86.08, top: 52.99 },
    ];
    const initialSlots = ["red", "red", "red", null, "blue", "blue", "blue"];
    const state = {
      slots: initialSlots.slice(),
      solved: false,
    };

    function flashInvalid() {
      board.classList.remove("trust-error");
      void board.offsetWidth;
      board.classList.add("trust-error");
      setFeedback("Этот шар не может пройти таким путем.", "error");
      audio.wrong();
    }

    function targetIndex(index, color) {
      const step = color === "red" ? 1 : -1;
      const near = index + step;
      const jump = index + step * 2;
      if (near >= 0 && near < state.slots.length && !state.slots[near]) {
        return near;
      }
      if (
        jump >= 0 &&
        jump < state.slots.length &&
        state.slots[near] &&
        !state.slots[jump]
      ) {
        return jump;
      }
      return -1;
    }

    function isSolved() {
      return state.slots.join("|") === ["blue", "blue", "blue", "", "red", "red", "red"].join("|");
    }

    function resetPuzzle() {
      state.slots = initialSlots.slice();
      state.solved = false;
      board.classList.remove("solved", "trust-shift", "trust-error");
      ui.status.textContent = "";
      setFeedback("Шары возвращаются в исходную раскладку.");
      render();
    }

    function moveOrb(index) {
      const color = state.slots[index];
      if (!color || state.solved) {
        return;
      }
      const nextIndex = targetIndex(index, color);
      if (nextIndex === -1) {
        flashInvalid();
        return;
      }
      state.slots[nextIndex] = color;
      state.slots[index] = null;
      board.classList.remove("trust-shift");
      void board.offsetWidth;
      board.classList.add("trust-shift");
      audio.hum(0.58);
      render();
      if (isSolved()) {
        state.solved = true;
        board.classList.add("solved");
        ui.status.innerHTML = `<span class="solved-badge">Чаша доверия опускается.</span>`;
        setFeedback("Шары меняются сторонами, и чаша принимает доверие.", "success");
        activatePedestal(playerKey);
      }
    }

    function render() {
      slotsNode.innerHTML = "";
      slotLayout.forEach(function (slot, index) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "trust-slot";
        item.style.left = `${slot.left}%`;
        item.style.top = `${slot.top}%`;
        const color = state.slots[index];
        if (color) {
          item.innerHTML = `<span class="trust-orb ${color}"><img class="orb-image" src="${color === "red" ? assets.redOrb : assets.blueOrb}" alt="" aria-hidden="true" /></span>`;
        }
        item.addEventListener("click", function () {
          moveOrb(index);
        });
        slotsNode.appendChild(item);
      });
    }

    resetButton.addEventListener("click", function () {
      resetPuzzle();
    });

    render();
    markOpened("pedestal_trust");
  }

  function renderHonesty(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Правда должна выдержать взгляд камня.",
      "Выбери единственно верное утверждение. Ошибка пробуждает каменную проверку разума."
    );
    ui.game.innerHTML = `
      <div class="honesty-shell">
        <div class="honesty-visual">
          <img class="truth-bowl-image" src="${assets.truthBowl}" alt="" aria-hidden="true" />
          <div class="honesty-stones">
            <button class="honesty-stone" data-answer="1" type="button">
              <img class="truth-stone-image" src="${assets.truthStone}" alt="" aria-hidden="true" />
              <span class="honesty-statement">Первый и второй символы были огнем.</span>
            </button>
            <button class="honesty-stone" data-answer="2" type="button">
              <img class="truth-stone-image" src="${assets.truthStone}" alt="" aria-hidden="true" />
              <span class="honesty-statement">Первый и третий символы были звездой.</span>
            </button>
            <button class="honesty-stone" data-answer="3" type="button">
              <img class="truth-stone-image" src="${assets.truthStone}" alt="" aria-hidden="true" />
              <span class="honesty-statement">Первый и третий символы противоположны.</span>
            </button>
          </div>
        </div>
        <div class="honesty-challenge hidden" id="honestyChallenge">
          <div class="tagline" id="honestyProblem"></div>
          <div class="honesty-answer-row">
            <input class="riddle-input" id="honestyInput" inputmode="numeric" placeholder="Ответ" />
            <button class="primary-button" id="honestySubmit" type="button">Ответить</button>
          </div>
        </div>
      </div>
    `;

    const challenge = document.getElementById("honestyChallenge");
    const problemNode = document.getElementById("honestyProblem");
    const input = document.getElementById("honestyInput");
    const submit = document.getElementById("honestySubmit");
    const stones = Array.from(ui.game.querySelectorAll(".honesty-stone"));
    let gateOpen = true;
    let answer = 0;

    function openChallenge() {
      const left = 347 + Math.floor(Math.random() * 511);
      const right = 468 + Math.floor(Math.random() * 421);
      answer = left + right;
      gateOpen = false;
      challenge.classList.remove("hidden");
      problemNode.textContent = `Камень требует ответить: ${left} + ${right} = ?`;
      input.value = "";
      input.focus();
    }

    function resolveChallenge() {
      if (Number(input.value) !== answer) {
        setFeedback("Камень не принимает этот ответ.", "error");
        audio.wrong();
        return;
      }
      gateOpen = true;
      challenge.classList.add("hidden");
      setFeedback("Камень успокаивается и позволяет снова выбрать истину.");
      audio.hum(0.52);
    }

    submit.addEventListener("click", resolveChallenge);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        resolveChallenge();
      }
    });

    stones.forEach(function (stone) {
      stone.addEventListener("click", function () {
        if (!gateOpen) {
          setFeedback("Сначала ответь на каменную задачу.", "error");
          return;
        }
        if (stone.dataset.answer === "3") {
          ui.status.innerHTML = `<span class="solved-badge">Камень ложится в чашу.</span>`;
          setFeedback("Камень признает истину и успокаивается в чаше.", "success");
          audio.success();
          activatePedestal(playerKey);
          return;
        }
        stone.classList.remove("crack");
        void stone.offsetWidth;
        stone.classList.add("crack");
        ui.status.textContent = "Камень лжет.";
        setFeedback("Неверный ответ отдается трещиной по каменной кромке.", "error");
        audio.wrong();
        openChallenge();
      });
    });

    markOpened("pedestal_honesty");
  }

  function renderHope(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Огонек должен пережить тень.",
      "Продержись 20 секунд. У тебя одна жизнь и только три перезапуска после поражения."
    );
    ui.game.innerHTML = `
      <div class="hope-shell">
        <div class="hope-hud">
          <div class="tagline" id="hopeLives">Жизнь: 1</div>
          <div class="tagline" id="hopeTimer">Время: 20</div>
          <div class="tagline" id="hopeRestarts">Перезапуски: 3</div>
        </div>
        <div class="hope-bowl"><div class="hope-progress" id="hopeProgress"></div></div>
        <div class="hope-arena" id="hopeArena">
          <img class="hope-candle" src="${assets.candle}" alt="" aria-hidden="true" />
          <div class="hope-player" id="hopePlayer">
            <img src="${assets.hopeFlame}" alt="Огонек" />
          </div>
        </div>
        <button class="primary-button hidden" id="hopeRestart" type="button">Попробовать снова</button>
      </div>
    `;

    const arena = document.getElementById("hopeArena");
    const player = document.getElementById("hopePlayer");
    const livesNode = document.getElementById("hopeLives");
    const timerNode = document.getElementById("hopeTimer");
    const progressNode = document.getElementById("hopeProgress");
    const restartsNode = document.getElementById("hopeRestarts");
    const restartButton = document.getElementById("hopeRestart");
    const pressed = { left: false, right: false };
    const state = {
      x: 0,
      lives: 1,
      running: true,
      obstacles: [],
      frame: 0,
      lastSpawn: 0,
      startAt: 0,
      restartsLeft: 3,
    };
    let pointerActive = false;

    function updateHud() {
      livesNode.textContent = `Жизнь: ${state.lives}`;
      restartsNode.textContent = `Перезапуски: ${state.restartsLeft}`;
    }

    function updatePlayer() {
      const maxX = arena.clientWidth - player.offsetWidth - 10;
      state.x = Math.max(10, Math.min(maxX, state.x));
      player.style.left = `${state.x}px`;
    }

    function clearObstacles() {
      state.obstacles.forEach(function (item) {
        item.node.remove();
      });
      state.obstacles = [];
    }

    function stopRound() {
      state.running = false;
      if (state.frame) {
        window.cancelAnimationFrame(state.frame);
        state.frame = 0;
      }
    }

    function loseRound() {
      state.lives = 0;
      updateHud();
      stopRound();
      clearObstacles();
      audio.wrong();
      if (state.restartsLeft > 0) {
        ui.status.textContent = "Пламя погасло. У тебя осталось еще несколько попыток.";
        restartButton.classList.remove("hidden");
      } else {
        ui.status.textContent = "Пламя погасло окончательно.";
      }
      setFeedback("Тень накрыла огонек.", "error");
    }

    function spawnObstacle() {
      const image = document.createElement("img");
      image.className = "hope-obstacle";
      image.src = assets.shadowObstacle;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      arena.appendChild(image);
      const size = 58 + Math.random() * 34;
      state.obstacles.push({
        node: image,
        x: Math.random() * (arena.clientWidth - size),
        y: -size,
        size,
        speed: 3.4 + Math.random() * 2.2,
      });
      image.style.width = `${size}px`;
      image.style.height = `${size}px`;
    }

    function tick(now) {
      if (!state.running) {
        return;
      }
      if (pressed.left) {
        state.x -= 6;
      }
      if (pressed.right) {
        state.x += 6;
      }
      updatePlayer();

      const elapsed = (now - state.startAt) / 1000;
      const remaining = Math.max(0, 20 - elapsed);
      timerNode.textContent = `Время: ${Math.ceil(remaining)}`;
      progressNode.style.width = `${Math.min(100, (elapsed / 20) * 100)}%`;

      if (now - state.lastSpawn > 520) {
        spawnObstacle();
        state.lastSpawn = now;
      }

      const playerRect = {
        left: state.x,
        right: state.x + player.offsetWidth,
        top: arena.clientHeight - 118,
        bottom: arena.clientHeight - 36,
      };

      state.obstacles = state.obstacles.filter(function (item) {
        item.y += item.speed;
        item.node.style.transform = `translate(${item.x}px, ${item.y}px)`;
        const collided =
          item.x < playerRect.right &&
          item.x + item.size > playerRect.left &&
          item.y < playerRect.bottom &&
          item.y + item.size > playerRect.top;
        if (collided) {
          item.node.remove();
          loseRound();
          return false;
        }
        if (item.y > arena.clientHeight + item.size) {
          item.node.remove();
          return false;
        }
        return true;
      });

      if (remaining <= 0) {
        stopRound();
        clearObstacles();
        ui.status.innerHTML = `<span class="solved-badge">Огонек дожил до рассвета.</span>`;
        setFeedback("Воск наполняет чашу, а надежда удерживает свет.", "success");
        audio.success();
        activatePedestal(playerKey);
        return;
      }

      state.frame = window.requestAnimationFrame(tick);
    }

    function startRound() {
      stopRound();
      clearObstacles();
      state.lives = 1;
      state.running = true;
      state.lastSpawn = 0;
      state.startAt = performance.now();
      state.x = arena.clientWidth / 2 - 22;
      updatePlayer();
      updateHud();
      progressNode.style.width = "0%";
      timerNode.textContent = "Время: 20";
      restartButton.classList.add("hidden");
      ui.status.textContent = "";
      state.frame = window.requestAnimationFrame(tick);
    }

    function onKeyDown(event) {
      if (event.key === "ArrowLeft") {
        pressed.left = true;
      }
      if (event.key === "ArrowRight") {
        pressed.right = true;
      }
    }

    function onKeyUp(event) {
      if (event.key === "ArrowLeft") {
        pressed.left = false;
      }
      if (event.key === "ArrowRight") {
        pressed.right = false;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    arena.addEventListener("pointerdown", function () {
      pointerActive = true;
    });
    arena.addEventListener("pointermove", function (event) {
      if (!pointerActive || !state.running) {
        return;
      }
      const rect = arena.getBoundingClientRect();
      state.x = event.clientX - rect.left - player.offsetWidth / 2;
      updatePlayer();
    });
    const pointerUp = function () {
      pointerActive = false;
    };
    window.addEventListener("pointerup", pointerUp);

    restartButton.addEventListener("click", function () {
      if (state.restartsLeft <= 0) {
        return;
      }
      state.restartsLeft -= 1;
      updateHud();
      startRound();
    });

    updateHud();
    startRound();
    currentCleanup = function () {
      stopRound();
      clearObstacles();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", pointerUp);
    };
    markOpened("pedestal_hope");
  }

  function renderUnity(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Единство живет на пересечении путей.",
      "Нажми на руну, выбери цвет и веди линию по клеткам. Пути не должны пересекаться."
    );
    ui.game.innerHTML = `
      <div class="unity-shell">
        <div class="unity-board" id="unityBoard">
          <img class="unity-board-image" id="unityBoardImage" src="${assets.asyaBoard}" alt="" aria-hidden="true" />
          <div class="unity-grid" id="unityGrid" aria-label="Поле единства"></div>
          <svg class="unity-svg" id="unitySvg" viewBox="0 0 500 500" preserveAspectRatio="none"></svg>
        </div>
        <div class="tagline">Руны лежат в клетках. Соедини одинаковые цвета и не дай линиям пересечься.</div>
      </div>
    `;

    const board = document.getElementById("unityBoard");
    const boardImage = document.getElementById("unityBoardImage");
    const grid = document.getElementById("unityGrid");
    const svg = document.getElementById("unitySvg");
    const size = 5;
    const nodes = [
      { id: "red-a", color: "red", x: 0, y: 0 },
      { id: "red-b", color: "red", x: 2, y: 4 },
      { id: "yellow-a", color: "yellow", x: 2, y: 0 },
      { id: "yellow-b", color: "yellow", x: 1, y: 3 },
      { id: "green-a", color: "green", x: 3, y: 0 },
      { id: "green-b", color: "green", x: 2, y: 3 },
      { id: "cyan-a", color: "cyan", x: 3, y: 2 },
      { id: "cyan-b", color: "cyan", x: 4, y: 4 },
      { id: "orange-a", color: "orange", x: 4, y: 0 },
      { id: "orange-b", color: "orange", x: 4, y: 3 },
    ];
    const colors = {
      red: "#f06767",
      yellow: "#f6df55",
      green: "#7dd54a",
      cyan: "#5edff1",
      orange: "#ff983c",
    };
    const paths = {};
    const occupied = new Map();
    let activeColor = "";
    let activeStartId = "";
    let pointerDown = false;
    let solved = false;

    function cellKey(cell) {
      return `${cell.x}:${cell.y}`;
    }

    function sameCell(a, b) {
      return Boolean(a && b && a.x === b.x && a.y === b.y);
    }

    function endpointsForColor(color) {
      return nodes.filter(function (node) {
        return node.color === color;
      });
    }

    function otherEndpoint(color, id) {
      return endpointsForColor(color).find(function (node) {
        return node.id !== id;
      });
    }

    function clearColor(color) {
      delete paths[color];
      Array.from(occupied.entries()).forEach(function (entry) {
        if (entry[1] === color) {
          occupied.delete(entry[0]);
        }
      });
    }

    function pathIsComplete(color) {
      const path = paths[color];
      if (!path || path.length < 2) {
        return false;
      }
      const endpoints = endpointsForColor(color);
      return (
        (sameCell(path[0], endpoints[0]) && sameCell(path[path.length - 1], endpoints[1])) ||
        (sameCell(path[0], endpoints[1]) && sameCell(path[path.length - 1], endpoints[0]))
      );
    }

    function renderPaths() {
      const step = 100;
      svg.innerHTML = `
        <defs>
          <filter id="glow-red"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-yellow"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-green"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-cyan"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-orange"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
      `;

      Object.keys(paths).forEach(function (color) {
        const path = paths[color];
        if (!path || !path.length) {
          return;
        }
        const points = path.map(function (cell) {
          return `${cell.x * step + step / 2},${cell.y * step + step / 2}`;
        }).join(" ");
        svg.insertAdjacentHTML(
          "beforeend",
          `<polyline points="${points}" fill="none" stroke="${colors[color]}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-${color})" />`
        );
      });

      Array.from(grid.children).forEach(function (cell) {
        cell.className = "unity-cell";
        const color = occupied.get(`${cell.dataset.x}:${cell.dataset.y}`);
        if (color) {
          cell.classList.add("occupied", `occupied-${color}`);
        }
        if (activeColor && paths[activeColor]) {
          const active = paths[activeColor].some(function (entry) {
            return String(entry.x) === cell.dataset.x && String(entry.y) === cell.dataset.y;
          });
          if (active) {
            cell.classList.add("active-path");
          }
        }
      });

      board.querySelectorAll(".flow-node").forEach(function (rune) {
        const node = nodes.find(function (entry) {
          return entry.id === rune.dataset.node;
        });
        rune.classList.toggle("selected", node.color === activeColor);
        rune.querySelector("img").src = pathIsComplete(node.color) ? assets.asyaRuneActive : assets.asyaRune;
      });
    }

    function selectNode(node) {
      activeColor = node.color;
      activeStartId = node.id;
      clearColor(node.color);
      paths[node.color] = [{ x: node.x, y: node.y }];
      occupied.set(cellKey(node), node.color);
      setFeedback("Руна выбрана. Веди линию по клеткам.");
      audio.hum(0.6);
      renderPaths();
    }

    function finishIfSolved() {
      const completed = Object.keys(colors).filter(function (color) {
        return pathIsComplete(color);
      }).length;
      if (completed !== Object.keys(colors).length) {
        return;
      }
      solved = true;
      activeColor = "";
      activeStartId = "";
      boardImage.src = assets.asyaBoardSolved;
      ui.status.innerHTML = `<span class="solved-badge">Поле единства оживает.</span>`;
      setFeedback("Все руны соединяются. Пьедестал отвечает светом.", "success");
      audio.success();
      renderPaths();
      activatePedestal(playerKey);
    }

    function flashIntersection() {
      board.classList.remove("line-error");
      void board.offsetWidth;
      board.classList.add("line-error");
      setFeedback("Линия не может пересекаться с другой.", "error");
      audio.wrong();
    }

    function handleCellInput(x, y) {
      if (!activeColor || solved) {
        return;
      }
      const path = paths[activeColor];
      const last = path[path.length - 1];
      const next = { x, y };
      const dx = Math.abs(next.x - last.x);
      const dy = Math.abs(next.y - last.y);
      if (dx + dy !== 1) {
        return;
      }

      const previous = path.length > 1 ? path[path.length - 2] : null;
      if (previous && sameCell(previous, next)) {
        occupied.delete(cellKey(last));
        path.pop();
        renderPaths();
        return;
      }

      const owner = occupied.get(cellKey(next));
      if (owner && owner !== activeColor) {
        clearColor(activeColor);
        activeColor = "";
        activeStartId = "";
        flashIntersection();
        renderPaths();
        return;
      }

      const finish = otherEndpoint(activeColor, activeStartId);
      const start = nodes.find(function (node) {
        return node.id === activeStartId;
      });
      if (sameCell(next, start)) {
        return;
      }

      path.push(next);
      occupied.set(cellKey(next), activeColor);
      renderPaths();

      if (sameCell(next, finish)) {
        activeColor = "";
        activeStartId = "";
        audio.hum(1);
        renderPaths();
        finishIfSolved();
      }
    }

    function renderBoard() {
      grid.innerHTML = "";
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "unity-cell";
          cell.dataset.x = String(x);
          cell.dataset.y = String(y);
          cell.addEventListener("pointerdown", function (event) {
            pointerDown = true;
            handleCellInput(x, y);
            event.preventDefault();
          });
          cell.addEventListener("pointerenter", function () {
            if (pointerDown) {
              handleCellInput(x, y);
            }
          });
          grid.appendChild(cell);
        }
      }

      nodes.forEach(function (node) {
        const cell = grid.children[node.y * size + node.x];
        const rune = document.createElement("button");
        rune.type = "button";
        rune.className = `flow-node ${node.color}`;
        rune.dataset.node = node.id;
        rune.innerHTML = `<img src="${assets.asyaRune}" alt="" aria-hidden="true" /><span class="flow-core"></span>`;
        rune.addEventListener("click", function (event) {
          if (solved) {
            return;
          }
          selectNode(node);
          event.stopPropagation();
        });
        cell.appendChild(rune);
      });

      renderPaths();
    }

    const handlePointerUp = function () {
      pointerDown = false;
    };
    window.addEventListener("pointerup", handlePointerUp);
    grid.addEventListener("pointerleave", function () {
      pointerDown = false;
    });

    renderBoard();
    currentCleanup = function () {
      window.removeEventListener("pointerup", handlePointerUp);
    };
    markOpened("pedestal_unity");
  }

  function renderPedestalPuzzle() {
    cleanupScene();
    const playerKey = detectPlayerKey();
    if (!playerKey || !players[playerKey]) {
      renderUnknownPedestal();
      return;
    }
    const renderers = {
      maxim: renderStrength,
      dasha: renderWisdom,
      rita: renderTrust,
      vanya: renderHonesty,
      mira: renderHope,
      asya: renderUnity,
    };
    renderers[playerKey](playerKey);
  }

  preloadImages();
  createParticles();

  if (puzzle === "door") {
    renderDoorPuzzle();
  } else if (puzzle === "pedestal") {
    renderPedestalPuzzle();
  } else {
    renderIdleScene();
  }
})();
