(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const params = new URLSearchParams(window.location.search);
  const characterFromUrl = params.get("character");
  const puzzleId = params.get("puzzle_id") || "puzzle_2_pedestals";

  const characterSelect = document.getElementById("characterSelect");
  const activateButton = document.getElementById("activateButton");
  const statusText = document.getElementById("statusText");
  const sigil = document.querySelector(".sigil");

  if (tg) {
    tg.ready();
    tg.expand();
  }

  if (characterFromUrl) {
    const option = Array.from(characterSelect.options).find(
      (item) => item.value.toLowerCase() === characterFromUrl.toLowerCase(),
    );
    if (option) {
      characterSelect.value = option.value;
    }
  }

  activateButton.addEventListener("click", function () {
    const character = characterSelect.value;
    const payload = {
      puzzle_id: puzzleId,
      character,
      result: "activated",
    };

    sigil.classList.add("active");
    activateButton.disabled = true;
    statusText.textContent = "Пьедестал пробуждается...";

    window.setTimeout(function () {
      statusText.textContent = "Свет принят. Результат отправлен мастеру.";
      if (tg) {
        tg.sendData(JSON.stringify(payload));
      } else {
        console.log("Telegram.WebApp is not available", payload);
      }
    }, 900);
  });
})();
