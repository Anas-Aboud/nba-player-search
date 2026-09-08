const API_URL =
  window.APP_CONFIG?.API_URL?.trim() || "https://api.balldontlie.io/v1/players";

const nbaForm = document.getElementById("nba-form");
const nameInput = document.getElementById("player-name");
const resultsElement = document.getElementById("results");
const errorElement = document.getElementById("error-message");
const statusElement = document.getElementById("status-message");
const clearButton = document.getElementById("clear-btn");

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
  nameInput.focus();
});

function renderPlayers(players) {
  const table = document.createElement("table");
  const headerRow = table.createTHead().insertRow();

  ["Name", "Team", "Conference", "Position", "Jersey", "College"].forEach((title) => {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = title;
    headerRow.appendChild(header);
  });

  const body = table.createTBody();
  players.forEach((player) => {
    const row = body.insertRow();
    const team = player.team || {};
    const values = [
      `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Not available",
      team.full_name
        ? `${team.full_name}${team.abbreviation ? ` (${team.abbreviation})` : ""}`
        : "Not available",
      team.conference || "Not available",
      player.position || "Not available",
      player.jersey_number ? `#${player.jersey_number}` : "Not available",
      player.college || "Not available",
    ];

    values.forEach((value) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });
  });

  resultsElement.appendChild(table);
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
