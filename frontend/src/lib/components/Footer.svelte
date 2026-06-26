<footer>
  <div class="page-shell footer-grid">
    <div>
      <a class="footer-brand" href="/">LuxeEats</a>
      <p>Handcrafted delivery for the discerning palate.</p>
    </div>
    <div>
      <span class="label">Explore</span>
      <a href="/catalog">Catalog</a>
      <a href="/orders">Orders</a>
    </div>
    <div>
      <span class="label">Account</span>
      <a href="/login">Login</a>
      <a href="/register">Register</a>
    </div>
    <div>
      <span class="label">Kitchen</span>
      <p>Seasonal plates, thoughtful service, and delivery made for everyday rituals.</p>
    </div>
  </div>
</footer>

<style>
  footer {
    margin-top: 96px;
    border-top: 1px solid rgba(124, 87, 48, 0.16);
    background: rgba(239, 238, 235, 0.65);
    padding: 56px 0;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1.4fr;
    gap: 32px;
  }

  .footer-brand {
    color: var(--secondary);
    font-family: var(--font-logo);
    font-size: 2rem;
    font-weight: 700;
  }

  p,
  a {
    display: block;
    color: var(--muted);
    line-height: 1.7;
    margin: 0.35rem 0;
  }

  a:hover {
    color: var(--secondary);
  }

  @media (max-width: 760px) {
    .footer-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
