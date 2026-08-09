<script lang="ts">
  import ChamferBox from '../lib/ChamferBox.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import PageFooter from '../lib/PageFooter.svelte';

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
  <PageHeader tag="MODEL TT&#8209;01 &middot; FIELD EDITION" paddingX="0" />

  <main>
    <section class="hero">
      <p class="eyebrow mono">TEMPORAL FIELD INSTRUMENT</p>
      <h1>Record what happened to you.<br /><span class="accent">Not when.</span></h1>
      <p class="lede">
        A field instrument for travellers whose lives don't run in order.
        Log every moment as you lived it — loop included.
      </p>
    </section>

    <ChamferBox tag="section" class="landing-orientation">
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
    </ChamferBox>

    <section class="capabilities">
      {#each capabilities as cap (cap.index)}
        <ChamferBox tag="article" size="sm" class="landing-capability">
          <p class="capability-index mono">{cap.index}</p>
          <h2>{cap.title}</h2>
          <p>{cap.body}</p>
        </ChamferBox>
      {/each}
    </section>

    <ChamferBox tag="section" bordered={false} class="landing-cta-bar">
      <p class="advisory">
        Standard causality is a courtesy, not a guarantee. Trace carefully.
      </p>
      <div class="cta-block">
        <ChamferBox tag="a" size="sm" bordered={false} class="landing-cta" href="#/editor">Open your Tracer</ChamferBox>
      </div>
    </ChamferBox>
  </main>

  <PageFooter text="TT/OPS &middot; REV. 0.2 &middot; UNCLASSIFIED &mdash; PERSONAL COPY" />
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

  /* :global() here because the class is passed through to ChamferBox's
     own rendered element, not applied to an element literally present in
     this component's template — Svelte's scoping hash wouldn't match it
     otherwise. That also means these class names land in the page's
     genuinely global namespace (not Svelte-scoped to this file), so
     they're prefixed with "landing-" to avoid colliding with an
     unrelated global class of the same short name elsewhere — unlike a
     plain scoped selector, a clash here wouldn't be caught by anything
     at build time. */
  :global(.landing-orientation) {
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

  :global(.landing-orientation) em {
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

  :global(.landing-capability) {
    padding: 1.5rem;
  }

  .capability-index {
    font-size: 0.85rem;
    color: var(--color-accent);
    margin: 0 0 0.75rem;
  }

  :global(.landing-capability) h2 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
  }

  :global(.landing-capability) p:not(.capability-index) {
    opacity: 0.8;
    font-size: 0.95rem;
  }

  :global(.landing-cta-bar) {
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

  :global(.landing-cta) {
    display: inline-block;
    background: var(--color-accent);
    color: var(--color-ink);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  :global(.landing-cta):hover,
  :global(.landing-cta):focus-visible {
    opacity: 0.85;
  }

  @media (max-width: 30rem) {
    :global(.landing-cta-bar) {
      flex-direction: column;
      align-items: flex-start;
    }

    .cta-block {
      align-items: flex-start;
      width: 100%;
    }

    :global(.landing-cta) {
      width: 100%;
      text-align: center;
    }
  }
</style>
