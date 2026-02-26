<template>
  <div class="min-h-screen px-6 py-10 md:flex md:items-center md:justify-center">
    <div class="glass-panel mx-auto w-full max-w-6xl rounded-3xl p-8 md:grid md:grid-cols-[1.3fr_1fr] md:gap-10 md:p-12">
      <section class="space-y-6">
        <img
          src="https://afctransport.com/wp-content/themes/AFC/img/logo.png"
          alt="AFC Transport"
          class="brand-logo h-11 w-auto"
        />
        <p class="brand-tag inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
          AFC Freight Console
        </p>
        <h1 class="text-4xl font-extrabold leading-tight md:text-5xl">
          Driving Excellence in Freight Operations
        </h1>
        <p class="max-w-xl text-base text-zinc-700 dark:text-zinc-300">
          Internal command center for Account Managers, Dispatchers, and Managers. Live boards, status pipeline, and Greenbush workflow in one place.
        </p>
        <ul class="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Available -> Pending -> Covered -> Loaded -> Delivered lifecycle.</li>
          <li>5-second realtime refresh with secure role-based access.</li>
          <li>AFC-restricted Google Workspace authentication.</li>
        </ul>
      </section>

      <section class="glass-panel mt-8 rounded-2xl border border-zinc-300/70 p-6 dark:border-zinc-700/70 md:mt-0">
        <h2 class="text-lg font-semibold">Portal Login</h2>
        <p class="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Authentication is managed by the AFC portal. Continue to the hub login page.
        </p>
        <button
          type="button"
          class="brand-button mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-300"
          @click="startPortalAuth"
        >
          Continue to Portal Login
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { startPortalAuth } from '@/api/auth';
</script>
