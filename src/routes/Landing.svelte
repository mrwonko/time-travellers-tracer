<script lang="ts">
  const capabilities = [
    {
      index: '01',
      title: 'Personal sequence',
      body: 'Every moment, logged in the order you lived it — forward, inverted, or both. There is no global clock to disagree with you.',
    },
    {
      index: '02',
      title: 'Shared events',
      body: "Two travellers, one event: logged as a crossing. See every version of yourself, and everyone you've met along the way.",
    },
    {
      index: '03',
      title: 'Branch aware',
      body: "Know which timeline you're standing in, and where it split from the one you started in.",
    },
  ];
</script>

<div class="page">
  <header class="bar">
    <div class="wordmark">
      <span class="mark chamfer-sm" aria-hidden="true"></span>
      <span class="wordmark-text">TIME TRAVELLER'S TRACER</span>
    </div>
    <span class="tag mono">MODEL TT&#8209;01 &middot; FIELD EDITION</span>
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow mono">TEMPORAL FIELD INSTRUMENT</p>
      <h1>Record what happened to you.<br /><span class="accent">Not when.</span></h1>
      <p class="lede">
        A field instrument for travellers whose lives don't run in order.
        Log every moment as you lived it — loop included.
      </p>
    </section>

    <section class="orientation chamfer-bordered">
      <p class="orientation-label mono">ORIENTATION &mdash; READ BEFORE FIRST USE</p>
      <p>
        Standard chronometers assume a single, shared timeline. Yours does
        not apply here.
      </p>
      <p>
        The Tracer keeps no clock, and it keeps nothing for you
        automatically. It's a logbook &mdash; you write your
        <em>sequence</em> into it: the order in which you personally
        experienced each event, however many times you've already lived
        it, and regardless of which direction you were moving through it.
      </p>
      <p>
        When your entries and another traveller's line up on the same
        event, the Tracer marks it as a crossing. That is the only kind of
        encounter it understands &mdash; and the only one that matters.
      </p>
    </section>

    <section class="capabilities">
      {#each capabilities as cap (cap.index)}
        <article class="capability chamfer-sm-bordered">
          <p class="capability-index mono">{cap.index}</p>
          <h2>{cap.title}</h2>
          <p>{cap.body}</p>
        </article>
      {/each}
    </section>

    <section class="cta-bar chamfer">
      <p class="advisory">
        Standard causality is a courtesy, not a guarantee. Trace carefully.
      </p>
      <div class="cta-block">
        <button class="cta chamfer-sm" type="button" disabled>
          Open your Tracer
        </button>
        <p class="cta-note mono">AWAITING FIELD DEPLOYMENT</p>
      </div>
    </section>
  </main>

  <footer class="meta mono">TT/OPS &middot; REV. 0.1 &middot; UNCLASSIFIED &mdash; PERSONAL COPY</footer>
</div>

<style>
  .page {
    max-width: 64rem;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 0;
    border-bottom: var(--border-width) solid var(--color-border);
    flex-wrap: wrap;
  }

  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mark {
    width: 1.1rem;
    height: 1.1rem;
    background: var(--color-accent);
    flex: none;
  }

  .wordmark-text {
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 0.95rem;
  }

  .tag {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--color-fg);
    opacity: 0.6;
  }

  .hero {
    padding: 4rem 0 2.5rem;
  }

  .eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    color: var(--color-accent-ink);
    margin: 0 0 1rem;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3.4rem);
    line-height: 1.08;
    letter-spacing: -0.01em;
    margin: 0 0 1.25rem;
  }

  .accent {
    color: var(--color-accent);
  }

  .lede {
    max-width: 34rem;
    font-size: 1.15rem;
    opacity: 0.85;
  }

  .orientation {
    padding: 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-bottom: 2.5rem;
  }

  .orientation-label {
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    color: var(--color-accent-secondary-ink);
    margin: 0 0 0.25rem;
  }

  .orientation em {
    font-style: normal;
    color: var(--color-accent-ink);
    font-weight: 600;
  }

  .capabilities {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem;
    margin-bottom: 2.5rem;
  }

  .capability {
    padding: 1.5rem;
  }

  .capability-index {
    font-size: 0.85rem;
    color: var(--color-accent);
    margin: 0 0 0.75rem;
  }

  .capability h2 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
  }

  .capability p:not(.capability-index) {
    opacity: 0.8;
    font-size: 0.95rem;
  }

  .cta-bar {
    background: var(--color-ink);
    color: var(--color-paper);
    padding: 1.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .advisory {
    max-width: 26rem;
    opacity: 0.85;
  }

  .cta-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .cta {
    background: var(--color-accent);
    color: var(--color-ink);
    border: none;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0.75rem 1.5rem;
    cursor: not-allowed;
    opacity: 0.55;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .cta-note {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    opacity: 0.6;
  }

  .meta {
    margin-top: auto;
    padding-top: 2.5rem;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    opacity: 0.45;
    text-align: center;
  }

  @media (max-width: 30rem) {
    .cta-bar {
      flex-direction: column;
      align-items: flex-start;
    }

    .cta-block {
      align-items: flex-start;
      width: 100%;
    }

    .cta {
      width: 100%;
      text-align: center;
    }
  }
</style>
