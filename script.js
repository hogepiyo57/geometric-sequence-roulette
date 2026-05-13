const STARTING_BALANCE = 100000;
const SPIN_DURATION_MS = 5000;

const balanceEl = document.getElementById("balance");
const dealerMessageEl = document.getElementById("dealerMessage");
const dealerFrameEl = document.getElementById("dealerFrame");
const dealerImageEl = document.getElementById("dealerImage");
const resultLabelEl = document.getElementById("resultLabel");
const rouletteWheelEl = document.getElementById("rouletteWheel");
const betFormEl = document.getElementById("betForm");
const betAmountEl = document.getElementById("betAmount");
const spinButtonEl = document.getElementById("spinButton");
const resetButtonEl = document.getElementById("resetButton");
const choiceButtons = [...document.querySelectorAll(".choice")];

let balance = STARTING_BALANCE;
let selectedChoice = "";
let isSpinning = false;
let spinTurns = 0;
let dealerSpinTimer = 0;
let lastWheelRotation = 0;

const formatter = new Intl.NumberFormat("ja-JP");
const dealerStates = {
  idle: "assets/dealer-idle.png",
  red: "assets/dealer-red.png",
  black: "assets/dealer-black.png",
  warning: "assets/dealer-warning.png",
  spinA: "assets/dealer-spin-a.png",
  spinB: "assets/dealer-spin-b.png",
  win: "assets/dealer-win.png",
  lose: "assets/dealer-lose.png",
};

Object.values(dealerStates).forEach((src) => {
  const image = new Image();
  image.src = src;
});

function formatYen(value) {
  return `${formatter.format(value)}円`;
}

function updateBalance() {
  balanceEl.textContent = formatYen(balance);
}

function setDealerMessage(message) {
  dealerMessageEl.textContent = message;
}

function setDealerState(state, motionClass = "") {
  window.clearInterval(dealerSpinTimer);
  dealerSpinTimer = 0;
  dealerImageEl.src = dealerStates[state] || dealerStates.idle;
  dealerFrameEl.className = `dealer-frame${motionClass ? ` ${motionClass}` : ""}`;
}

function startDealerSpin() {
  let frame = false;
  setDealerState("spinA", "is-spinning");
  dealerSpinTimer = window.setInterval(() => {
    frame = !frame;
    dealerImageEl.src = frame ? dealerStates.spinB : dealerStates.spinA;
  }, 420);
}

function setControlsDisabled(disabled) {
  isSpinning = disabled;
  betAmountEl.disabled = disabled || balance <= 0;
  spinButtonEl.disabled = disabled || balance <= 0;
  choiceButtons.forEach((button) => {
    button.disabled = disabled || balance <= 0;
  });
}

function selectChoice(choice) {
  selectedChoice = choice;
  choiceButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.choice === choice));
  });
}

function validateBet() {
  const amount = Number(betAmountEl.value);

  if (!selectedChoice) {
    return "赤か黒をお選びください。勝負の色が決まっておりません。";
  }

  if (!Number.isFinite(amount) || betAmountEl.value.trim() === "") {
    return "ベット額をご入力ください。100円単位で承ります。";
  }

  if (!Number.isInteger(amount)) {
    return "端数のある金額はお受けできません。100円単位でお願いします。";
  }

  if (amount < 100) {
    return "100円未満のベットはできません。100円以上でお願いいたします。";
  }

  if (amount % 100 !== 0) {
    return "ベットは100円単位です。金額をお確かめください。";
  }

  if (amount > balance) {
    return "所持金を超えるベットはできません。テーブルの品格を保ちましょう。";
  }

  return "";
}

function finishGameIfNeeded() {
  if (balance <= 0) {
    balance = 0;
    updateBalance();
    setControlsDisabled(true);
    resetButtonEl.disabled = false;
    setDealerState("lose", "is-lose");
    setDealerMessage("所持金がなくなりました。再スタートで10万円からもう一度始められます。");
  }
}

function spinRoulette(result) {
  spinTurns += 1;
  const sectorSize = 45;
  const targetModulo = result === "red" ? 34 : 11;
  const wobble = Math.floor(Math.random() * 11) - 5;
  const target = targetModulo + wobble;
  const currentModulo = ((lastWheelRotation % sectorSize) + sectorSize) % sectorSize;
  const deltaToTarget = (target - currentModulo + sectorSize) % sectorSize;
  const finalRotation = lastWheelRotation + (6 + spinTurns) * 360 + deltaToTarget;

  rouletteWheelEl.classList.remove("spinning");
  rouletteWheelEl.style.setProperty("--spin-start", `${lastWheelRotation}deg`);
  rouletteWheelEl.style.transform = `rotate(${lastWheelRotation}deg)`;

  requestAnimationFrame(() => {
    rouletteWheelEl.style.setProperty("--spin-deg", `${finalRotation}deg`);
    rouletteWheelEl.classList.add("spinning");
  });

  lastWheelRotation = finalRotation;
}

function settleBet(amount, result) {
  const won = selectedChoice === result;
  const resultText = result === "red" ? "赤" : "黒";
  const choiceText = selectedChoice === "red" ? "赤" : "黒";

  rouletteWheelEl.style.transform = `rotate(${lastWheelRotation}deg)`;
  rouletteWheelEl.classList.remove("spinning");
  resultLabelEl.textContent = resultText;

  if (won) {
    balance += amount;
    setDealerState("win", "is-win");
    setDealerMessage(`${resultText}です。お見事、${formatYen(amount * 2)}の払い戻しです。`);
  } else {
    balance -= amount;
    setDealerState("lose", "is-lose");
    setDealerMessage(`${resultText}です。お客様の${choiceText}へのベットは没収となります。`);
  }

  updateBalance();
  finishGameIfNeeded();

  if (balance > 0) {
    setControlsDisabled(false);
  }
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectChoice(button.dataset.choice);
    setDealerState(button.dataset.choice, "is-choice");
    setDealerMessage(`${button.textContent.trim()}にベットですね。金額を入力してルーレットを回してください。`);
  });
});

betFormEl.addEventListener("submit", (event) => {
  event.preventDefault();

  if (isSpinning) {
    return;
  }

  const error = validateBet();
  if (error) {
    setDealerState("warning", "is-warning");
    setDealerMessage(error);
    return;
  }

  const amount = Number(betAmountEl.value);
  const result = Math.random() < 0.5 ? "red" : "black";
  const choiceText = selectedChoice === "red" ? "赤" : "黒";

  resultLabelEl.textContent = "SPIN";
  setControlsDisabled(true);
  setDealerMessage(`${formatYen(amount)}を${choiceText}に。ルーレットが止まるまで少々お待ちください。`);
  startDealerSpin();
  spinRoulette(result);

  window.setTimeout(() => {
    settleBet(amount, result);
  }, SPIN_DURATION_MS);
});

resetButtonEl.addEventListener("click", () => {
  balance = STARTING_BALANCE;
  selectedChoice = "";
  betAmountEl.value = "";
  resultLabelEl.textContent = "READY";
  rouletteWheelEl.classList.remove("spinning");
  rouletteWheelEl.style.setProperty("--spin-start", "0deg");
  rouletteWheelEl.style.setProperty("--spin-deg", "0deg");
  rouletteWheelEl.style.transform = "rotate(0deg)";
  lastWheelRotation = 0;
  choiceButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  updateBalance();
  setControlsDisabled(false);
  setDealerState("idle");
  setDealerMessage("10万円をご用意しました。赤か黒を選び、100円単位でベットしてください。");
});

updateBalance();
setDealerState("idle");
setControlsDisabled(false);
