/* ==================================================================== */
/* Import Utilities
======================================================================= */
import { charadex } from '../utilities.js';

/* ==================================================================== */
/* Toyhou Login Check
======================================================================= */
async function checkToyhouLogin() {
  const url = new URL(window.location.href);
  if (url.searchParams.get('toyhou_callback') === 'success') {
    try {
      // Request the user profile from your backend
      const resp = await fetch('https://your-backend.example.com/me', {
        credentials: 'include'
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log('Toyhou user', data.user);

        // Optional: Update UI dynamically
        const loginBtn = document.querySelector('.btn.btn-primary');
        if (loginBtn && data.user?.name) {
          loginBtn.textContent = `Welcome, ${data.user.name}`;
          loginBtn.classList.remove('btn-primary');
          loginBtn.classList.add('btn-success');
          loginBtn.href = '#'; // or a profile/settings page
        }

      } else {
        console.log('Not logged in');
      }
    } catch (err) {
      console.error('Toyhou login check failed:', err);
    }
  }
}

/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  checkToyhouLogin(); // ✅ runs on every page load

  charadex.tools.loadIncludedFiles();
  charadex.tools.updateMeta();
  charadex.tools.loadPage('#charadex-body', 100);
});
