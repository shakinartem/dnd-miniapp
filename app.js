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
      "Сила требует ритма.",
      "Бей быстро и ровно. Если медлить, вес снова пойдет вверх."
    );
    ui.game.innerHTML = `
      <div class="strength-shell">
        <div class="strength-stage">
          <img class="strength-bowl-image" src="${assets.strengthBowl}" alt="" aria-hidden="true" />
          <div class="strength-weight" id="strengthWeight"></div>
          <img class="hammer-image" src="${assets.hammer}" alt="" aria-hidden="true" />
        </div>
        <div class="strength-meter"><div class="strength-fill" id="strengthFill"></div></div>
        <button class="primary-button strength-button" id="tapHammer" type="button">Ударить</button>
      </div>
    `;

    const fill = document.getElementById("strengthFill");
    const weight = document.getElementById("strengthWeight");
    let power = 0;
    let solved = false;

    function redraw() {
      fill.style.width = `${Math.max(0, Math.min(100, power))}%`;
      weight.style.transform = `translate(-50%, ${Math.min(140, power * 0.9)}px)`;
    }

    const decay = window.setInterval(function () {
      if (solved) {
        return;
      }
      power = Math.max(0, power - 2.4);
      redraw();
    }, 110);

    document.getElementById("tapHammer").addEventListener("click", function () {
      if (solved) {
        return;
      }
      power = Math.min(100, power + 8);
      redraw();
      audio.hum(0.7);
      if (power >= 100) {
        solved = true;
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
            first.classList.add("matched");
            second.classList.add("matched");
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
      "Доверие любит правильное распределение.",
      "Переставь сферы, чтобы получить последовательность: красный, синий, красный, синий, красный, синий."
    );
    ui.game.innerHTML = `
      <div class="trust-shell">
        <img class="trust-board-image" src="${assets.ritaBoard}" alt="" aria-hidden="true" />
        <div class="trust-target">Цель: красный, синий, красный, синий, красный, синий.</div>
        <div class="trust-groove" id="trustGroove"></div>
      </div>
    `;

    const groove = document.getElementById("trustGroove");
    const target = ["red", "blue", "red", "blue", "red", "blue"];
    const state = ["blue", "red", "blue", "red", "red", "blue"];
    let selected = null;
    let solved = false;

    function render() {
      groove.innerHTML = "";
      state.forEach(function (color, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `orb-slot ${selected === index ? "selected" : ""}`.trim();
        button.innerHTML = `<img class="orb-image" src="${color === "red" ? assets.redOrb : assets.blueOrb}" alt="${color}" />`;
        button.addEventListener("click", function () {
          if (solved) {
            return;
          }
          if (selected === null) {
            selected = index;
          } else if (selected === index) {
            selected = null;
          } else {
            const temp = state[selected];
            state[selected] = state[index];
            state[index] = temp;
            selected = null;
            audio.hum(0.6);
            if (state.join("|") === target.join("|")) {
              solved = true;
              ui.status.innerHTML = `<span class="solved-badge">Чаша доверия опускается.</span>`;
              setFeedback("Сферы находят свои борозды, и плита мягко откликается.", "success");
              activatePedestal(playerKey);
            }
          }
          render();
        });
        groove.appendChild(button);
      });
    }

    render();
    markOpened("pedestal_trust");
  }

  function renderHonesty(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Правда должна выдержать взгляд камня.",
      "Выбери единственное верное утверждение."
    );
    ui.game.innerHTML = `
      <div class="honesty-shell">
        <div class="honesty-visual">
          <img class="truth-bowl-image" src="${assets.truthBowl}" alt="" aria-hidden="true" />
          <img class="truth-stone-image" src="${assets.truthStone}" alt="" aria-hidden="true" />
        </div>
        <div class="honesty-choices">
          <button class="choice-button" data-answer="1" type="button">1. Первый и второй символы были огнем.</button>
          <button class="choice-button" data-answer="2" type="button">2. Первый и третий символы были звездой.</button>
          <button class="choice-button" data-answer="3" type="button">3. Первый и третий символы противоположны.</button>
        </div>
      </div>
    `;

    ui.game.querySelectorAll(".choice-button").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.dataset.answer === "3") {
          ui.status.innerHTML = `<span class="solved-badge">Камень ложится в чашу.</span>`;
          setFeedback("Камень признает истину и успокаивается в чаше.", "success");
          audio.success();
          activatePedestal(playerKey);
          return;
        }
        button.classList.remove("crack");
        void button.offsetWidth;
        button.classList.add("crack");
        ui.status.textContent = "Камень лжет.";
        setFeedback("Неверный ответ отдается трещиной по каменной кромке.", "error");
        audio.wrong();
      });
    });

    markOpened("pedestal_honesty");
  }

  function renderHope(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Огонек должен пережить тень.",
      "Продержись 20 секунд. Управляй огоньком влево и вправо. Допустимы 3 жизни."
    );
    ui.game.innerHTML = `
      <div class="hope-shell">
        <div class="hope-hud">
          <div class="tagline" id="hopeLives">Жизни: 3</div>
          <div class="tagline" id="hopeTimer">Время: 20</div>
        </div>
        <div class="hope-bowl"><div class="hope-progress" id="hopeProgress"></div></div>
        <div class="hope-arena" id="hopeArena">
          <img class="hope-candle" src="${assets.candle}" alt="" aria-hidden="true" />
          <div class="hope-player" id="hopePlayer">
            <img src="${assets.hopeFlame}" alt="Огонек" />
          </div>
        </div>
      </div>
    `;

    const arena = document.getElementById("hopeArena");
    const player = document.getElementById("hopePlayer");
    const livesNode = document.getElementById("hopeLives");
    const timerNode = document.getElementById("hopeTimer");
    const progressNode = document.getElementById("hopeProgress");
    const state = {
      x: 0,
      lives: 3,
      running: true,
      obstacles: [],
    };
    const pressed = { left: false, right: false };

    function updatePlayer() {
      const maxX = arena.clientWidth - player.offsetWidth - 10;
      state.x = Math.max(10, Math.min(maxX, state.x));
      player.style.left = `${state.x}px`;
    }

    state.x = arena.clientWidth / 2 - 22;
    updatePlayer();

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

    let pointerActive = false;
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
    window.addEventListener("pointerup", function () {
      pointerActive = false;
    });

    function spawnObstacle() {
      const image = document.createElement("img");
      image.className = "hope-obstacle";
      image.src = assets.shadowObstacle;
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      arena.appendChild(image);
      const size = 28 + Math.random() * 20;
      state.obstacles.push({
        node: image,
        x: Math.random() * (arena.clientWidth - size),
        y: -size,
        size,
        speed: 2.5 + Math.random() * 2.8,
      });
      image.style.width = `${size}px`;
      image.style.height = `${size}px`;
    }

    function hit() {
      state.lives -= 1;
      livesNode.textContent = `Жизни: ${state.lives}`;
      setFeedback("Тень задела огонек.", "error");
      audio.wrong();
      if (state.lives <= 0) {
        state.running = false;
        ui.status.textContent = "Пламя погасло. Попробуй еще раз.";
      }
    }

    let lastSpawn = 0;
    let frame = null;
    const start = performance.now();

    function tick(now) {
      if (!state.running) {
        return;
      }

      if (pressed.left) {
        state.x -= 5;
      }
      if (pressed.right) {
        state.x += 5;
      }
      updatePlayer();

      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, 20 - elapsed);
      timerNode.textContent = `Время: ${Math.ceil(remaining)}`;
      progressNode.style.width = `${Math.min(100, (elapsed / 20) * 100)}%`;

      if (now - lastSpawn > 480) {
        spawnObstacle();
        lastSpawn = now;
      }

      const playerRect = {
        left: state.x,
        right: state.x + player.offsetWidth,
        top: arena.clientHeight - 110,
        bottom: arena.clientHeight - 44,
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
          hit();
          return false;
        }
        if (item.y > arena.clientHeight + item.size) {
          item.node.remove();
          return false;
        }
        return true;
      });

      if (remaining <= 0) {
        state.running = false;
        ui.status.innerHTML = `<span class="solved-badge">Огонек дожил до рассвета.</span>`;
        setFeedback("Воск наполняет чашу, а надежда удерживает свет.", "success");
        audio.success();
        activatePedestal(playerKey);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    currentCleanup = function () {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
    markOpened("pedestal_hope");
  }

  function renderUnity(playerKey) {
    const ui = pedestalWrapper(playerKey);
    setCopy(
      "Загадка II",
      "Соедини пары, не пересекая линии.",
      "Соедини одинаковые цвета: красный, синий, зеленый и золотой."
    );
    ui.game.innerHTML = `
      <div class="unity-shell">
        <div class="unity-board" id="unityBoard">
          <img class="unity-board-image" id="unityBoardImage" src="${assets.asyaBoard}" alt="" aria-hidden="true" />
          <svg class="unity-svg" id="unitySvg" viewBox="0 0 320 320"></svg>
        </div>
        <div class="tagline">Если линии пересекутся, связь сбросится.</div>
      </div>
    `;

    const board = document.getElementById("unityBoard");
    const boardImage = document.getElementById("unityBoardImage");
    const svg = document.getElementById("unitySvg");
    const nodes = [
      { id: "red-a", color: "red", x: 48, y: 48 },
      { id: "red-b", color: "red", x: 272, y: 272 },
      { id: "blue-a", color: "blue", x: 272, y: 48 },
      { id: "blue-b", color: "blue", x: 48, y: 272 },
      { id: "green-a", color: "green", x: 48, y: 160 },
      { id: "green-b", color: "green", x: 272, y: 160 },
      { id: "gold-a", color: "gold", x: 160, y: 48 },
      { id: "gold-b", color: "gold", x: 160, y: 272 },
    ];
    const colors = {
      red: "#f06767",
      blue: "#71a5ff",
      green: "#7eb792",
      gold: "#f6d99b",
    };
    const connections = {};
    let selectedColor = "";
    let solved = false;

    function ccw(a, b, c) {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }

    function intersects(a, b, c, d) {
      return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
    }

    function nodeById(id) {
      return nodes.find(function (node) {
        return node.id === id;
      });
    }

    function draw() {
      svg.innerHTML = "";
      Object.keys(connections).forEach(function (color) {
        const pair = connections[color];
        const from = nodeById(pair[0]);
        const to = nodeById(pair[1]);
        svg.insertAdjacentHTML(
          "beforeend",
          `<path d="M${from.x} ${from.y} C ${from.x} 160, ${to.x} 160, ${to.x} ${to.y}" stroke="${colors[color]}" stroke-width="10" fill="none" stroke-linecap="round" filter="url(#glow-${color})"/>`
        );
      });
      svg.insertAdjacentHTML(
        "afterbegin",
        `<defs>
          <filter id="glow-red"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-blue"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-green"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-gold"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>`
      );
    }

    function placeNodes() {
      nodes.forEach(function (node) {
        let button = board.querySelector(`[data-node="${node.id}"]`);
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = `flow-node ${node.color}`;
          button.dataset.node = node.id;
          button.innerHTML = `<img src="${assets.asyaRune}" alt="" aria-hidden="true" /><span class="flow-core"></span>`;
          button.addEventListener("click", function () {
            if (solved) {
              return;
            }
            if (!selectedColor) {
              selectedColor = node.color;
              setFeedback(`Выбрана ${node.color} связь.`);
              return;
            }
            if (selectedColor !== node.color) {
              selectedColor = node.color;
              setFeedback("Соединять можно только одинаковые цвета.", "error");
              audio.wrong();
              return;
            }
            const endpoints = nodes.filter(function (item) {
              return item.color === node.color;
            });
            const from = endpoints[0];
            const to = endpoints[1];
            const crossing = Object.keys(connections).some(function (color) {
              if (color === node.color) {
                return false;
              }
              const pair = connections[color];
              return intersects(from, to, nodeById(pair[0]), nodeById(pair[1]));
            });
            if (crossing) {
              delete connections[node.color];
              selectedColor = "";
              board.classList.remove("line-error");
              void board.offsetWidth;
              board.classList.add("line-error");
              setFeedback("Линии пересеклись и вспыхнули красным.", "error");
              audio.wrong();
              draw();
              return;
            }
            connections[node.color] = [from.id, to.id];
            selectedColor = "";
            audio.hum(0.8);
            draw();
            if (Object.keys(connections).length === 4) {
              solved = true;
              boardImage.src = assets.asyaBoardSolved;
              board.querySelectorAll(".flow-node img").forEach(function (image) {
                image.src = assets.asyaRuneActive;
              });
              ui.status.innerHTML = `<span class="solved-badge">Поле вспыхивает единством.</span>`;
              setFeedback("Все пути соединены без пересечений, и магия поля замыкается.", "success");
              audio.success();
              activatePedestal(playerKey);
            }
          });
          board.appendChild(button);
        }
        button.style.left = `${(node.x / 320) * board.clientWidth}px`;
        button.style.top = `${(node.y / 320) * board.clientWidth}px`;
      });
      draw();
    }

    placeNodes();
    window.addEventListener("resize", placeNodes);
    currentCleanup = function () {
      window.removeEventListener("resize", placeNodes);
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
