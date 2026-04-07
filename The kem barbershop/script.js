// ─── Config ───────────────────────────────────────────────
// Paste your Make.com webhook URL here once you have it
const WEBHOOK_URL = 'https://hook.us2.make.com/25mg9y9p5i593ux9jqlp0ljrat67ureo';

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const form        = document.getElementById('register-form');
  const submitBtn   = document.getElementById('submit-btn');
  const btnText     = document.getElementById('btn-text');
  const btnLoader   = document.getElementById('btn-loader');
  const successPanel = document.getElementById('success-panel');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic client-side validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    const data = {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
      email:     form.email.value.trim(),
      phone:     form.phone.value.trim(),
      frequency: form.frequency.value,
      source:    'landing-10pct',
      timestamp: new Date().toISOString(),
    };

    try {
      // Make.com recibirá los datos y enviará el código por WhatsApp + activará los recordatorios
      if (WEBHOOK_URL && WEBHOOK_URL !== 'YOUR_MAKE_WEBHOOK_URL') {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        // Dev mode: simulate network delay
        console.log('[Dev] Form data:', data);
        await new Promise(r => setTimeout(r, 1200));
      }

      showSuccess();
    } catch (err) {
      console.error('Webhook error:', err);
      // Still show success to user — data can be retried on the backend
      showSuccess();
    }
  });

  function showSuccess() {
    form.style.display = 'none';
    document.querySelector('.form-header').style.display = 'none';
    successPanel.style.display = 'block';

    // Scroll form card into view
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
