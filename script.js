const API_URL =
  window.APP_CONFIG?.API_URL?.trim() || "https://api.balldontlie.io/v1/players";

const nbaForm = document.getElementById("nba-form");
const nameInput = document.getElementById("player-name");
const resultsElement = document.getElementById("results");
const errorElement = document.getElementById("error-message");
const statusElement = document.getElementById("status-message");
const clearButton = document.getElementById("clear-btn");
const quickPlayerButtons = document.querySelectorAll(".quick-player");

nbaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();

  const query = nameInput.value.trim();
  const apiKey = window.APP_CONFIG?.BALLDONTLIE_API_KEY?.trim();

  if (!query) {
    showError("Please enter a player name.");
    return;
  }

  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    showError("API key is not configured. Follow the setup steps in README.md.");
    return;
  }

  statusElement.textContent = "Searching...";

  try {
    const response = await fetch(`${API_URL}?search=${encodeURIComponent(query)}`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const players = Array.isArray(payload.data) ? payload.data : [];

    if (players.length === 0) {
      showError("No players found.");
      return;
    }

    renderPlayers(players);
    statusElement.textContent = `${players.length} player${players.length === 1 ? "" : "s"} found.`;
  } catch (error) {
    console.error("Player search failed", error);
    showError("Failed to fetch player data. Please try again.");
  }
});

clearButton.addEventListener("click", () => {
  nameInput.value = "";
  clearFeedback();
  statusElement.textContent = "Enter a name above to begin.";
  nameInput.focus();
});

quickPlayerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    nameInput.value = button.dataset.player;
    nbaForm.requestSubmit();
  });
});

function renderPlayers(players) {
  players.forEach((player) => {
    const team = player.team || {};
    const fullName = `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Not available";
    const initials = `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}` || "NBA";
    const card = document.createElement("article");
    card.className = "player-card";

    const monogram = document.createElement("div");
    monogram.className = "player-monogram";
    monogram.setAttribute("aria-hidden", "true");
    monogram.textContent = initials;

    const content = document.createElement("div");
    const header = document.createElement("div");
    header.className = "player-header";
    const name = document.createElement("h3");
    name.className = "player-name";
    name.textContent = fullName;
    const teamCode = document.createElement("span");
    teamCode.className = "team-code";
    teamCode.textContent = team.abbreviation || "NBA";
    header.append(name, teamCode);

    const teamName = document.createElement("p");
    teamName.className = "team-name";
    teamName.textContent = team.full_name || "Team not available";

    const metadata = document.createElement("dl");
    metadata.className = "player-meta";
    [
      ["Position", player.position || "—"],
      ["Jersey", player.jersey_number ? `#${player.jersey_number}` : "—"],
      ["Conference", team.conference || "—"],
      ["College", player.college || "Not available"],
    ].forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      description.title = value;
      wrapper.append(term, description);
      metadata.appendChild(wrapper);
    });

    content.append(header, teamName, metadata);
    card.append(monogram, content);
    resultsElement.appendChild(card);
  });
}

function showError(message) {
  resultsElement.replaceChildren();
  statusElement.textContent = "";
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function clearFeedback() {
  resultsElement.replaceChildren();
  statusElement.textContent = "";
  errorElement.textContent = "";
  errorElement.style.display = "none";
}
