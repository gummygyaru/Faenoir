import { charadex } from '../utilities.js';

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx5f4V1TjMagGoZkb_6cHHuXrEWWE8xgBkv1Q19JS8Am7mjgwfgbE1HZaM89YipmzrteA/exec';
const LOGIN_KEY = 'faenoir_user';

document.addEventListener("DOMContentLoaded", () => {
  const session = JSON.parse(localStorage.getItem(LOGIN_KEY));
  if (!session) {
    alert("You must be logged in to view your inventory.");
    window.location.href = "index.html";
    return;
  }

  const username = session.username;
  loadInventory(username);
});

async function loadInventory(username) {
  try {
    const response = await fetch(`${SHEET_URL}?username=${encodeURIComponent(username)}`);
    const data = await response.json();

    if (!data.length) {
      document.querySelector('#inventory-group').innerHTML = `<p>No inventory data found for ${username}.</p>`;
      return;
    }

    renderInventory(data);
  } catch (err) {
    console.error('Error loading inventory:', err);
    document.querySelector('#inventory-group').innerHTML = `<p>Error loading inventory data.</p>`;
  }
}

function renderInventory(items) {
  const container = document.querySelector('#inventory-group');
  container.innerHTML = '';

  const group = document.createElement('div');
  group.classList.add('inventory-list-container', 'mt-4');

  const title = document.createElement('h4');
  title.textContent = 'Your Inventory';
  group.appendChild(title);

  const row = document.createElement('div');
  row.classList.add('row', 'no-gutters', 'm-n2', 'inventory-list');
  group.appendChild(row);

  items.forEach(item => {
    const col = document.createElement('div');
    col.classList.add('col-lg-3', 'col-sm-6', 'p-2');
    col.innerHTML = `
      <div class="card bg-faded h-100">
        <div class="card-header bg-faded text-center">
          <h6 class="mb-0 text-primary">${item.Item}</h6>
        </div>
        <div class="card-body d-flex flex-fill">
          <img class="img-fluid m-auto" src="${item.ImageURL || 'assets/default-item.png'}">
        </div>
        <div class="card-footer bg-faded text-right py-1">
          <small>x${item.Quantity || 1}</small>
        </div>
      </div>
    `;
    row.appendChild(col);
  });

  container.appendChild(group);
}
