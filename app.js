const outputTemplate = document.getElementById("output-card-template");
const clockTemplate = document.getElementById("clock-card-template");

const inventoryInput = document.getElementById("inventory-input");
const inventoryResults = document.getElementById("inventory-results");
const formatInput = document.getElementById("format-input");
const formatResults = document.getElementById("format-results");
const suffixInput = document.getElementById("suffix-input");
const suffixResults = document.getElementById("suffix-results");
const clockGrid = document.getElementById("clock-grid");
const timezoneTable = document.getElementById("timezone-table");

const outputConfigs = [
  { key: "comma", title: "英文逗號分隔", icon: "🔗", joiner: "," },
  { key: "space", title: "空格分隔", icon: "⎵", joiner: " " },
  { key: "newline", title: "換行分隔", icon: "↵", joiner: "\n" },
  { key: "semicolon", title: "分號分隔", icon: ";", joiner: ";" },
];

const clockConfigs = [
  { title: "北京時間", city: "北京", zone: "Asia/Shanghai", tone: "beijing" },
  { title: "美西時間", city: "洛杉磯（Los Angeles）", zone: "America/Los_Angeles", tone: "la" },
  { title: "美東時間", city: "紐約（New York）", zone: "America/New_York", tone: "ny" },
];

const parseInput = (input) =>
  input
    .split(/[,\s\n\t;，；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const createOutputs = (items) =>
  outputConfigs.reduce((result, config) => {
    result[config.key] = items.join(config.joiner);
    return result;
  }, {});

const fallbackCopyText = (text) => {
  const handleCopy = (event) => {
    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
  };

  document.addEventListener("copy", handleCopy, { once: true });

  try {
    if (document.execCommand("copy")) {
      return true;
    }
  } finally {
    document.removeEventListener("copy", handleCopy);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
};

const copyText = async (text, button) => {
  if (!text) {
    return;
  }

  try {
    if (fallbackCopyText(text)) {
      // Copied synchronously inside the click gesture.
    } else if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error("fallback copy failed");
    }

    const original = button.textContent;
    button.textContent = "已複製";
    button.classList.add("is-copied");
    setTimeout(() => {
      button.textContent = original;
      button.classList.remove("is-copied");
    }, 2000);
  } catch {
    button.textContent = "失敗";
    setTimeout(() => {
      button.textContent = "複製";
    }, 1500);
  }
};

const buildCard = (title, icon, output, copyValue = output) => {
  const fragment = outputTemplate.content.cloneNode(true);
  const iconNode = fragment.querySelector(".output-icon");
  const titleNode = fragment.querySelector("h3");
  const outputNode = fragment.querySelector("pre");
  const button = fragment.querySelector(".copy-btn");

  iconNode.textContent = icon;
  titleNode.textContent = title;
  outputNode.textContent = output || "—";
  button.disabled = !output;
  button.addEventListener("click", () => copyText(copyValue, button));

  return fragment;
};

const renderOutputGrid = (container, outputs) => {
  container.replaceChildren();
  outputConfigs.forEach((config) => {
    container.appendChild(buildCard(config.title, config.icon, outputs[config.key]));
  });
};

const renderInventory = () => {
  const records = inventoryInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const skuMatch = line.match(/[（(](\d+)[）)]/);
      const quantityMatch = line.match(/可用基本[數数]量短缺[:：]\s*(\d+(?:\.\d+)?)/);
      return skuMatch && quantityMatch ? [{ sku: skuMatch[1], quantity: quantityMatch[1] }] : [];
    });

  const displayValue = records.map((record) => `${record.sku} ${record.quantity}`).join("\n");
  const excelValue = records.map((record) => `${record.sku}\t${record.quantity}`).join("\n");

  inventoryResults.replaceChildren(
    buildCard("提取結果（SKU + 數量）", "📋", displayValue, excelValue),
  );
};

const renderFormat = () => {
  renderOutputGrid(formatResults, createOutputs(parseInput(formatInput.value)));
};

const renderSuffix = () => {
  renderOutputGrid(
    suffixResults,
    createOutputs(parseInput(suffixInput.value).map((item) => `${item}T`)),
  );
};

const getTimeInfo = (zone) => {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );

  return {
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
  };
};

const renderClocks = () => {
  clockGrid.replaceChildren();
  clockConfigs.forEach((config) => {
    const fragment = clockTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".clock-card");
    const title = fragment.querySelector("h3");
    const city = fragment.querySelector("p");
    const time = fragment.querySelector(".clock-time");
    const date = fragment.querySelector(".clock-date");
    const weekday = fragment.querySelector(".clock-weekday");
    const info = getTimeInfo(config.zone);

    card.dataset.tone = config.tone;
    title.textContent = config.title;
    city.textContent = config.city;
    time.textContent = info.time;
    date.textContent = info.date;
    weekday.textContent = info.weekday;

    clockGrid.appendChild(fragment);
  });
};

const baseDate = new Date("2026-03-01T00:00:00+08:00");
const tableZones = ["UTC", "Etc/GMT+8", "America/Los_Angeles", "America/New_York"];

const formatTableTime = (date, zone) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");

const renderTimezoneTable = () => {
  timezoneTable.replaceChildren();
  for (let hour = 0; hour < 24; hour += 1) {
    const row = document.createElement("tr");
    const date = new Date(baseDate.getTime() + hour * 60 * 60 * 1000);
    const beijingCell = document.createElement("td");

    beijingCell.textContent = formatTableTime(date, "Asia/Shanghai");
    row.appendChild(beijingCell);

    tableZones.forEach((zone) => {
      const cell = document.createElement("td");
      cell.textContent = formatTableTime(date, zone);
      row.appendChild(cell);
    });

    timezoneTable.appendChild(row);
  }
};

inventoryInput.addEventListener("input", renderInventory);
formatInput.addEventListener("input", renderFormat);
suffixInput.addEventListener("input", renderSuffix);

renderInventory();
renderFormat();
renderSuffix();
renderClocks();
renderTimezoneTable();
setInterval(renderClocks, 1000);
