import { API_BASE } from "./config";
import { normalizeKenteken, isValidKenteken } from "./lib/kenteken";
import { toPassportView, errorMessage, VehiclePassport } from "./lib/passport";
import "./style.css";

const form = document.getElementById("kenteken-form") as HTMLFormElement;
const input = document.getElementById("kenteken-input") as HTMLInputElement;
const result = document.getElementById("result") as HTMLElement;
const subscribeSection = document.getElementById("subscribe-section") as HTMLElement;
const subscribeForm = document.getElementById("subscribe-form") as HTMLFormElement;
const emailInput = document.getElementById("email-input") as HTMLInputElement;
const subscribeMsg = document.getElementById("subscribe-message") as HTMLElement;

let currentKenteken = "";

input.addEventListener("input", () => {
  input.value = input.value.toUpperCase();
});

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function showError(el: HTMLElement, message: string): void {
  clearChildren(el);
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = message;
  el.appendChild(p);
}

function renderPassport(passport: VehiclePassport): void {
  const view = toPassportView(passport);
  clearChildren(result);

  const card = document.createElement("div");
  card.className = "passport-card";

  const header = document.createElement("div");
  header.className = "passport-header";

  const plate = document.createElement("span");
  plate.className = "mini-plate";
  plate.textContent = passport.kenteken;
  header.appendChild(plate);

  const title = document.createElement("h2");
  title.textContent = view.title;
  header.appendChild(title);

  const badge = document.createElement("span");
  badge.className = `badge badge--${view.badge.kind}`;
  badge.textContent = view.badge.text;
  header.appendChild(badge);

  card.appendChild(header);

  if (view.daysLine) {
    const days = document.createElement("p");
    days.className = "days-line";
    days.textContent = `APK: ${view.daysLine}`;
    card.appendChild(days);
  }

  const dl = document.createElement("dl");
  dl.className = "passport-rows";
  for (const row of view.rows) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  card.appendChild(dl);
  result.appendChild(card);

  subscribeSection.hidden = false;
  clearChildren(subscribeMsg);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kenteken = normalizeKenteken(input.value);
  if (!isValidKenteken(kenteken)) {
    showError(result, "Ongeldig kenteken. Gebruik 6 letters en cijfers, bijvoorbeeld XX-99-XX.");
    subscribeSection.hidden = true;
    return;
  }

  clearChildren(result);
  const loading = document.createElement("p");
  loading.className = "loading";
  loading.textContent = "Even kijken…";
  result.appendChild(loading);

  try {
    const res = await fetch(`${API_BASE}/api/vehicle/${encodeURIComponent(kenteken)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      showError(result, errorMessage(res.status, body));
      subscribeSection.hidden = true;
      return;
    }
    const passport = (await res.json()) as VehiclePassport;
    currentKenteken = kenteken;
    renderPassport(passport);
  } catch {
    showError(result, "Kan de server niet bereiken. Probeer het later opnieuw.");
    subscribeSection.hidden = true;
  }
});

subscribeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  clearChildren(subscribeMsg);

  try {
    const res = await fetch(`${API_BASE}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kenteken: currentKenteken, email }),
    });
    const body = await res.json().catch(() => null);
    const p = document.createElement("p");
    if (res.ok) {
      p.className = "success";
      p.textContent = body?.message ?? "Gelukt!";
    } else {
      p.className = "error";
      p.textContent = errorMessage(res.status, body);
    }
    subscribeMsg.appendChild(p);
  } catch {
    showError(subscribeMsg, "Kan de server niet bereiken. Probeer het later opnieuw.");
  }
});
